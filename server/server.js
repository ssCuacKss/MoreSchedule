const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { isLeftHandSideExpression } = require('typescript');
const { interval, last } = require('rxjs');
const {format, isSaturday, isSunday} = require('date-fns')

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME   = 'MoreScheduleDBdata';
const PORT      = 3000;
const MINUTES_INTERVAL = 5;

async function main() {

    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Conectado a MongoDB: ${MONGO_URL} → ${DB_NAME}`);

    const app = express();
    app.use(cors());
    app.use(express.json());

    await ensureDatabase(db)
    let lastExecutionDate = new Date(await getExecDate().then(d =>{return d.lastRun}));
    let currentDate = new Date()
    let timeGap = currentDate.getTime() - lastExecutionDate.getTime();

    if(timeGap > ((3 * MINUTES_INTERVAL * 60000))){
        let intervals = Math.floor(timeGap / (3 * MINUTES_INTERVAL * 60000));
        for(let i = 1; i <= intervals ; i++){
            let nextDateToExecute = new Date(lastExecutionDate.getTime() + 3 * i * MINUTES_INTERVAL * 60000);
            await checkChangeOnCalendarProyectDuration(nextDateToExecute);
        }
    }else{
        await checkChangeOnCalendarProyectDuration();
    }


    setInterval( async() =>{
        try{
            await checkChangeOnCalendarProyectDuration()
        }catch (error){
            console.error('UNEXPECTED ERROR ON ADJUSTMENT EXECUTION', error);
        }
    },MINUTES_INTERVAL * 60000)
    
    
    
    


    async function getExecDate(){
        try {
            const lastDate = await db
            .collection('execDate')
            .findOne({})
            return lastDate;
        } catch (err) {
            console.error('Error leyendo links:', err);
            return { error: 'Error interno al leer enlaces' };
        }
    }

    async function updateExecDate(now) {
        try {
            

            const result = await db.collection('execDate').findOneAndUpdate(
            {}, // no se filtra porque solo hay un registro
            { $set: { lastRun: now } },
            { returnDocument: 'after' });

            return result.value; // devuelve la fecha actualizada


        } catch (err) {
            console.error('Error actualizando execDate:', err);
            return { error: 'Error interno al actualizar execDate' };
        }
    }


    function parsePid(req, res, next) {
        const pid = parseInt(req.query.pid, 10);
        if (isNaN(pid)) return res.status(400).json({ error: 'pid inválido' });
        req.pid = pid;
        next();
    }

    async function checkChangeOnCalendarProyectDuration(currentDate = new Date()){

        //Se obtine la fecha actual y la configuración del horario.
        //const currentDate = new Date();
        //const currentDate = new Date();

        let horario = await db.collection('calendarConfig').find().toArray();

        /*Se obtienen todos los proyectos y se filtran de dos formas diferentes
            1. se obtienen los proyectos futuros del sistema (aquellos que aun no han empezado y su fecha de inicio es mayor que la fecha actual)
            2. se obtienee los proyectos activos del sistema (aquellos cuya fecha de inicio es inferior a la actual, pero cuya fecha de fin aun no ha llegado)
        */

        const proyectos = await db.collection('proyects').find().toArray();
        const proyectosFuturos = proyectos.filter( proyect => {
            const startTime = new Date(proyect.start).getTime();
            const endTime = startTime + proyect.end * 3600000;
            return currentDate <= endTime;
        })
        const proyectosActivos = proyectos.filter(proyect =>{
            const startTime = new Date(proyect.start).getTime();
            const endTime = startTime + proyect.end * 3600000;
            //currentDate.getTime() <= (new Date(proyect.start).getTime() + ( proyect.end * 3600000))

            return startTime <= currentDate && currentDate <= (endTime + (2*MINUTES_INTERVAL*60000));
        });
        
        // se ordenan ambos tipos de filtración de fecha de inicio mas próxima a fecha de inicio mas en el futuro (menor a mayor)

        proyectosFuturos.sort((a, b) => new Date(a.start) - new Date(b.start));
        proyectosActivos.sort((a, b) => new Date(a.start) - new Date(b.start));

        //se obtienen los usuarios de la aplicación.

        let usuarios = await db.collection('users').find().toArray();
        
        // en este bloque for se coge cada proyecto activo y se analiza si ha habido retraso
        // tambien tenemos una flag que nos indicará si han habido actualizaciones de proyectos

        let proceed = false;

        for(let i = 0; i < proyectosActivos.length; i++){
            let proyecto = proyectosActivos[i];
            let updates = await padProyectsSlack(proyecto, horario, usuarios, currentDate).then(upd => {return upd});
            
            //si en el proyecto actual hay actualización y updates es falso, cambiamos u valor
            if(updates && !proceed){
                proceed = true;
            }
            //console.log(tareasProyecto);
            //console.log(linksProyecto);
        }

        // si tras el proceso anterior no hay actualizaciones en ningun proyecto activo, no hay nada que hacer.

        if(!proceed){
            console.log("No hay actualizaciones en proyectos activos, nada que hacer");
            await updateExecDate(currentDate);
            return;
        }

        // en este bloque se recorren todos los proyectos futuros.


        for(let i = 0; i < proyectosFuturos.length; i++){
            const proyecto = proyectosFuturos[i];

            // se obtienen las tareas del proyecto futuro que estamos iterando

            const tareasProyecto = await db.collection('tasks').find({pid: proyecto.id}).toArray();
            

            // se obtienen los usuarios que participan en el proyecto (un usuario tienen tareas asignadas dentro de ese proyecto) y cual es la ultima tarea que tienen asignada dentro de ese proyecto.

            const usuariosAsignados = getUsuariosConUltimaTareaEnProyecto(proyecto.id, usuarios);
            
            // reccorremos un bucle en el que iteramos sobre todos los usuarios asignados al proyecto

            for(const { usuario, indexUltimaTarea } of usuariosAsignados){

                //se guardan en una pila todas las tareas del usuario sila ultima tarea de un usuario en el proyecto 
                // tiene el indice 0 dentro de su pila, no hay proyectos por delante de este proyecto (la ultima tarea de este proyecto no tiene encima ninguna nueva tarea, por tanto no hay otro proyecto)
                const pila = usuario.tareas;
                if(indexUltimaTarea === 0){
                    continue;
                }

                //comprobamos si en verdad la ultima tarea del proyecto existe. si no existe se procede automaticamente con la siguiente iteración del bucle

                const ultimaMeta = pila[indexUltimaTarea];
                const ultimaTarea = tareasProyecto.find(t => t.id === ultimaMeta.tid);
                if (!ultimaTarea){ 
                    continue;
                }


                //miramos cual es la tarea que tiene la ultima tarea justo encima, como hemos visto, si hay tareas por encima de la ultima tarea del proyecto en el que estamos, 
                // significa que el usuario fue asignado despues de acabar esta tarea a otra tarea de otro proyecto.

                const siguienteTarea = pila[indexUltimaTarea - 1];

                // se obtiene el proyecto al que pertenece dicha siguiente tarea, si el proyecto no tiene tareas, pasamos a la siguiente ejecución del bucle.

                const siguienteProyecto = proyectosFuturos.find(p => p.id === siguienteTarea.pid);
                const tareasSiguienteProyecto = await db.collection('tasks').find({pid: siguienteProyecto.id}).toArray();
                const linksSiguienteProyecto = await db.collection('links').find({pid: siguienteProyecto.id}).toArray();
                if (!tareasSiguienteProyecto.length) {
                    continue;
                }
                

                //Obtenemos la primera tarea de dicho siguiente proyecto ( las tareas están ordenadas en base de datos de menor a mayor fecha de inicio)
                // si la tarea con la que hemos obtenido este proyecto no es la primera tarea del proyecto, simplemente pasamos a la siguiente ejecución del bucle.
                const tareaInicio = tareasSiguienteProyecto[0];

                if (siguienteTarea.tid !== tareaInicio.id) {
                    continue; 
                }

                //llegados a este punto comprobamos si la fecha de finalización de la ultima tarea del proyecto en el que nos encontramos
                //  es mayor que la fecha de inicio de la primera tarea del siguiente proyecto, efectivamente hay un solapamiento entre proyectos, por lo que se procede a ajustar las fechas del siguiente proyecto proyecto.

                const finUltima = new Date(ultimaTarea.start_date).getTime() + ultimaTarea.duration * 60000;
                const inicioSiguiente = new Date(tareaInicio.start_date).getTime();

                if (inicioSiguiente < finUltima) {
                    //se obtiene el tiempo que hay que desplazar el siguiente proyecto.
                    const desplazamiento = finUltima - inicioSiguiente;
                    // se actualizan las tareas del siguiente proyecto con su nueva duración y plazos horarios
                    ajustarTiempoDeFin(horario, tareasSiguienteProyecto, linksSiguienteProyecto, desplazamiento);
                    // se actualizan los datos de las tareas y el proyecto asignados a dichas tareas en la base de datos.
                    actualizarTareasEnBD(tareasSiguienteProyecto);
                    actualizarDuracionYInicioDeProyecto(tareasSiguienteProyecto);
                    // se actualizan los usuarios con la información de las tareas del siguiente proyecto actualizadas.
                    actualizarUsuariosConFinDeTareas(tareasSiguienteProyecto, usuarios)
                    
                }

            }


        }
        //cuando ha acabado todo directamente guardamos los datos actualizados de los usuarios en la base de datos
        guardarUsuariosActualizados(usuarios);
        await updateExecDate(currentDate);
        console.log("Finalizado ajuste de tareas por slack");
    }   

    async function guardarUsuariosActualizados(usuarios) {
        // se actualiza usuario a usuario sus tareas en el servidor.
        await Promise.all(
            usuarios.map(user => {
            return db.collection('users').updateOne(
                { uname: user.uname },
                { $set: { tareas: user.tareas } }
            );
            })
        );
        }

    async function actualizarUsuariosConFinDeTareas(tareas, usuarios) {
        for (const tarea of tareas) {
            const pid = tarea.pid;
            const tid = tarea.id;
            if (!tarea.start_date || isNaN(tarea.duration)){ 
                continue;
            }

            // se toma una tarea que ha visto sus datos y plazos modificados y calculamos su fecha de finalización.

            const fechaInicio = new Date(tarea.start_date).getTime();
            const fechaFin = new Date(fechaInicio + tarea.duration * 60000);
            const fechaFinFormateada = format(fechaFin, "yyyy-MM-dd HH:mm");

            // se recorren todos los usuarios

            for (const usuario of usuarios) {
                const pila = usuario.tareas ?? [];
                //se comprueba si la tarea que hemos obtenido está en la pila de ese usuario. si está, se actualiza la fecha en la esta acaba con el nuevo valor.
                const index = pila.findIndex(meta => meta.pid === pid && meta.tid === tid);
                if (index !== -1) {
                    usuario.tareas[index].acaba = fechaFinFormateada;
                }
            }
        }
    }

    async function actualizarDuracionYInicioDeProyecto(tareas) {
    if (!Array.isArray(tareas) || tareas.length === 0) return;

    let minInicio = Infinity;
    let maxFin = -Infinity;
    let proyectoId = tareas[0].pid;

    tareas.forEach(tarea => {
        const inicio = new Date(tarea.start_date).getTime();
        const fin = inicio + tarea.duration * 60000;

        if (inicio < minInicio) minInicio = inicio;
        if (fin > maxFin) maxFin = fin;
    });

    const duracionHoras = Math.round(((maxFin - minInicio) / 3600000) * 100) / 100;
    const fechaInicio = new Date(minInicio);
    const fechaInicioFormateada = format(fechaInicio, "MM-dd-yyyy HH:mm");

    await db.collection('proyects').updateOne(
        { id: proyectoId },
        {
        $set: {
            start: fechaInicioFormateada,
            end: duracionHoras
        }
        }
    );
    }

    function getUsuariosConUltimaTareaEnProyecto(pid, usuarios) {
        const usuariosConTarea = [];
        /*
        Tener en cuenta el formato de la pila de tareas de un usuario, si la pila es en un momento [X,Y,Z], con X la ultima tarea que tiene asignada 
        (es decir, la tarea que ejecutará mas en el futuro, tenindo por ahora indice 0)
        si le asignamos una nueva tarea I al usuario, la pila tendrá la forma [I,X,Y,Z] (ahora I tiene indice 0, y X tiene indice 1);
        */
        usuarios.forEach(user => {
            const tareas = user.tareas ?? [];
            //console.log(`Estas son las tarreas del usuario ${user.uname}:\n${JSON.stringify(tareas, null, 2)}\n`);
            // Buscamos desde el indice 0 hacia abajo la última tarea del proyecto con pid: pid (es decir, buscamos desde 0, luego en 1, luego en 2...)
            for (let i = 0; i < tareas.length ; i++) {
                if (tareas[i].pid === pid) {
                    usuariosConTarea.push({
                        usuario: user,
                        indexUltimaTarea: i
                    });
                    //console.log(`estamos en el user ${user.uname} su ultima tarea para el proyecto ${pid} es ${user.tareas[i].tarea}\n`);
                    break;
                }
            }
        });

        return usuariosConTarea;
    }

    function ajustarTiempoDeFin(horario, tareasProyecto, linksProyecto, offsetInicio){

    const horaEntrada = horario[0].entrada;
    const horaSalida  = horario[0].salida;
    const [hora1, minuto1] = horaEntrada.split(':').map(Number);
    const [hora2, minuto2] = horaSalida.split(':').map(Number);
    const duracionJornada  = (hora2 - hora1) * 60 + (minuto2 - minuto1);
    
    tareasProyecto.forEach(task => {

        const original_slack = task.slack;
        const W_original = task.duration - task.offtime - task.slack_used; // W antes de tocar nada

        // --- Inicio calculado por predecesoras (igual que tienes) ---
        let IncomingLinks = linksProyecto.filter((link) => link.target === task.id);
        let startDates = [];
        if (IncomingLinks.length !== 0) {
            IncomingLinks.forEach((linkPredecesor) => {
                let taskToAdd = tareasProyecto.find((PredecesorTask) => PredecesorTask.id === linkPredecesor.source);
                if (taskToAdd !== undefined) {
                    const endTime = new Date(taskToAdd.start_date).getTime() + taskToAdd.duration * 60000;
                    startDates.push(new Date(endTime));
                }
            });
        }

        let taskAdjustedStartDate = task.start_date;
        if (startDates.length !== 0) {
            let maxMs = -Infinity;
            for (const s of startDates) {
                const candidate = s.getTime();
                if (candidate > maxMs) maxMs = candidate;
            }
            taskAdjustedStartDate = format(new Date(maxMs), "yyyy-MM-dd HH:mm");
        }

        // --- Ajuste de inicio a jornada ---
        let fechaInicioTarea = new Date(new Date(taskAdjustedStartDate).getTime() + offsetInicio);
        const horaInicioTarea = fechaInicioTarea.getHours();
        const minutoInicioTarea = fechaInicioTarea.getMinutes();

        if (horaInicioTarea < hora1 || ((horaInicioTarea === hora1) && (minutoInicioTarea < minuto1))) {
            fechaInicioTarea.setHours(hora1, minuto1);
        } else if (horaInicioTarea > hora2 || ((horaInicioTarea === hora2) && (minutoInicioTarea >= minuto2))) {
            fechaInicioTarea.setHours(hora1, minuto1);
            fechaInicioTarea = new Date(fechaInicioTarea.getTime() + 86400000);
        }
        while (isSaturday(fechaInicioTarea) || isSunday(fechaInicioTarea)) {
            fechaInicioTarea = new Date(fechaInicioTarea.getTime() + 86400000);
        }

        // --- Fin solo con W_original (tu lógica tal cual) ---
        let fechaFinDirecto = new Date(fechaInicioTarea.getTime() + W_original * 60000);
        let fullJournals    = Math.floor(W_original / duracionJornada);
        let tiempoFinDeSemana = contarFinesDeSemana(fechaInicioTarea, fechaFinDirecto);

        let tiempoFueraDeJornada = tiempoFinDeSemana + fullJournals;
        let fechaFinConFinesDeSemana = new Date(fechaInicioTarea.getTime() + W_original * 60000 + (tiempoFueraDeJornada * 86400000));
        const horaFin    = fechaFinConFinesDeSemana.getHours();
        const minutosFin = fechaFinConFinesDeSemana.getMinutes();

        let horasExtra = 0;
        let minutosExtra = 0;

        if (horaFin > hora2 || (horaFin === hora2 && (minutosFin > minuto2))) {
            fechaFinConFinesDeSemana.setHours(hora1, minuto1);
            fechaFinConFinesDeSemana = new Date(fechaFinConFinesDeSemana.getTime() + 86400000);
            ++tiempoFueraDeJornada;
            horasExtra   = horaFin - hora2;
            minutosExtra = minutosFin - minuto2;
        }

        let timeToAdd = (horasExtra * 60 + minutosExtra) * 60000;
        tiempoFueraDeJornada += ((horasExtra + minutosExtra / 60) / 24);
        fechaFinConFinesDeSemana = new Date(fechaFinConFinesDeSemana.getTime() + timeToAdd);

        while (isSaturday(fechaFinConFinesDeSemana) || isSunday(fechaFinConFinesDeSemana)) {
            fechaFinConFinesDeSemana = new Date(fechaFinConFinesDeSemana.getTime() + 86400000);
            ++tiempoFueraDeJornada;
        }

        // offtime con W_original
        const duracionTotalSoloW = Math.round((fechaFinConFinesDeSemana.getTime() - fechaInicioTarea.getTime()) / 60000);
        const offtimeNuevo = duracionTotalSoloW - W_original;

        // Guardamos provisional (antes del slack)
        task.start_date = format(fechaInicioTarea, "yyyy-MM-dd HH:mm");
        task.offtime    = offtimeNuevo;
        task.duration   = W_original + offtimeNuevo + task.slack_used;

        // ================================
        // SEGUNDA NORMALIZACIÓN (clave)
        // Ajustar si al sumar slack_used el fin cae fuera de jornada o en fin de semana
        // ================================
        const finConSlackProvisional = new Date(
            fechaInicioTarea.getTime() + (W_original + offtimeNuevo + task.slack_used) * 60000
        );

        let finNormalizado = new Date(finConSlackProvisional);

        // Repetimos el mismo bloque de salto de jornada, con posibilidad de varias iteraciones
        while (true) {
            const h = finNormalizado.getHours();
            const m = finNormalizado.getMinutes();

            // Si se pasa del fin de jornada, saltamos al día siguiente a la hora de entrada y añadimos el "resto"
            if (h > hora2 || (h === hora2 && m > minuto2)) {
                const restoMin = (h - hora2) * 60 + (m - minuto2); // minutos que "sobran" ese día
                finNormalizado.setHours(hora1, minuto1);
                finNormalizado = new Date(finNormalizado.getTime() + 86400000 + restoMin * 60000);
                continue; // re-chequear por si aún cae fuera
            }

            // Si cae en fin de semana, saltamos al siguiente día laborable a primera hora
            if (isSaturday(finNormalizado) || isSunday(finNormalizado)) {
                do {
                    finNormalizado = new Date(finNormalizado.getTime() + 86400000);
                } while (isSaturday(finNormalizado) || isSunday(finNormalizado));
                finNormalizado.setHours(hora1, minuto1);
                continue; // re-chequear por si vuelve a pasarse del horario ese mismo día
            }

            break; // ya está normalizado
        }

        // Minutos extra añadidos por normalizar con slack (fuera de jornada / fin de semana)
        const extraPorNormalizar = Math.round(
            (finNormalizado.getTime() - finConSlackProvisional.getTime()) / 60000
        );

        // Actualizamos offtime y duración definitivos
        task.offtime  = offtimeNuevo + extraPorNormalizar;
        task.duration = W_original + task.slack_used + task.offtime;

        // Blindaje: no tocar slack
        task.slack = original_slack;
    });
}


    async function padProyectsSlack(proyect, horario, usuarios, date) {
        const currentMs = date.getTime(); 

        const tareasProyecto = await db.collection('tasks').find({ pid: proyect.id }).toArray();
        const linksProyecto  = await db.collection('links').find({ pid: proyect.id }).toArray();

        let proceedFlag = false;

        for (const tarea of tareasProyecto) {
            if (tarea.progress >= 1) continue; // ya finalizada

            const startMs   = new Date(tarea.start_date).getTime();
            const offtime   = Number(tarea.offtime)    || 0;
            const oldSlack  = Number(tarea.slack_used) || 0;

            // === Igual que W_original en ajustarTiempoDeFin ===
            const workTime = tarea.duration - offtime - oldSlack; 

            // Fin planificado original (sin slack usado)
            const plannedEndMs = startMs + (workTime + offtime) * 60000;

            if (currentMs > plannedEndMs) {
                const delayNow = Math.floor((currentMs - plannedEndMs) / 60000);

                if (delayNow > oldSlack) {
                    tarea.slack_used = delayNow;
                    tarea.duration   = workTime + offtime + delayNow; // coherente con ajustarTiempoDeFin
                    proceedFlag = true;
                }
            }
    }

    // recalcula inicios y fines con la nueva duración
    ajustarTiempoDeFin(horario, tareasProyecto, linksProyecto, 0);

    await actualizarTareasEnBD(tareasProyecto);
    await actualizarDuracionYInicioDeProyecto(tareasProyecto);
    await actualizarUsuariosConFinDeTareas(tareasProyecto, usuarios);

    return proceedFlag;
}
    
    async function actualizarTareasEnBD(tareas) {
    if (!Array.isArray(tareas) || tareas.length === 0) return;

    await Promise.all(
        tareas.map(tarea => {
        return db.collection('tasks').updateOne(
            { pid: tarea.pid, id: tarea.id },
            {
            $set: {
                start_date: tarea.start_date,
                duration: tarea.duration,
                offtime: tarea.offtime,
                slack_used: tarea.slack_used
            }
            }
        );
        })
    );
    }


    function contarFinesDeSemana(inicio, fin) {
        let contador = 0;
        let fecha = new Date(inicio);
        fecha.setHours(0, 0, 0, 0);

        while (fecha <= fin) {
            const dia = fecha.getDay();
            if (dia === 0 || dia === 6) {
            contador++;
            }
            fecha = new Date(fecha.getTime() + 86400000); 
        }

        return contador;
    }

    
    async function ensureCollection(db, name) {
        const exists = await db.listCollections({ name }, { nameOnly: true }).hasNext();
        if (!exists) {
            await db.createCollection(name);
            console.log(`Creada colección ${name}`);
        }
    }

    async function ensureDatabase(db) {
        const collections = [
            'TemplateLinks',
            'TemplateTasks',
            'Templates',
            'calendarConfig',
            'links',
            'proyects',
            'tasks',
            'users',
            'execDate'
        ];

        for (const name of collections) {
            await ensureCollection(db, name);
        }

        // Sembrar datos mínimos si están vacíos
        if (await db.collection('calendarConfig').countDocuments() === 0) {
            await db.collection('calendarConfig').insertOne({ entrada: '08:00', salida: '18:00' });
            console.log('Sembrado calendarConfig por defecto');
        }

        if (await db.collection('execDate').countDocuments() === 0) {
            await db.collection('execDate').insertOne({ lastRun: new Date() });
            console.log('Sembrado execDate con fecha actual');
        }
        if (await db.collection('users').countDocuments() === 0) {
            await db.collection('users').insertOne({ uname: "admin",pass: "Admin1", admin: true, disponible: false, tareas: null});
            console.log('Sembrado users con fecha actual');
        }
    }



    /**
     * DELETE /tasks?pid=<pid>
     * Borra todas las tareas con el pid especificado.
     * Responde { deletedCount: N }.
     */



    app.delete('/proyect/delete', async (req, res) => {

        const pid = parseInt(req.query.pid, 10);
        if (isNaN(pid)) {
            return res
            .status(400)
            .json({ error: 'pid no válido o faltante' });
        }

        const result = await db
            .collection('proyects')
            .deleteOne({ id: pid });

        return res.json({ deletedCount: result.deletedCount });
    });

    app.post('/proyect/create', async (req, res) =>{
        const toInsert = {id: req.body.id, start: req.body.start, end: req.body.end, title: req.body.title, color: req.body.color};
        
        try{
            const proyect = await db
            .collection('proyects')
            .insertOne(toInsert)

            return res.status(200).json({inserted: proyect.insertedId})
        }catch (error){
            return res.status(500).json({error: error});
        }
    });


    app.get('/proyect', async (req, res) => {
        const pid = parseInt(req.query.pid, 10)
        if(isNaN(pid)){
            res.status(500).json({error: 'pid no válido o faltante'})
        }
        try {
            const proyects = await db
            .collection('proyects')
            .find({id: pid})
            .toArray();
            return res.json(proyects);
        } catch (err) {
            console.error('Error leyendo proyects:', err);
            return res.status(500).json({ error: 'Error interno al leer proyectos' });
        }
    });

    app.delete('/tasks', parsePid, async (req, res) => {
        const result = await db.collection('tasks').deleteMany({ pid: req.pid });
        res.json({ deletedCount: result.deletedCount });
    });

    
    app.delete('/links', parsePid, async (req, res) => {
        const result = await db.collection('links').deleteMany({ pid: req.pid });
        res.json({ deletedCount: result.deletedCount });
    });

    app.get('/users', async (req, res) => {
        try {
            const users = await db
            .collection('users')
            .find()
            .toArray();
            return res.json(users);
        } catch (err) {
            console.error('Error leyendo users:', err);
            return res.status(500).json({ error: 'Error interno al leer usuarios' });
        }
    });

    app.delete('/user/delete', async (req, res) => {
        try{
            const result = await db.collection('users').deleteOne({ uname: req.query.uname.toString().trim() });
            return res.status(200).json({ deletedCount: result.deletedCount });
        }catch(err){
            return res.status(500).json({error: err});
        }
        
    });

    app.post('/user/update', async (req, res) => {
        const { user, update } = req.body;

        const isValidUser = (u) =>
            u && typeof u.uname === 'string' && typeof u.pass === 'string' && typeof u.admin === 'boolean';

        if (!isValidUser(user) || !isValidUser(update)) {
            return res.status(400).json({ error: 'user y update deben tener uname, pass y admin válidos' });
        }

        const uname = user.uname.trim().toLowerCase();
        const pass  = user.pass.trim();

        try {
            const uname = user.uname.trim().toLowerCase();
            const pass = user.pass.trim();

            const updateData = {
                uname: update.uname.trim().toLowerCase(),
                pass: update.pass.trim(),
                admin: update.admin,
                disponible: update.disponible,
                tareas: update.tareas
            };

            const result = await db.collection('users').findOneAndUpdate(
                { uname: uname, pass: pass },   
                { $set: updateData },           
                { returnDocument: 'after' }     
            );

            return res.status(200).json({ message: 'Usuario actualizado con éxito' });

        } catch (err) {
            console.error('Error en /users/update:', err);
            return res.status(500).json({ error: 'Error interno al actualizar usuario' });
        }
    });

    app.get('/users/auth', async (req, res) => {
        const { uname, pass } = req.query;
        if (!uname || !pass) return res.status(400).end();

        try {
            const user = await db.collection('users')
            .findOne({ 
                uname: uname.toString().trim().toLowerCase(), 
                pass: pass.toString().trim() 
            });
            if (!user) return res.status(404).end();

            delete user.pass;
            return res.json(user);
        } catch (err) {
            return res.status(500).json({ error: 'Error interno' });
        }
    });

    app.post('/users/create', async (req, res)=>{
        
        const { uname, pass, admin, disponible } = req.body;
        if(!uname || !pass || (admin === null)) return res.status(400).end();
        try{
            const inserted = await db.collection('users').
            insertOne({uname: uname, pass: pass, admin: admin, disponible: disponible})
            if(!inserted.insertedId) return res.status(404).end();
            else return res.status(200).end();
        }
        catch (error){
            return res.status(500).json({error: error});
        }
    });

    app.get('/users/admin/ensure', async (req, res) => {
    try {
        const admins = await db.collection('users').countDocuments({ admin: true });

        if (admins === 0) {
        const defaultAdmin = {
            uname: 'admin',
            pass: 'Admin123',
            admin: true,
            disponible: false,
            tareas: null
        };

        const result = await db.collection('users').insertOne(defaultAdmin);

        // por seguridad, no se devuelve la contraseña
        return res.status(201).json({
            created: true,
            insertedId: result.insertedId,
            user: {
            uname: defaultAdmin.uname,
            admin: defaultAdmin.admin,
            disponible: defaultAdmin.disponible,
            tareas: defaultAdmin.tareas
            }
        });
        }

        return res.json({
        created: false,
        message: 'Ya existe al menos un usuario administrador'
        });

    } catch (err) {
        console.error('Error asegurando admin:', err);
        return res.status(500).json({ error: 'Error interno al asegurar usuario administrador' });
    }
    });
    

    app.get('/proyects', async (req, res) => {
        
        try {
            const proyects = await db
            .collection('proyects')
            .find()
            .toArray();
            return res.json(proyects);
        } catch (err) {
            console.error('Error leyendo proyects:', err);
            return res.status(500).json({ error: 'Error interno al leer proyectos' });
        }
    });

    app.get('/tasks', async (req, res) => {
        const pid = parseInt(req.query.pid);
        if (isNaN(pid)) {
            return res.status(400).json({ error: 'pid inválido o faltante' });
        }
        try {
            const tasks = await db
            .collection('tasks')
            .find({pid: pid})
            .toArray();
            return res.json(tasks);
        } catch (err) {
            console.error('Error leyendo tasks:', err);
            return res.status(500).json({ error: 'Error interno al leer tareas' });
        }
    });

    app.get('/links', async (req, res) => {
        const pid = parseInt(req.query.pid);
        if(isNaN(pid)){
            return res.status(400).json({error: 'pid inválido o faltante'});
        }
        try {
            const proyects = await db
            .collection('links')
            .find({pid: pid})
            .toArray();
            return res.json(proyects);
        } catch (err) {
            console.error('Error leyendo links:', err);
            return res.status(500).json({ error: 'Error interno al leer enlaces' });
        }
    });

    app.post('/tasks/batch', async (req, res) => {
        
        const tasks = req.body;
        if (!Array.isArray(tasks) || tasks.length === 0) {
            return res.status(400).json({ error: 'Se espera un array no vacío de tareas' });
        }

        for (const t of tasks) {
            //console.log(t);
            t.pid = parseInt(t.pid);
            if (
                typeof t.pid !== 'number' ||
                typeof t.id  !== 'number' ||
                typeof t.text!== 'string' ||
                typeof t.start_date !== 'string' ||
                typeof t.duration   !== 'number' || 
                typeof t.details !== 'string' || 
                typeof t.slack !== 'number' ||
                typeof t.slack_used !== 'number' ||
                typeof t.offtime !== 'number' ||
                typeof t.progress !== 'number' ||
                !Array.isArray(t.users)
            ) {
            return res.status(400).json({
                error: 'Cada tarea debe tener pid(number), id(number), text(string), start_date(string), duration(number), details(string), offtime(number)'
            });
            }
        }
        try {
   
                const toInsert = tasks.map(t => ({
                pid: t.pid,
                id:  t.id,
                text: t.text,
                start_date: t.start_date,
                duration:   t.duration,
                details: t.details ?? "",
                offtime: t.offtime,
                slack: t.slack,
                slack_used: t.slack_used,
                progress: t.progress,
                users: t.users
            }));
            const result = await db.collection('tasks').insertMany(toInsert);
            return res.status(201).json({
                insertedCount: result.insertedCount,
                insertedIds:   result.insertedIds
            });
        } catch (err) {
            console.error('Error insertando batch de tareas:', err);
            return res.status(500).json({ error: 'Error interno al crear tareas en lote' });
        }
    });


app.post('/tasks/updateBatch', async (req, res) => {
    const tasks = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: 'Se espera un array no vacío de tareas' });
    }

    for (const t of tasks) {
        t.pid = parseInt(t.pid);
        t.id = parseInt(t.id);
        if (
            typeof t.pid        !== 'number' ||
            typeof t.id         !== 'number' ||
            typeof t.text       !== 'string' ||
            typeof t.start_date !== 'string' ||
            typeof t.duration   !== 'number' ||
            typeof t.details    !== 'string' ||
            typeof t.slack      !== 'number' || // se valida que exista, pero no se usa en update
            typeof t.slack_used !== 'number' ||
            typeof t.offtime    !== 'number' ||
            typeof t.progress   !== 'number' ||
            !Array.isArray(t.users)
        ) {
            return res.status(400).json({
                error: 'Cada tarea debe tener pid(number), id(number), text(string), start_date(string), duration(number), details(string), slack(number), slack_used(number), offtime(number), progress(number), users(array)'
            });
        }
    }

    try {
        const toUpdate = tasks.map(t => ({
            pid:        t.pid,
            id:         t.id,
            text:       t.text,
            start_date: t.start_date,
            duration:   t.duration,
            details:    t.details ?? "",
            offtime:    t.offtime,
            // slack: t.slack,   <-- INTENCIONALMENTE OMITIDO
            slack_used: t.slack_used,
            progress:   t.progress,
            users:      t.users
        }));

        await Promise.all(
            toUpdate.map(t =>
                db.collection('tasks').updateOne(
                    { pid: t.pid, id: t.id },
                    { $set: t }
                )
            )
        );

        return res.status(200).json({
            updatedCount: toUpdate.length
        });
        } catch (err) {
            console.error('Error actualizando batch de tareas:', err);
            return res.status(500).json({ error: 'Error interno al actualizar tareas en lote' });
        }
    });


    app.post('/links/batch', async (req, res) => {
        const links = req.body;
        if (!Array.isArray(links) || links.length === 0) {
            return res
            .status(400)
            .json({ error: 'Se espera un array no vacío de enlaces' });
        }
   
        for (const l of links) {
            l.source = parseInt(l.source);
            l.target = parseInt(l.target);
            l.pid = parseInt(l.pid);
            if (
                typeof l.pid    !== 'number' ||
                typeof l.id     !== 'number' ||
                typeof l.source !== 'number' ||
                typeof l.target !== 'number' ||
                typeof l.type !== 'string'
            ) {
            return res.status(400).json({
                error:
                'Cada enlace debe tener pid(number), id(number), source(number), target(number), type(number|string)'
            });
            }
        }

        try {

            const toInsert = links.map(l => ({
                pid:    l.pid,
                id:     l.id,
                source: l.source,
                target: l.target,
                type:   l.type
            }));

            const result = await db.collection('links').insertMany(toInsert);
            return res.status(201).json({
                insertedCount: result.insertedCount,
                insertedIds:   result.insertedIds
            });
        } catch (err) {
            console.error('Error insertando batch de enlaces:', err);
            return res
            .status(500)
            .json({ error: 'Error interno al crear enlaces en lote' });
        }
    });

    app.get('/calendar/config', async (req, res) =>{
        try{
            const result = await db.collection('calendarConfig').find().toArray();
            return res.status(200).json(result[0]);
        }
        catch (error){
            return res.status(500).json({error: "Error Interno de Servidor"});
        }
    });


    app.post('/calendar/config/update', async (req, res) => {
    const newConfig = req.body;
        try {
            // 1) Eliminamos cualquier documento anterior
            await db.collection('calendarConfig').deleteMany({});

            // 2) Inserción de la nueva configuración
            const result = await db.collection('calendarConfig').insertOne(newConfig);

            // 201 Created con el ID del insertado
            return res.status(201).json({ insertedId: result.insertedId });
        } catch (err) {
            console.error('Error al recrear calendarConfig:', err);
            return res
            .status(500)
            .json({ error: 'Error interno al guardar la configuración' });
        }
    });

    app.post('/templates/create', async (req, res) =>{
        const toInsert = {id: req.body.id, end: req.body.end, title: req.body.title};
        
        try{
            const template = await db
            .collection('Templates')
            .insertOne(toInsert)

            return res.status(200).json({inserted: template.insertedId})
        }catch (error){
            return res.status(500).json({error: error});
        }
    });

    app.delete('/template/delete', async (req, res) => {
        const tid = parseInt(req.query.tid, 10);
        if (isNaN(tid)) {
            return res
            .status(400)
            .json({ error: 'tid no válido o faltante' });
        }

        const result = await db
            .collection('Templates')
            .deleteOne({ id: tid });

        return res.json({ deletedCount: result.deletedCount });
    });

    app.get('/templates', async (req, res) => {
        
        try {
            const templates = await db
            .collection('Templates')
            .find()
            .toArray();
            return res.json(templates);
        } catch (err) {
            console.error('Error leyendo proyects:', err);
            return res.status(500).json({ error: 'Error interno al leer proyectos' });
        }
    });

    app.get('/template', async (req, res) => {
        const pid = parseInt(req.query.tid, 10)
        if(isNaN(pid)){
            res.status(500).json({error: 'tid no válido o faltante'})
        }
        try {
            const templates = await db
            .collection('Templates')
            .find({id: pid})
            .toArray();
            return res.json(templates);
        } catch (err) {
            console.error('Error leyendo proyects:', err);
            return res.status(500).json({ error: 'Error interno al leer proyectos' });
        }
    });

    app.get('/template/tasks', async (req, res) => {
        const pid = parseInt(req.query.tid);
        if (isNaN(pid)) {
            return res.status(400).json({ error: 'tid inválido o faltante' });
        }
        try {
            const tasks = await db
            .collection('TemplateTasks')
            .find({tid: pid})
            .toArray();
            return res.json(tasks);
        } catch (err) {
            console.error('Error leyendo tasks:', err);
            return res.status(500).json({ error: 'Error interno al leer tareas' });
        }
    });

    app.get('/template/links', async (req, res) => {
        const pid = parseInt(req.query.tid);
        if (isNaN(pid)) {
            return res.status(400).json({ error: 'tid inválido o faltante' });
        }
        try {
            const links = await db
            .collection('TemplateLinks')
            .find({tid: pid})
            .toArray();
            return res.json(links);
        } catch (err) {
            console.error('Error leyendo tasks:', err);
            return res.status(500).json({ error: 'Error interno al leer tareas' });
        }
    });

    app.delete('/template/tasks', async (req, res) => {
        
        let tid = parseInt(req.query.tid);
        if(isNaN(tid)){
            return res.status(400).json({error: "tid inválido"})
        }
        const result = await db.collection('TemplateTasks').deleteMany({ tid: tid });
        res.json({ deletedCount: result.deletedCount });
    });

    
    app.delete('/template/links', async (req, res) => {
        
        let tid = parseInt(req.query.tid);
        if(isNaN(tid)){
            return res.status(400).json({error: "tid inválido"})
        }
        const result = await db.collection('TemplateLinks').deleteMany({ tid: tid });
        res.json({ deletedCount: result.deletedCount });
    });


    app.post('/template/tasks/batch', async (req, res) => {
        
        const tasks = req.body;
        if (!Array.isArray(tasks) || tasks.length === 0) {
            return res.status(400).json({ error: 'Se espera un array no vacío de tareas' });
        }

        for (const t of tasks) {
            t.tid = parseInt(t.tid);
            if (
                typeof t.tid !== 'number' ||
                typeof t.id  !== 'number' ||
                typeof t.text!== 'string' ||
                typeof t.start_date !== 'number' ||
                typeof t.duration   !== 'number' ||
                typeof t.user_count !== 'number'
            ) {
            return res.status(400).json({
                error: 'Cada tarea debe tener tid(number), id(number), text(string), start_date(string), duration(number)'
            });
            }
        }
        try {
   
                const toInsert = tasks.map(t => ({
                tid: t.tid,
                id:  t.id,
                text: t.text,
                start_date: t.start_date,
                duration:   t.duration,
                user_count: t.user_count
            }));
            const result = await db.collection('TemplateTasks').insertMany(toInsert);
            return res.status(201).json({
                insertedCount: result.insertedCount,
                insertedIds:   result.insertedIds
            });
        } catch (err) {
            console.error('Error insertando batch de tareas:', err);
            return res.status(500).json({ error: 'Error interno al crear tareas en lote' });
        }
    });


    app.post('/template/links/batch', async (req, res) => {
        const links = req.body;
        if (!Array.isArray(links) || links.length === 0) {
            return res
            .status(400)
            .json({ error: 'Se espera un array no vacío de enlaces' });
        }
   
        for (const l of links) {
            l.source = parseInt(l.source);
            l.target = parseInt(l.target);
            l.tid = parseInt(l.tid);
            if (
                typeof l.tid    !== 'number' ||
                typeof l.id     !== 'number' ||
                typeof l.source !== 'number' ||
                typeof l.target !== 'number' ||
                typeof l.type !== 'string'
            ) {
            return res.status(400).json({
                error:
                'Cada enlace debe tener tid(number), id(number), source(number), target(number), type(number|string)'
            });
            }
        }

        try {

            const toInsert = links.map(l => ({
                tid:    l.tid,
                id:     l.id,
                source: l.source,
                target: l.target,
                type:   l.type
            }));

            const result = await db.collection('TemplateLinks').insertMany(toInsert);
            return res.status(201).json({
                insertedCount: result.insertedCount,
                insertedIds:   result.insertedIds
            });
        } catch (err) {
            console.error('Error insertando batch de enlaces:', err);
            return res
            .status(500)
            .json({ error: 'Error interno al crear enlaces en lote' });
        }
    });

  app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
  });
}



main().catch(err => {
  console.error('Error iniciando servidor:', err);
  process.exit(1);
});


    function findAllSuccesors(task, tasksProyect, links) {
        let succesors = [];
        let contador = 0;
        let visitados = new Set();

        let sonLinks = links.filter(link => link.source === task.id);
        sonLinks.forEach(sonLink => {
            const found = tasksProyect.find(t => t.id === sonLink.target);
            if (found) {
                succesors.push(found);
                visitados.add(found.id);
            }
        });

        while (contador < succesors.length) {
            const current = succesors[contador];
            const newLinks = links.filter(link => link.source === current.id);
            newLinks.forEach(link => {
                const found = tasksProyect.find(t => t.id === link.target);
                if (found && !visitados.has(found.id)) {
                    succesors.push(found);
                    visitados.add(found.id);
                }
            });
            contador++;
        }

        return succesors;
    }
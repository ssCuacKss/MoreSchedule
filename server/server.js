const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { isLeftHandSideExpression } = require('typescript');
const { interval } = require('rxjs');
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

    

    function parsePid(req, res, next) {
        const pid = parseInt(req.query.pid, 10);
        if (isNaN(pid)) return res.status(400).json({ error: 'pid inválido' });
        req.pid = pid;
        next();
    }

    async function checkChangeOnCalendarProyectDuration(){
        const currentDate = new Date();
        let horario = await db.collection('calendarConfig').find().toArray();
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

            return startTime <= currentDate && currentDate <= endTime;
        });

        proyectosFuturos.sort((a, b) => new Date(a.start) - new Date(b.start));
        proyectosActivos.sort((a, b) => new Date(a.start) - new Date(b.start));

        let usuarios = await db.collection('users').find().toArray();
        
        for(let i = 0; i < proyectosActivos.length; i++){
            let proyecto = proyectosActivos[i];
            padProyectsSlack(proyecto, horario, usuarios);
            
            //console.log(tareasProyecto);
            //console.log(linksProyecto);
        }

        for(let i = 0; i < proyectosFuturos.length; i++){
            const proyecto = proyectosFuturos[i];
            const tareasProyecto = await db.collection('tasks').find({pid: proyecto.id}).toArray();
            
            const usuariosAsignados = getUsuariosConUltimaTareaEnProyecto(proyecto.id, usuarios);
            

            for(const { usuario, indexUltimaTarea } of usuariosAsignados){
                const pila = usuario.tareas;
                //const index = pila.findIndex(t => t.pid === proyecto.id && t.tid === ultimaTarea.id);
                //console.log(pila);
                if(indexUltimaTarea === 0){
                    continue;
                }

                const ultimaMeta = pila[indexUltimaTarea];
                const ultimaTarea = tareasProyecto.find(t => t.id === ultimaMeta.tid);
                if (!ultimaTarea){ 
                    continue;
                }

                const siguienteTarea = pila[indexUltimaTarea - 1];

                const siguienteProyecto = proyectosFuturos.find(p => p.id === siguienteTarea.pid);
                const tareasSiguienteProyecto = await db.collection('tasks').find({pid: siguienteProyecto.id}).toArray();
                const linksSiguienteProyecto = await db.collection('links').find({pid: siguienteProyecto.id}).toArray();
                if (!tareasSiguienteProyecto.length) {
                    continue;
                }
                
                const tareaInicio = tareasSiguienteProyecto[0];

                if (siguienteTarea.tid !== tareaInicio.id) {
                    continue; 
                }

                const finUltima = new Date(ultimaTarea.start_date).getTime() + ultimaTarea.duration * 60000;
                const inicioSiguiente = new Date(tareaInicio.start_date).getTime();

                if (inicioSiguiente < finUltima) {
                    const desplazamiento = finUltima - inicioSiguiente;
                    ajustarTiempoDeFin(horario, tareasSiguienteProyecto, linksSiguienteProyecto, desplazamiento);
                    actualizarTareasEnBD(tareasSiguienteProyecto);
                    actualizarDuracionYInicioDeProyecto(tareasSiguienteProyecto);
                    actualizarUsuariosConFinDeTareas(tareasSiguienteProyecto, usuarios)
                    
                }

            }


        }

        guardarUsuariosActualizados(usuarios);
        console.log("Finalizado ajuste de tareas por slack");
    }   

    async function guardarUsuariosActualizados(usuarios) {
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
            const fechaInicio = new Date(tarea.start_date).getTime();
            const fechaFin = new Date(fechaInicio + tarea.duration * 60000);
            const fechaFinFormateada = format(fechaFin, "yyyy-MM-dd HH:mm");

            for (const usuario of usuarios) {
                const pila = usuario.tareas ?? [];

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

        usuarios.forEach(user => {
            const tareas = user.tareas ?? [];
            //console.log(`Estas son las tarreas del usuario ${user.uname}:\n${JSON.stringify(tareas, null, 2)}\n`);
            // Buscar desde el final la última tarea del proyecto pid
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
        const horaSalida = horario[0].salida;
        const [hora1, minuto1] = horaEntrada.split(':').map(Number);
        const [hora2, minuto2] = horaSalida.split(':').map(Number);
        const duracionJornada =  (hora2 - hora1) * 60 + (minuto2 - minuto1);
        


        tareasProyecto.forEach(task => {
            let IncomingLinks = linksProyecto.filter((link) => link.target === task.id);
            let startDates= [];
            let totalSlackOverflow = 0;
            if(IncomingLinks.length !== 0){
                IncomingLinks.forEach((linkPredecesor)=>{
                    let taskToAdd = tareasProyecto.find((PredecesorTask) => PredecesorTask.id === linkPredecesor.source );
                    if(taskToAdd !== undefined){
                        const endTime = new Date(taskToAdd.start_date).getTime() + taskToAdd.duration * 60000;
                        totalSlackOverflow += (taskToAdd.slack < taskToAdd.slack_used) ? (taskToAdd.slack_used - taskToAdd.slack) : 0;
                        startDates.push(new Date(endTime));
                    }
                });
            }   

            let taskAdjustedStartDate = task.start_date;

            if (startDates.length !== 0) {
                startDates.sort((a, b) => b.getTime() - a.getTime());
                const startDateWithSlackOverflow = new Date(startDates[0].getTime() + totalSlackOverflow * 60000)
                taskAdjustedStartDate = format(startDateWithSlackOverflow, "yyyy-MM-dd HH:mm");
            }

            let fechaInicioTarea = new Date(new Date(taskAdjustedStartDate).getTime() + offsetInicio);
            const {horaInicioTarea, minutoInicioTarea} = {horaInicioTarea: fechaInicioTarea.getHours(), minutoInicioTarea: fechaInicioTarea.getMinutes()};
            
            if(horaInicioTarea < hora1 || ((horaInicioTarea === hora1 ) && (minutoInicioTarea < minuto1))){
                fechaInicioTarea.setHours(hora1, minuto1);
            }else if(horaInicioTarea > hora2 || ((horaInicioTarea === hora2 ) && (minutoInicioTarea >= minuto2))){
                fechaInicioTarea.setHours(hora1, minuto1);
                fechaInicioTarea = new Date(fechaInicioTarea.getTime() + 86400000);
            }
            while(isSaturday(fechaInicioTarea) || isSunday(fechaInicioTarea)){
                fechaInicioTarea = new Date(fechaInicioTarea.getTime() + 86400000);
            }

            let fechaFinDirecto = new Date(fechaInicioTarea.getTime() + (task.duration - task.offtime - task.slack_used) * 60000);

            let fullJournals = Math.floor(((task.duration - task.offtime  - task.slack_used )/ duracionJornada));

            let tiempoFinDeSemana = contarFinesDeSemana(fechaInicioTarea, fechaFinDirecto);

            let tiempoFueraDeJornada = tiempoFinDeSemana + fullJournals;
            let fechaFinConFinesDeSemana = new Date(fechaInicioTarea.getTime() + (task.duration - task.offtime - task.slack_used) * 60000  + tiempoFueraDeJornada * 86400000 );
            const horaFin = fechaFinConFinesDeSemana.getHours();
            const minutosFin = fechaFinConFinesDeSemana.getMinutes();


            let horasExtra = 0;
            let minutosExtra = 0;

                if(horaFin > hora2 || (horaFin === hora2 && (minutosFin > minuto2))){
                    fechaFinConFinesDeSemana.setHours(hora1, minuto1);
                    fechaFinConFinesDeSemana = new Date(fechaFinConFinesDeSemana.getTime() + 86400000);
                    ++tiempoFueraDeJornada;
                    horasExtra = horaFin - hora2;
                    minutosExtra = minutosFin - minuto2;
                }

                let timeToAdd = (horasExtra * 60 + minutosExtra) * 60000 ;
                tiempoFueraDeJornada += ((horasExtra + minutosExtra / 60)/24);
                fechaFinConFinesDeSemana = new Date(fechaFinConFinesDeSemana.getTime() + timeToAdd);
                
                while(isSaturday(fechaFinConFinesDeSemana) || isSunday(fechaFinConFinesDeSemana)){
                    fechaFinConFinesDeSemana = new Date(fechaFinConFinesDeSemana.getTime() + 86400000);
                    ++tiempoFueraDeJornada;
                }
                
                const duracionTotal = Math.round((fechaFinConFinesDeSemana.getTime() - fechaInicioTarea.getTime()) / 60000);
                const duracionReal = task.duration - task.slack_used;
                
                const tiempoNoProductivo = duracionTotal - duracionReal;

                task.start_date = format(fechaInicioTarea, "yyyy-MM-dd HH:mm");
                task.duration = duracionTotal;
                task.offtime = tiempoNoProductivo;

        });



    }

    async function padProyectsSlack(proyect, horario, usuarios){
        
        const currentDate = new Date().getTime();
        
        
        let tareasProyecto = await db.collection('tasks').find({pid: proyect.id}).toArray();
        let linksProyecto = await db.collection('links').find({pid: proyect.id}).toArray()
        
        
        tareasProyecto.forEach(tarea =>{
            let fechaFinTarea = new Date(tarea.start_date).getTime() + (tarea.duration * 60000);
            if (currentDate > fechaFinTarea  && tarea.progress < 1){
                let extraTime = (currentDate - fechaFinTarea)/60000;
            
                tarea.duration -= tarea.slack_used
                tarea.duration += extraTime;
                tarea.slack_used = extraTime;
                

                /*let succesors = findAllSuccesors(tarea, tareasProyecto, linksProyecto);
                succesors.forEach(succesor =>{
                    succesor.start_date = format(new Date(new Date(succesor.start_date).getTime() + (timeToAdd * 60000)), "yyyy-MM-dd HH:mm");
                })*/

            }
        });
        
        ajustarTiempoDeFin(horario, tareasProyecto, linksProyecto, 0);
        actualizarTareasEnBD(tareasProyecto);
        actualizarDuracionYInicioDeProyecto(tareasProyecto);
        actualizarUsuariosConFinDeTareas(tareasProyecto, usuarios);
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

    
    setInterval( async() =>{
        try{
            await checkChangeOnCalendarProyectDuration()
        }catch (error){
            console.error('UNEXPECTED ERROR ON EXECUTION ADJUSTMENT EXECUTION', error);
        }
    },MINUTES_INTERVAL * 60000)
    
    
    
    checkChangeOnCalendarProyectDuration();



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
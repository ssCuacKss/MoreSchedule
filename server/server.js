const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME   = 'MoreScheduleDBdata';
const PORT      = 3000;

async function main() {

    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Conectado a MongoDB: ${MONGO_URL} → ${DB_NAME}`);

    const app = express();
    app.use(cors());
    app.use(express.json());

    /**
     * DELETE /tasks?pid=<pid>
     * Borra todas las tareas con el pid especificado.
     * Responde { deletedCount: N }.
     */
    function parsePid(req, res, next) {
        const pid = parseInt(req.query.pid, 10);
        if (isNaN(pid)) return res.status(400).json({ error: 'pid inválido' });
        req.pid = pid;
        next();
    }



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
            t.pid = parseInt(t.pid);
            if (
                typeof t.pid !== 'number' ||
                typeof t.id  !== 'number' ||
                typeof t.text!== 'string' ||
                typeof t.start_date !== 'string' ||
                typeof t.duration   !== 'number'
            ) {
            return res.status(400).json({
                error: 'Cada tarea debe tener pid(number), id(number), text(string), start_date(string), duration(number)'
            });
            }
        }
        try {
   
                const toInsert = tasks.map(t => ({
                pid: t.pid,
                id:  t.id,
                text: t.text,
                start_date: t.start_date,
                duration:   t.duration
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
        console.log(req.query.tid);
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
                typeof t.duration   !== 'number'
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
                duration:   t.duration
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
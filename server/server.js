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

  app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
  });
}




main().catch(err => {
  console.error('Error iniciando servidor:', err);
  process.exit(1);
});
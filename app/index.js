// NPM
import path from 'path';
import express from 'express';
import multer from 'multer';
// FILE THAT CONTAINS THE CONFIG
import { app, port } from './express.js';
import { FbController } from './controllers/fb.js';
import { basePath, slug } from './fn.js';
import { IceController } from './controllers/ice.js';
app.get('/', async (req, res) => res.render('index.html'));
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, basePath('/public/media', true)),
    filename: (req, file, cb) => {
        let name = path.basename(file.originalname).split('.').slice(0, -1).join('.');
        cb(null, slug(name) + '-' + Date.now() + path.extname(file.originalname)); //Appending extension
    }
});
const mt = multer({ storage: storage });
app.get('/login', FbController.login);
app.get('/users', FbController.users);
app.get('/users/:id', IceController.user);
app.get('/users/:id/group', IceController.fbUsers);
app.get('/users/:id/scrape-groups', IceController.scrapeGroups);
app.get('/groups/lk', FbController.lkg);
app.use(express.static(basePath('/public', true)));
app.listen(port, () => console.log(`listening on port http://127.0.0.1:${port}`));

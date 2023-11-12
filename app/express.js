// NPM
import express from 'express';
import ejs from 'ejs';
import { basePath } from './fn.js';
const app = express();
const envPort = process.env.APP_PORT;
let PORT = process.env.APP_PORT || 3000;
if (envPort && Number(envPort) > 0)
    PORT = Number(envPort);
// parse requests of content-type - application/json
app.use(express.json());
// Set default renderer for html files
app.engine('html', ejs.renderFile);
// Set default view engine
app.set('view engine', 'ejs');
app.set('views', basePath('views'));
const port = PORT;
export { app, port };

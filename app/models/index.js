import mongoose from 'mongoose';
import { loadEnv } from '../fn.js';
if (!process.env.DB_URL)
    loadEnv();
if (!process.env.DB_URL) {
    console.log('Database name is required');
    console.log('Open .env file and fill DB_URL=');
    process.exit();
}
const CONNECT = String(process.env.DB_URL).trim();
mongoose.Promise = global.Promise;
mongoose.set('strictQuery', false);
mongoose.connect(CONNECT);
const db = mongoose;
export { db };
export default db;

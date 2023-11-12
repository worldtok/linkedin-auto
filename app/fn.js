import path from 'path';
import fs from 'fs';
// NPM
import * as dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const delay = async (time) => new Promise(resolve => setTimeout(resolve, time));
export const basePath = (subPath, create = false) => {
    let mainPath = path.join(__dirname + '/../');
    if (subPath) {
        subPath = String(subPath).replace(/^\/+/, '').replace(/\/+$/, '');
        mainPath = path.join(mainPath, subPath);
    }
    create && !fs.existsSync(mainPath) && fs.mkdirSync(mainPath);
    return mainPath;
};
/**
 * User agent
 */
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0';
export const slug = (str, sep = '-') => {
    const _start = new RegExp('^' + sep);
    const _end = new RegExp(sep + '$');
    const _a = String(str).replace(/\W+/g, sep).toLowerCase().replace(_start, '').replace(_end, '');
    return _a;
};
export const timestamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
/**
 * Reads cookie from a file or write a cookies to a file
 * @param {Page} page
 * @param {string} name the file name of the cookies without extension. All extension are in JSON
 */
export const pageCookies = (name, page) => {
    name = slug(name);
    const cookieFile = cookiePath(name);
    return {
        retrieve: async () => {
            if (!fs.existsSync(cookieFile))
                return false;
            await page.deleteCookie();
            const cookieStr = fs.readFileSync(cookieFile).toString();
            await page.setCookie(...JSON.parse(cookieStr));
            return true;
        },
        save: async () => {
            const cookies = await page.cookies();
            fs.writeFileSync(cookieFile, JSON.stringify(cookies));
        },
        lsSave: async () => {
            const cookies = await page.evaluate(() => JSON.stringify(localStorage));
            fs.writeFileSync(cookieFile, cookies);
        },
        /**
         * Ad stored items to current page local storage
         * @returns void
         */
        lsRetrieve: async () => {
            if (!fs.existsSync(cookieFile))
                return false;
            const cookieStr = fs.readFileSync(cookieFile).toString();
            const oldItems = JSON.parse(cookieStr);
            await page.evaluate(oldItems => {
                localStorage.clear();
                Object.assign(localStorage, oldItems);
            }, oldItems);
            return true;
        },
        del: () => fs.existsSync(cookieFile) && fs.unlinkSync(cookieFile),
        exists: () => {
            return fs.existsSync(cookieFile);
        }
    };
};
/**
 * Return the path to store cookies used in the bot
 */
export const cookiePath = (name, extension = 'json') => {
    if (name)
        name = slug(name);
    const dir = basePath('cookies');
    // const dir = path.join(__dirname + '/cookies')
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    return name ? `${dir}/${name}.${extension}` : dir;
};
export const escapeRegex = (string) => String(string).replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
String.prototype.escapeRegex = function () {
    return this.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
};
export const loadEnv = () => dotenv.config({ path: basePath('.env') });

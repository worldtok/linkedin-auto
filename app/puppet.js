// NPM
import puppeteer from 'puppeteer-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';
import { loadEnv } from './fn.js';
if (!process.env.ENV_LOADED)
    loadEnv();
puppeteer.use(stealth());
const viewport = { x: 1600, y: 740 };
const envHeadless = process.env.PUPPETEER_HEADLESS;
let headless = 'new';
const IN_DEV = String(process.env.APP_ENV).toUpperCase() == 'DEV';
// You must be in development before headless can be false
if (IN_DEV && envHeadless && String(envHeadless).toUpperCase() != 'TRUE' && envHeadless != '1')
    headless = false;
const exePath = process.env.BROWSER_PATH;
const args = [
    '--no-sandbox',
    // allow iframe to be visible
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-setuid-sandbox',
    '--enable-automation',
    '--use-fake-ui-for-media-stream',
    '--disable-notifications',
    '--disable-geolocation'
];
const puppetConfig = {
    headless,
    executablePath: exePath && exePath.length > 10 ? exePath : executablePath(),
    defaultViewport: { width: viewport.x, height: viewport.y },
    args
};
export { puppetConfig, viewport, headless, IN_DEV, puppeteer };

import OpenAI from 'openai';
// DEV
import { delay, pageCookies } from './fn.js';
export const aiAuth = async (page) => {
    console.log('Waiting to login to openai');
    if (!page.url().endsWith('auth/login')) {
        await page.goto('https://chat.openai.com/');
        try {
            await page.waitForNetworkIdle();
        }
        catch {
            // continue
        }
        await delay(2000);
    }
    try {
        if (!page.url().endsWith('auth/login')) {
            return;
        }
        // wait for the login button
        await page.waitForSelector('[data-testid="login-button"]');
        try {
            await page.focus('[data-testid="login-button"]');
            await Promise.all([page.click('[data-testid="login-button"]'), page.waitForNavigation()]);
        }
        catch {
            //
        }
    }
    catch (e) {
        console.log(e);
        console.log('Login to openai failed');
        process.exit();
    }
    const username = async () => {
        try {
            await page.waitForSelector('#username');
            return true;
        }
        catch {
            console.log('wait for #username exceeded 30 seconds');
            return username();
        }
    };
    await username();
    await page.type('#username', process.env.OPENAI_EMAIL);
    await page.click('button[type=submit]');
    await page.waitForSelector('#password');
    await page.type('#password', process.env.OPENAI_PASSWORD);
    await delay(1000);
    try {
        await Promise.all([page.click('._button-login-password'), page.waitForNavigation()]);
    }
    catch {
        //
    }
    try {
        await page.waitForSelector('textarea');
    }
    catch {
        console.log('Login to open ai failed');
        process.exit();
    }
    console.log('Logged in to ________OPEN-AI__________ successful');
    await pageCookies('openai', page).save();
    return;
};
export const aiPage = async (browser) => {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/110.0');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' });
    await pageCookies('openai', page).retrieve();
    await page.goto('https://chat.openai.com', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.setItem('oai/apps/hasSeenOnboarding/chat', '"2023-07-18"'));
    await page.goto('https://chat.openai.com', { waitUntil: 'networkidle0' });
    const login = async () => {
        const pageUrl = new URL(page.url());
        const loggedOut = await page.evaluate(() => {
            return document.querySelector('body')?.textContent?.includes('Your session has expired');
        });
        if (pageUrl.pathname.endsWith('auth/login') || loggedOut) {
            await page.goto(`https://chat.openai.com/auth/login`, { waitUntil: 'networkidle0' });
            await aiAuth(page);
            return login();
        }
    };
    await login();
    await pageCookies('openai', page).save();
    console.log('AI__________________________Page is ready______________');
    return page;
};
const inHome = async (page) => {
    try {
        await page.waitForSelector('nav a', { timeout: 10000 });
    }
    catch {
        return inHome(page);
    }
    // check if old chats has been loaded
    try {
        await page.waitForSelector('nav .overflow-y-auto a', { timeout: 2000 });
    }
    catch {
        await page.reload({ waitUntil: 'networkidle0' });
        return inHome(page);
    }
    return true;
};
export const aiAuto = async (page, prompt) => {
    await page.bringToFront();
    prompt = prompt.trim().replace(/\n\r/g, '  ').replace(/\n/g, '  ').replace(/\r/g, '  ') + '\n';
    try {
        await page.click('textarea');
    }
    catch {
        console.log('Failed before ' + prompt);
        // failed to continue
        return '';
    }
    await delay(5000);
    await page.type('textarea', prompt);
    /**
     * After every 5 seconds, you wait for navigation
     * if it fails we know that everything is done
     * @returns
     */
    const done = async () => {
        try {
            const x = await page.evaluate(() => {
                const cc = document.querySelectorAll('.bottom-0 .flex.w-full.items-center.justify-center.gap-2');
                return Array.from(cc).some(x => {
                    const c = x.textContent?.trim();
                    console.log(c);
                    return c == 'Regenerate response' || c == 'Show more' || c == 'Regenerate';
                });
            });
            if (x)
                return true;
            await delay(1000);
            return done();
        }
        catch (e) {
            console.log(e);
            return done();
        }
    };
    // wait for 10 seconds then start checking when it is done
    await delay(10000);
    await done();
    const content = await page.evaluate(() => {
        const index = document.querySelectorAll('.markdown').length;
        if (!index)
            return '';
        const text = document.querySelectorAll('.markdown')[index - 1];
        // return text?.textContent || ''
        return text?.innerText || '';
    });
    console.log({ content });
    return trimHashTag(content);
};
/**
 * Remove all hashtag that appear at the end of aa text until there's is none
 * @param text
 */
const trimHashTag = (text) => {
    if (!text)
        return '';
    text = String(text);
    const hashes = text.match(/#[-\w]+/g) || [];
    for (let i = 0; i < hashes.length; i++) {
        text = text.trim();
        text = text.replace(/#[-\w]+(\s?)$/g, '');
    }
    return text.trim();
};
export const ai = async (content) => {
    // return 'Hello friend'
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('Wait for open ai');
    try {
        const chatCompletion = await openai.chat.completions.create({
            messages: [{ role: 'user', content }],
            model: 'gpt-3.5-turbo'
        });
        console.log(chatCompletion.choices);
        return chatCompletion.choices[0]?.message?.content || '';
    }
    catch (e) {
        console.error(e);
    }
    return '';
};

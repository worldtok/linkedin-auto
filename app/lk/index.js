import { puppetConfig, puppeteer } from './../puppet.js';
import { pageCookies, delay, UA, slug } from './../fn.js';
import { User } from './../models/users.js';
export const activeUser = async () => await User.findOne({ active: true, ac: 'lk' });
export const auth = async (browser, user) => {
    if (!user)
        user = await User.findOne({ active: true, ac: 'lk' });
    if (!user) {
        console.log('No active linkedin user found');
        return;
    }
    console.log('Waiting for linkedin authentication');
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    page.setDefaultNavigationTimeout(0);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' });
    const hasCookie = await pageCookies(`lk-${user.username}`, page).retrieve();
    try {
        await page.goto('https://www.linkedin.com/', { waitUntil: 'networkidle0' });
    }
    catch {
        //
    }
    if (hasCookie) {
        await delay(2000);
        const guest = await page.$('#session_key');
        if (!guest) {
            console.log('Login successful');
            await pageCookies(`lk-${user.username}`, page).save();
            await page.close();
            return true;
        }
    }
    try {
        await page.waitForSelector('#session_key');
        await page.type('#session_key', user.username);
        await page.type('#session_password', user.password);
    }
    catch (e) {
        //
        console.log('Failed to type username and password');
        await page.close();
        return false;
    }
    try {
        await page.click('[type=submit]');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    }
    catch {
        //
    }
    console.log('Login form submitted');
    try {
        await delay(3000);
        const verify = async () => {
            try {
                const title = await page.title();
                if (title.match(/security verification/i)) {
                    console.log('waiting to verify security code');
                    await delay(1000);
                    return verify();
                }
            }
            catch {
                return verify();
            }
            const link = page.url();
            if (link.match(/feed/i))
                return true;
            else
                return verify();
        };
        try {
            await verify();
        }
        catch {
            // continue
        }
        await delay(2000);
        await pageCookies(`lk-${user.username}`, page).save();
        await page.close();
        return true;
    }
    catch (e) {
        //
    }
    console.log('Failed to login, please try again');
    await page.close();
    pageCookies(`lk-${user.username}`).del();
    return false;
};
export const login = async () => {
    const user = await activeUser();
    if (!user)
        return false;
    const browser = await puppeteer.launch(puppetConfig);
    const status = await auth(browser);
    await browser.close();
    return status;
};
export const logout = async (id) => {
    if (!id)
        return false;
    id = slug(id);
    pageCookies(`lk-${id}`).del();
    console.log('Logged out for %s', id);
    return true;
};
export const access = async (browser, page, user) => {
    await page.setUserAgent(UA);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' });
    await pageCookies(`lk-${user.username}`, page).retrieve();
    try {
        await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle0' });
    }
    catch {
        //
    }
    const title = await page.title();
    if (title.match(/sign up/i)) {
        await auth(browser, user);
        try {
            await page.goto('https://www.linkedin.com/feed', { waitUntil: 'networkidle0' });
        }
        catch {
            //
        }
    }
    await delay(3000);
};

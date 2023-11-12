import { delay } from '../fn.js';
import { puppeteer, puppetConfig } from '../puppet.js';
import { LkGroup } from '../models/lk-groups.js';
import { LkUser } from '../models/lk-users.js';
import { scrollEnded } from './fn.js';
import { access } from './index.js';
import { aiAuto, aiPage } from './../openai.js';
const PROMPT = `From this profile info  square bracket ["{bio}"].  Generate an ice breaker that will enable me connect with him
    write in a professional tone that has good language with good etiquettes.
    The output should be crisp and clear. No quotation mark around the output. No fluff or unnecessary explanation from you
    Do not include link in the output. Do not include hasTag in the output unless it is part of the sentence.
    Do not include my name as this is a linkedin profile.
    End the sentence with a full stop
`;
export const connect = async (user) => {
    const accounts = await LkGroup.find({ sent_at: null, active: !0 });
    console.log('%d groups to scrape users from for %s', accounts.length, user.username);
    if (!accounts.length)
        return;
    console.log('Scrapping linkedin users from groups for %s', user.username);
    const browser = await puppeteer.launch(puppetConfig);
    const openai = await aiPage(browser);
    const page = await browser.newPage();
    await access(browser, page, user);
    const pBio = await browser.newPage();
    await access(browser, pBio, user);
    await page.bringToFront();
    /**
     *
     * @param ac linkedin group
     */
    const fetchUsers = async (ac) => {
        try {
            await page.waitForSelector('.artdeco-list.groups-members-list__results-list');
        }
        catch {
            console.log('Users list not found');
        }
        console.log('Finding users from %s', ac.name);
        const scrollAndSave = async () => {
            const done = await scrollEnded(page);
            if (done)
                return;
            try {
                const closed = await page.evaluate(async () => {
                    let clicked = false;
                    // @ts-ignore
                    document.querySelectorAll('.msg-overlay-bubble-header__controls.display-flex.align-items-center').forEach(x => {
                        clicked = true;
                        // @ts-ignore
                        document.querySelector('.artdeco-modal .artdeco-button--primary')?.click();
                        let bubble = x;
                        // let btns = bubble?.querySelectorAll('button').length || 1
                        let btns = bubble?.children.length || 1;
                        // @ts-ignore
                        bubble?.querySelector(`button:nth-child(${btns})`)?.click();
                    });
                    return clicked;
                });
                if (closed)
                    await delay(1000);
            }
            catch {
                //
            }
            const list = await page.$$('.artdeco-list.groups-members-list__results-list  li.artdeco-list__item');
            const oneByOne = async (index = 0) => {
                const item = list[index];
                if (!item)
                    return;
                /**
                 * @var The receiver of the message
                 */
                const data = await page.evaluate(item => {
                    const a = item.querySelector('a');
                    // @ts-ignore
                    const link = a?.href;
                    const name = a?.querySelector('.artdeco-entity-lockup__title')?.textContent?.trim();
                    const subtitle = a?.querySelector('.artdeco-entity-lockup__subtitle')?.textContent?.trim();
                    return { name, link, subtitle };
                }, item);
                data.group = ac.name;
                data.group_link = ac.link;
                if (!data.link)
                    return oneByOne(index + 1);
                // check if user has received ice
                const alreadySent = await LkUser.findOne({ link: data.link, sent_at: { $ne: null } });
                if (alreadySent)
                    return oneByOne(index + 1);
                await pBio.bringToFront();
                const bio = await (async () => {
                    try {
                        await pBio.goto(data.link, { waitUntil: 'domcontentloaded' });
                    }
                    catch {
                        //
                    }
                    try {
                        await pBio.waitForSelector('.mt2.relative', { timeout: 10000 });
                    }
                    catch {
                        console.log('Bio not found for for %s', data.name);
                        return null;
                    }
                    const bioText = await pBio.evaluate(() => {
                        const text = document.querySelector('.mt2.relative')?.textContent?.trim().replace(/\s+/g, ' ').trim();
                        return text;
                    });
                    if (!bioText)
                        return null;
                    return bioText;
                })();
                data.bio = bio;
                // console.log(data)
                await page.bringToFront();
                if (!bio) {
                    data.sent_at = new Date();
                    data.status = 'Bio Not Found';
                    await LkUser.create(data);
                    return oneByOne(index + 1);
                }
                data.bio = bio;
                // console.log(data)
                data.prompt = PROMPT;
                const prompt = PROMPT.replace('{name}', data.name).replace('{bio}', data.bio);
                //   `
                // Here is the bio
                //  "${bio}" and here is the user
                //  linkedin subtitle "${data.subtitle}"`
                // const _prompt = prompt.replace('{name}', data.name)
                let ice = await aiAuto(openai, prompt);
                // console.log(ice)
                // prettier-ignore
                ice = ice.replace(/\[Your Name\]$/i, '').trim().replace(/,$/, '.');
                // console.log({ ice })
                // await delay(9999)
                if (!ice) {
                    data.status = 'Ice Not Found';
                    data.sent_at = new Date();
                    await LkUser.create(data);
                    return oneByOne(index + 1);
                }
                data.ice = ice;
                await page.bringToFront();
                const closed = await page.evaluate(async () => {
                    let clicked = false;
                    // @ts-ignore
                    document.querySelectorAll('.msg-overlay-bubble-header__controls.display-flex.align-items-center').forEach(x => {
                        clicked = true;
                        // @ts-ignore
                        document.querySelector('.artdeco-modal .artdeco-button--primary')?.click();
                        let bubble = x;
                        // let btns = bubble?.querySelectorAll('button').length || 1
                        let btns = bubble?.children.length || 1;
                        // @ts-ignore
                        bubble?.querySelector(`button:nth-child(${btns})`)?.click();
                    });
                    return clicked;
                });
                if (closed)
                    await delay(1000);
                // send the message
                // click send mes btn
                await page.evaluate(item => {
                    // @ts-ignore
                    item.querySelector('.artdeco-button.artdeco-button--2')?.click();
                }, item);
                try {
                    await page.waitForSelector('.msg-form__contenteditable');
                }
                catch {
                    data.status = 'Unable to send text Message';
                    data.sent_at = new Date();
                    await LkUser.create(data);
                    return oneByOne(index + 1);
                }
                try {
                    await page.type('.msg-form__contenteditable', ice);
                    await delay(100);
                    await page.click('.msg-form__send-button');
                    try {
                        await page.waitForNetworkIdle({ timeout: 15000 });
                    }
                    catch {
                        //
                    }
                    data.sent_at = new Date();
                    data.status = 'success';
                    await LkUser.create(data);
                }
                catch (e) {
                    console.log(e);
                }
                await page.evaluate(() => {
                    // @ts-ignore
                    let bubble = document.querySelector('.msg-overlay-bubble-header__controls.display-flex.align-items-center');
                    // let btns = bubble?.querySelectorAll('button').length || 1
                    let btns = bubble?.children.length || 1;
                    // @ts-ignore
                    bubble?.querySelector(`button:nth-child(${btns})`)?.click();
                    // @ts-ignore
                    document.querySelector('.artdeco-modal .artdeco-button--primary')?.click();
                });
                console.log('%d:%s', index + 1, data.status);
                return oneByOne(index + 1);
            };
            await oneByOne();
            try {
                await page.evaluate(async () => window.scrollTo({ top: document.body.scrollHeight - 500, behavior: 'smooth' }));
                await page.evaluate(async () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
                await delay(5000);
            }
            catch {
                //
            }
            return scrollAndSave();
        };
        await scrollAndSave();
    };
    const loop = async (index = 0) => {
        if (index >= accounts.length)
            return;
        const ac = accounts[index];
        const link = ac.link.replace(/\/+$/, '') + '/members/';
        console.log('%d:%s', index + 1, ac.name);
        try {
            await page.goto(link, { waitUntil: 'networkidle0' });
        }
        catch {
            //
        }
        try {
            await page.waitForNetworkIdle({ timeout: 5000 });
        }
        catch {
            //
        }
        await fetchUsers(ac);
        await delay(5000);
        return loop(index + 1);
    };
    await loop();
    await page.close();
    await browser.close();
    console.log('Done scrapping users from %d groups for %s', accounts.length, user.username);
    return;
};

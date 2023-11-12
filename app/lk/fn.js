import { delay } from '../fn.js';
import { puppeteer, puppetConfig } from '../puppet.js';
import { access } from './index.js';
import { LkGroup } from '../models/lk-groups.js';
const scrollTop = [];
export const scrollEnded = async (page, start = false) => {
    const position = await page.evaluate(() => document.documentElement.scrollTop);
    scrollTop.push(position);
    const last2 = scrollTop.slice(-2);
    return last2[0] == last2[1];
};
export const myGroups = async (user) => {
    console.log('Scrapping linkedin groups for %s', user.username);
    const browser = await puppeteer.launch(puppetConfig);
    const page = await browser.newPage();
    await access(browser, page, user);
    try {
        await page.goto('https://www.linkedin.com/groups/', { waitUntil: 'networkidle2' });
    }
    catch {
        //
    }
    await delay(3000);
    const scroll = async () => {
        const done = await scrollEnded(page);
        if (done)
            return;
        try {
            await page.keyboard.press('PageDown', { delay: 50 });
            await page.keyboard.press('PageDown', { delay: 50 });
        }
        catch {
            //
        }
        try {
            await page.waitForNetworkIdle({ timeout: 6000 });
        }
        catch {
            //
        }
        return scroll();
    };
    await scroll();
    // extract items and save
    const _items = await page.evaluate(async () => {
        // @ts-ignore
        let list = document.querySelector('ul.artdeco-list').querySelectorAll('li.artdeco-list__item');
        const rows = [];
        list.forEach(l => {
            rows.push({
                link: l?.querySelector('a')?.href,
                name: l?.querySelector('a')?.textContent?.trim(),
                members: l?.querySelector('.artdeco-entity-lockup__metadata')?.textContent?.replace(/[^\d]/g, '') || null,
                dp: l?.querySelector('img')?.src
            });
        });
        return rows.filter(x => x.name && x.link);
    });
    const items = _items.map(x => {
        return {
            ...x,
            user: user.username
        };
    });
    await browser.close();
    await LkGroup.insertMany(items);
    await cleanGroup(items.length);
    return true;
};
export const cleanGroup = async (saved = 0, exit = false) => {
    const all = (await LkGroup.aggregate([{ $sort: { link: 1 } }, { $group: { _id: '$link', dups: { $push: '$_id' }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }], { allowDiskUse: true }));
    const ids = all.map(x => {
        const dups = x.dups.map(y => {
            return String(y);
        });
        dups.shift();
        return dups;
    });
    let total = 0;
    const loop = async (index = 0) => {
        if (index >= ids.length)
            return;
        const _id = ids[index];
        const x = await LkGroup.deleteMany({ _id });
        if (x.deletedCount)
            total += x.deletedCount;
        // console.log(x)
        return loop(index + 1);
    };
    await loop();
    console.log(`Found______________________${total} Duplicates groups`);
    if (saved) {
        console.log(`Found_____________________${saved - total} Unique groups`);
    }
    if (exit)
        process.exit();
};

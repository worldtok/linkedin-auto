import { login as lkLogin, logout as lkLogout } from './../lk/index.js';
import { User } from '../models/users.js';
import { LkGroup } from '../models/lk-groups.js';
export const FbController = {
    login: async (req, res) => {
        let username = req.query.u;
        let password = req.query.p;
        let send = Boolean(req.query.s);
        let search = Boolean(req.query.q);
        let ac = 'lk';
        if (req.query.id) {
            const old = await User.findById(req.query.id);
            if (!old) {
                return res.redirect('/login');
            }
            if (req.query.update && (!username || !password))
                return res.render('login.html', { username, password, send, search });
            if (req.query.update) {
                old.username = username;
                old.password = password;
                old.ac = ac;
                await old.save();
                return res.redirect('/users');
            }
            ;
            ({ username, password, ac } = old);
            return res.render('login.html', { username, password, send, search, ac, id: old.id, edit: true });
        }
        if (!username || !password)
            return res.render('login.html', { username, password, send, search });
        // save user and activate it
        const exist = await User.exists({ username, ac });
        if (!exist)
            await User.create({ username, password, send, search, active: true, ac });
        await User.updateMany({ username: { $ne: username }, ac }, { active: false });
        const status = await lkLogin();
        if (status) {
            await User.findOneAndUpdate({ username, ac }, { status: true });
            return res.redirect('/users');
        }
        return res.render('login.html', { username, password, send, search, ac });
    },
    users: async (req, res) => {
        const keys = ['status', 'active', 'send', 'search'];
        const key = keys.find(x => req.query[x]);
        if (key) {
            const item = await User.findOne({ _id: req.query[key] });
            if (item) {
                const update = await User.findByIdAndUpdate(req.query[key], { [key]: !item[key] });
                if (update && key == 'status' && item.status) {
                    // await logout(item.username)
                }
                if (update && key == 'active' && !item.active) {
                    const updates = await User.updateMany({ _id: { $ne: item.id }, ac: item.ac }, { active: false });
                }
            }
            return res.redirect('back');
        }
        const users = await User.find({});
        const delId = req.query.del;
        if (delId) {
            const us = await User.findById(delId);
            await User.findByIdAndDelete(delId);
            await lkLogout(us?.username);
            // await logout(item?.id)
            return res.redirect('back');
        }
        return res.render('users.html', { users });
    },
    lkg: async (req, res) => {
        const delId = req.query.del;
        if (delId) {
            const i = await LkGroup.findByIdAndRemove(delId);
            return res.redirect('back');
        }
        const id = req.query.id;
        if (id) {
            try {
                const old = await LkGroup.findById(id);
                await LkGroup.findByIdAndUpdate(id, { active: !old?.active });
            }
            catch {
                //
            }
            return res.redirect('back');
        }
        const search = req.query.s;
        let accounts = [];
        const user = await User.findOne({ active: !0, ac: 'lk' });
        if (user) {
            if (search) {
                accounts = await LkGroup.find({ name: { $regex: `.*${search.escapeRegex()}.*`, $options: 'i' }, user: user.username }).sort({ updatedAt: -1 });
            }
            else {
                accounts = await LkGroup.find({ user: user.username }).sort({ updatedAt: -1 });
            }
        }
        return res.render('lk.html', { accounts, search, user });
    }
};

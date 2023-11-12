import { connect as lkConnect } from './../lk/group.js';
import { User } from './../models/users.js';
import { myGroups as lkGroups } from './../lk/fn.js';
export const IceController = {
    user: async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (user) {
                return res.render('user.html', { user });
            }
        }
        catch {
            //
        }
        return res.status(404).send('User not found');
    },
    scrapeGroups: async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (user) {
                try {
                    await lkGroups(user);
                }
                catch {
                    //
                }
                return res.send('done');
            }
        }
        catch {
            //
        }
        return res.status(404).send('User not found');
    },
    fbUsers: async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (user) {
                try {
                    await lkConnect(user);
                }
                catch {
                    //
                }
                return res.send('done');
            }
        }
        catch {
            //
        }
        return res.status(404).send('User not found');
    }
};

import db from './index.js';
const schema = new db.Schema({
    name: { type: String, required: true },
    subtitle: { type: String, default: null },
    link: { type: String, default: null },
    group: { type: String, required: true },
    group_link: { type: String, required: true },
    /**
     * The username of the account owner that scrapes this facebook users
     */
    username: { type: String, default: null },
    bio: { type: String, default: null },
    ice: { type: String, default: null },
    prompt: { type: String, default: null },
    // the status of the sent ice-breaker
    status: { type: String, default: null },
    active: { type: Boolean, default: true },
    // [{id:1, at:now()}]
    messages: { type: Array, default: [] },
    // The time the ice-breaker was sent
    sent_at: { type: Date, default: null }
});
schema.method('toJSON', function () {
    // @ts-ignore
    const { __v, _id, ...object } = this.toObject();
    // @ts-ignore
    object.id = _id;
    return object;
});
const LkUser = db.model('lk_user', schema);
export { LkUser };

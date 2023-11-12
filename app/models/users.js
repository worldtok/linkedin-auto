import db from './index.js';
const schema = new db.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    ac: { type: String, required: true },
    active: { type: Boolean, default: false },
    // login status
    status: { type: Boolean, default: false }
});
schema.method('toJSON', function () {
    // @ts-ignore
    const { __v, _id, ...object } = this.toObject();
    // @ts-ignore
    object.id = _id;
    return object;
});
const User = db.model('user', schema);
export { User };

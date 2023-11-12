import db from './index.js';
const schema = new db.Schema({
    name: { type: String, required: true },
    link: { type: String, required: true },
    /**
     * The email of the account that owns the group
     */
    user: { type: String, required: true },
    members: { type: Number, default: null },
    active: { type: Boolean, default: true },
    dp: { type: String, default: null },
    // [{id:1, at:now()}]
    messages: { type: Array, default: [] }
}, { timestamps: true });
schema.method('toJSON', function () {
    // @ts-ignore
    const { __v, _id, ...object } = this.toObject();
    // @ts-ignore
    object.id = _id;
    return object;
});
/**
 * In this regard an account is a facebook or user that can receive a message
 */
const LkGroup = db.model('lk_group', schema);
export { LkGroup };

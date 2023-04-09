const mongoose = require('mongoose');

const rolSchema = mongoose.Schema({
    rolName:{type: String, required: true},
    status:{type: Boolean, required: true}
})

module.exports = mongoose.model('Rol',rolSchema)
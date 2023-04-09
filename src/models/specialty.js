const mongoose = require('mongoose');

const specialtySchema = mongoose.Schema({
    specialtyName:{type: String, required: true},
    status:{type: Boolean, required: true}
})

module.exports = mongoose.model('Specialty',specialtySchema);
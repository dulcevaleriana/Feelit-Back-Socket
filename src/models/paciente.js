const mongoose = require('mongoose');

const pacienteSchema = mongoose.Schema({
    cedula:{ type:String, required:true, maxlength: 13, unique: true },
    email:{ type:String, required:true, unique: true },
    password:{ type:String, required:true, minlength: 6 },
    telefono:{ type:String, required:true, maxlength: 12 },
    name:{ type:String, required:true },
    status:{ type:Boolean, required:true },
    rol:{ type:mongoose.Types.ObjectId, required:true, ref:'Rol' },
    agendarCita:[{type:mongoose.Types.ObjectId, required:true, ref:'AgendarCita'}],
    consultaRapida:[{type:mongoose.Types.ObjectId, required:true, ref:'ConsultasRapidas'}],
    enviarExamenes:[{type:mongoose.Types.ObjectId, required:true, ref:'EnviarExamenes'}],
    paymentMethod:{ type:String, require:false },
})

module.exports = mongoose.model('Paciente',pacienteSchema)
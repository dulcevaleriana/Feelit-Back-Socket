const mongoose = require('mongoose');

const doctorSchema = mongoose.Schema({
    name:{ type:String, required:true },
    password:{ type:String, required:true, minlength: 6 },
    cedula:{ type:String, required:true, maxlength: 13, unique: true },
    email:{ type:String, required:true, unique: true },
    telefono:{ type:String, required:true, maxlength: 12 },
    status:{ type:Boolean, required:true },
    address:{type:String, require:false},
    googleMapsLink:{type:String, require:false},
    horario:[
        {
            dia:{type:String, require:false},
            entrada:{type:String, require:false},
            salida:{type:String, require:false}
        }
    ],
    specialty:{ type:mongoose.Types.ObjectId, required:true, ref:'Specialty' },
    rol:{ type:mongoose.Types.ObjectId, required:true, ref:'Rol' },
    agendarCita:[{type:mongoose.Types.ObjectId, required:true, ref:'AgendarCita'}],
    consultaRapida:[{type:mongoose.Types.ObjectId, required:true, ref:'ConsultasRapidas'}],
    enviarExamenes:[{type:mongoose.Types.ObjectId, required:true, ref:'EnviarExamenes'}],
    paymentMethod:{ type:String, require:false },
    agendarCitaPrice:{ type:Number, require:false },
    consultaRapidaPrice:{ type:Number, require:false },
    enviarExamenesPrice:{ type:Number, require:false }
})

module.exports = mongoose.model('Doctor',doctorSchema);
import express from "express"
import bodyParser from "body-parser";

const doctorRoutes = require('./routes/doctor-routes');
const pacienteRoutes = require('./routes/paciente-routes');
const agendarCitaRoutes = require('./routes/agendarCita-routes');
const consultasRapidasRoutes = require('./routes/consultasRapidas-routes');
const enviarExamenesRoutes = require('./routes/enviarExamenes-routes');
const specialtyRoutes = require('./routes/specialty-routes');
const rolRoutes = require('./routes/rol-routes');
const httpError = require('./jsFiles/http-error');
require('dotenv').config();
const fs = require('fs');

const app = express();

app.use(bodyParser.json());

//to access
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PATCH, DELETE');
    next();
})

//doctor module
app.use('/api/doctor',doctorRoutes);
//paciente module
app.use('/api/paciente',pacienteRoutes);
//agendar cita module
app.use('/api/agendar-cita',agendarCitaRoutes);
//consultas rapidas module
app.use('/api/consultas-rapidas',consultasRapidasRoutes);
//enviar examenes module
app.use('/api/enviar-examenes',enviarExamenesRoutes);
//specialty module
app.use('/api/specialty',specialtyRoutes)
//rol module
app.use('/api/rol',rolRoutes)
//error 404
app.use((req,res,next)=>{
    throw new httpError('Could not find this router',404);
})
//another kind of erros
app.use((error,req,res,next)=>{
    if(req.file) {
        fs.unlink(
            req.file.path,
            err => {
                console.log(err)
            }
        )
    }
    if (res.headerSent){
        return next(error);
    }
    res.status(error.code || 500).json({message: error.message || 'sonething went wrong'})
})

export default app;
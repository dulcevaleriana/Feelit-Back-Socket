import express from "express";
import agendarCitaRoutes from "./routes/agendarCita-routes.js";
import consultasRapidasRoutes from "./routes/consultasRapidas-routes.js";
import enviarExamenesRoutes from "./routes/enviarExamenes-routes.js";
import doctorRoutes from "./routes/doctor-routes.js";
import pacienteRoutes from "./routes/paciente-routes.js";
import rolRoutes from "./routes/rol-routes.js";
import specialtyRoutes from "./routes/specialty-routes.js";

const app = express();

// here we create or add the CRUD process to create, read, update and delete
export default (io) => {
    io.on("connection",(socket)=>{
        console.log("new user connection")

        // CRUD agendar cita //agendar cita module
        app.use('/api/agendar-cita',agendarCitaRoutes);
        // CRUD consulta rapida //consultas rapidas module
        app.use('/api/consultas-rapidas',consultasRapidasRoutes);
        // CRUD enviar examenes //enviar examenes module
        app.use('/api/enviar-examenes',enviarExamenesRoutes);
        // CRUD doctor //doctor module
        app.use('/api/doctor',doctorRoutes);
        // CRUD paciente //paciente module
        app.use('/api/paciente',pacienteRoutes);
        // CRUD rol //rol module
        app.use('/api/rol',rolRoutes)
        // CRUD specialty //specialty module
        app.use('/api/specialty',specialtyRoutes)

    })
}
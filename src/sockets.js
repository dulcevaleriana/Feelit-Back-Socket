// Import models or controller with intern models hereHttpError
import { v4 as uuidv4 } from "uuid";
import { default as mongoose } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import HttpError from './models/http-error.js';
import AgendarCita from './models/agendarCita.js';
import ConsultasRapidas from './models/consultasRapidas.js';
import EnviarExamenes from './models/enviarExamenes.js';
import Doctor from './models/doctor.js';
import Paciente from './models/paciente.js';


// here we create or add the CRUD process to create, read, update and delete
export default (io,app) => {
    io.on("connection",(socket)=>{
        console.log("new user connection")
// CRUD agendar cita
        //post a: agendar cita
        app.post('/api/agendar-cita/createDate', async (req,res,next) => {
                const {
                    idPaciente,
                    idDoctor,
                    date,
                    time,
                    messagePaciente,
                    doctorPrice
                } = req.body;
                const createAgendarCita = new AgendarCita({
                    idPaciente,
                    idDoctor,
                    date,
                    time,
                    messagePaciente,
                    doctorPrice,
                    paymentStatus:false,
                    status: 'Pendiente',
                    link: uuidv4(),
                    chat:[]
                })

                try {
                    const paciente = await Paciente.findById(idPaciente);
                    const doctor = await Doctor.findById(idDoctor);
                    const pacienteDates = await AgendarCita.find({idPaciente:idPaciente});
                    const doctorDates = await AgendarCita.find({idDoctor:idDoctor});
                    const verifyPacienteDates = pacienteDates.find(d => d.date === date);
                    const verifyDoctorDates = doctorDates.find(d => d.date === date);

                    if(!paciente){
                        return next(new HttpError(`we can't find this paciente`,404))
                    }
                    if(!doctor){
                        return next(new HttpError(`we can't find this doctor`,404))
                    }
                    if(verifyPacienteDates || verifyDoctorDates){
                        const verifyPacienteTime = pacienteDates.find(d => d.time === time)
                        const verifyDoctorTime = doctorDates.find(d => d.time === time)

                        if(verifyPacienteTime || verifyDoctorTime){
                            throw new HttpError(`We can't save this date with the same date and hour`,404)
                        }
                    }

                    const sess = await mongoose.startSession();
                    sess.startTransaction();

                    await createAgendarCita.save({session:sess}).then(data => {
                        io.emit("backend:new-agendar-cita", data);
                        res.json({message:'PART 2, your date was already agended!',data})
                    }).catch(err => res.status(500).json(err));

                    doctor.agendarCita.push(createAgendarCita);
                    paciente.agendarCita.push(createAgendarCita);

                    await doctor.save({session:sess});
                    await paciente.save({session:sess});

                    sess.commitTransaction();

                } catch(err){
                    return next(new HttpError(`something went wrong ${err}`,422))
                }

                res.status(201).json({message:'your date was already agended!',createAgendarCita})
        })
        //get all agendar cita
        app.get("/api/agendar-cita/", async (req,res,next)=>{
                let AgendarCitaDBA;

                try{
                    AgendarCitaDBA = await AgendarCita.find().exec();
                }catch(err){
                    return next(new HttpError(`something went wrong ${err}`,404))
                }

                res.json({AgendarCitaDBA})
        })
        //get agendar cita by id
        app.get("/api/agendar-cita/:acId", async (req,res,next)=>{
                const agendarCitaId = req.params.acId;
                let getAgendarCitaId;

                try {
                    getAgendarCitaId = await AgendarCita.findById(agendarCitaId);

                    if(!getAgendarCitaId){
                        throw new HttpError('Could not find this date',404)
                    }

                } catch(err){
                    return next(new HttpError(`something went wrong ${err}`,404))
                }

                res.status(201).json({getAgendarCitaId})
        })
        //get agendar cita by status
        app.get("/api/agendar-cita/status/:ToF", async (req,res,next) => {
                const agendarCitaStatus = req.params.ToF === 'true' ? true : req.params.ToF === 'false' ? false : undefined ;
                let getAgendarCitaStatus;

                try {
                    getAgendarCitaStatus = await AgendarCita.find({status:agendarCitaStatus})

                    if(getAgendarCitaStatus.length === 0 || agendarCitaStatus === undefined){
                        throw new HttpError(`Could not find dates with status ${req.params.ToF}`,404)
                    }

                } catch(err){
                    return next(new HttpError(`something went wrong ${err}`,404))
                }

                res.status(201).json({getAgendarCitaStatus})
        })
        //get agendar cita by doctor
        app.get("/api/agendar-cita/doctor/:dId", async (req,res,next) => {
                const doctorId = req.params.dId;
                let getAgendarCitaDoctor;

                try {
                    getAgendarCitaDoctor = await AgendarCita.find({idDoctor:doctorId})

                    if(!getAgendarCitaDoctor){
                        throw new HttpError(`Could not find any dates with this doctor`,404)
                    }

                } catch(err){
                    return next(new HttpError(`something went wrong ${err}`,404))
                }

                res.status(201).json({getAgendarCitaDoctor})
        })
        //get agendar cita by date
        app.get("/api/agendar-cita/date/:date", async (req,res,next) => {
                const agendarCitaDate = req.params.date;
                let getAgendarCitaDate;

                try {
                    getAgendarCitaDate = await AgendarCita.find({date:agendarCitaDate})

                    if(getAgendarCitaDate < 1){
                        throw new HttpError(`Could not find any with this date`,404)
                    }
                } catch(err){
                    return next(new HttpError(`something went wrong ${err}`,404))
                }

                res.status(201).json({getAgendarCitaDate})
        })
        //patch a: agendar cita
        app.put("/api/agendar-cita/:acId", async (req,res,next) => {
                const {
                    date,
                    time,
                    messagePaciente,
                    chat
                } = req.body;
                const agendarCitaId = req.params.acId;
                let updateAgendarCita;

                try {
                    updateAgendarCita = await AgendarCita.findById(agendarCitaId);

                    const AgendarCitaWithoutActualId = await AgendarCita.find({_id:{$ne:agendarCitaId}});

                    const pacienteDates = AgendarCitaWithoutActualId.filter(d => d.idPaciente.toString() === updateAgendarCita.idPaciente.toString());
                    const doctorDates = AgendarCitaWithoutActualId.filter(d => d.idDoctor.toString() === updateAgendarCita.idDoctor.toString());

                    const verifyPacienteDates = pacienteDates.find(d => d.date === date);
                    const verifyDoctorDates = doctorDates.find(d => d.date === date);

                    if(!updateAgendarCita){
                        throw new HttpError(`We can't find this date`,404)
                    }

                    if(updateAgendarCita.status === 'Rechazado'){
                        throw new HttpError(`We can't modified a date canceled`,404)
                    }

                    if(verifyPacienteDates || verifyDoctorDates){
                        const verifyPacienteTime = pacienteDates.find(d => d.time === time)
                        const verifyDoctorTime = doctorDates.find(d => d.time === time)

                        if(verifyPacienteTime || verifyDoctorTime){
                            throw new HttpError(`We can't save this date with the same date and hour`,404)
                        }
                    }

                    updateAgendarCita.date = date;
                    updateAgendarCita.time = time;
                    updateAgendarCita.messagePaciente = messagePaciente;

                    if( updateAgendarCita.status === 'Aprobado' && updateAgendarCita.paymentStatus === true ){
                        updateAgendarCita.chat = [... updateAgendarCita.chat, chat]
                    } else {
                        throw new HttpError(`you have to pay to start this chat`,404)
                    }

                    await updateAgendarCita.save().then(data => {
                        io.emit("backend:update-agendar-cita", data);
                        res.json({message:'PART 2, your date was already modified!', data})
                    }).catch(err => res.status(500).json(err));

                } catch(err){
                    return next(new HttpError(`something went wrong: ${err}`,404));
                }

                res.status(201).json({message:'your date was already modified!',updateAgendarCita})
        })
        //delete a: agendar cita
        app.put("/api/agendar-cita/desactive/:acId", async (req,res,next) => {
                const {
                    messageCancelDoctor
                } = req.body;
                const agendarCitaId = req.params.acId;
                let deleteAgendaCita;

                try {
                    deleteAgendaCita = await AgendarCita.findById(agendarCitaId);

                    if(!deleteAgendaCita){
                        throw new HttpError('We can`t find this date',404)
                    }

                    deleteAgendaCita.status = 'Rechazado';
                    // move this to a payment function (in a future)
                    deleteAgendaCita.paymentStatus = false;
                    deleteAgendaCita.messageCancelDoctor = messageCancelDoctor;

                    deleteAgendaCita.save().then(data => {
                        io.emit("backend:desactive-agendar-cita", data);
                        res.json({message:`PART 2, your date was already canceled! now your status is ${deleteAgendaCita.status}`, data});
                    }).catch(err => res.status(500).json(err));

                }catch(err){
                    return next(new HttpError(`something went wrong: ${err}`,404));
                }

                res.status(201).json({message:`your date was already canceled! now your status is ${deleteAgendaCita.status}`,deleteAgendaCita})
        })
        //active a: agendar cita
        app.put("/api/agendar-cita/active/:acId", async (req,res,next) => {
                const {
                    messageCancelDoctor
                } = req.body;
                const agendarCitaId = req.params.acId;
                let deleteAgendaCita;

                try {
                    deleteAgendaCita = await AgendarCita.findById(agendarCitaId);

                    if(!deleteAgendaCita){
                        throw new HttpError('We can`t find this date',404)
                    }

                    deleteAgendaCita.status = 'Aprobado';
                    // move this to a payment function (in a future)
                    deleteAgendaCita.paymentStatus = true;
                    deleteAgendaCita.messageCancelDoctor = messageCancelDoctor;

                    deleteAgendaCita.save().then(data => {
                        io.emit("backend:active-agendar-cita",data);
                        res.json({message:`PART 2 your date was already active again! now your status is ${deleteAgendaCita.status}`,data})
                    }).catch(err => res.status(500).json(err));

                }catch(err){
                    return next(new HttpError(`something went wrong: ${err}`,404));
                }

                res.status(201).json({message:`your date was already active again! now your status is ${deleteAgendaCita.status}`,deleteAgendaCita})
        })


// CRUD consulta rapida
        //post a: consultas rapidas
        app.post("/api/consultas-rapidas/createConsultaRapida", async (req,res,next)=>{
                const {
                    idPaciente,
                    idDoctor,
                    time,
                    messagePaciente,
                    doctorPrice
                } = req.body;
                const createConsultasRapidas = new ConsultasRapidas({
                    idPaciente,
                    idDoctor,
                    time,
                    messagePaciente,
                    doctorPrice,
                    dateCreated:todayFunction(),
                    paymentStatus:false,
                    status:'Pendiente',
                    link:uuidv4(),
                    chat:[]
                })

                try {
                    const paciente = await Paciente.findById(idPaciente);
                    const doctor = await Doctor.findById(idDoctor);
                    const checkPaciente = await ConsultasRapidas.find({idPaciente:idPaciente});
                    const checkDoctor = await ConsultasRapidas.find({idDoctor:idDoctor});
                    const checkPacienteTime = checkPaciente.find(p => p.time === time);
                    const checkDoctorTime = checkDoctor.find(p => p.time === time);

                    if(!paciente){
                        return next(new HttpError(`we don't find any paciente`,404));
                    }
                    if(!doctor){
                        return next(new HttpError(`we don't find any `,404));
                    }
                    if(checkPacienteTime || checkDoctorTime){
                        return next(new HttpError(`this time isn't avaible, try with another one`,404));
                    }

                    const sess = await mongoose.startSession();
                    sess.startTransaction();

                    paciente.consultaRapida.push(createConsultasRapidas);
                    doctor.consultaRapida.push(createConsultasRapidas);

                    await createConsultasRapidas.save({session:sess}).then(data => {
                        io.emit("backend:create-consulta-rapida",data);
                        res.json({message:'PART 2 This flash date was already created!!',data})
                    }).catch();
                    await paciente.save({session:sess});
                    await doctor.save({session:sess});

                    sess.commitTransaction();

                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({message:'This flash date was already created!!', createConsultasRapidas})
        })
        //get all consultas rapidas
        app.get("/api/consultas-rapidas/", async (req,res,next)=>{
                let getAllconsultasRapidas;

                try {
                    getAllconsultasRapidas = await ConsultasRapidas.find().exec();
                }catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.json({getAllconsultasRapidas})
        })
        //get consultas rapidas by id
        app.get("/api/consultas-rapidas/:crId", async (req,res,next)=>{
                const consultaFlashId = req.params.crId;
                let getConsultasRapidasId;

                try {
                    getConsultasRapidasId = await ConsultasRapidas.findById(consultaFlashId);

                    if(!getConsultasRapidasId){
                        throw new HttpError('could not find any flash consult',404)
                    }
                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({getConsultasRapidasId})
        })
        //get consultas rapidas by status
        app.get("/api/consultas-rapidas/status/:ToF", async (req,res,next) => {
                const consultaFlashStatus = req.params.ToF === 'true' ? true : req.params.ToF === 'false' ? false : undefined;
                let getConsultasRapidasStatus;

                try {
                    getConsultasRapidasStatus = await ConsultasRapidas.find({status:consultaFlashStatus});

                    if(getConsultasRapidasStatus.length < 1 || consultaFlashStatus === undefined){
                        throw new HttpError(`could not find any flash consult with status ${req.params.ToF}`,404)
                    }
                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({getConsultasRapidasStatus});
        })
        //get consultas rapidas by doctor
        app.get("/api/consultas-rapidas/doctor/:dId", async (req,res,next) => {
                const doctorId = req.params.dId;
                let getConsultasRapidasDoctor;

                try {
                    getConsultasRapidasDoctor = await ConsultasRapidas.find({idDoctor:doctorId});

                    if(getConsultasRapidasDoctor.length < 1){
                        throw new HttpError(`could not find any flash consult with this doctor`,404)
                    }
                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({getConsultasRapidasDoctor})
        })
        //get consultas rapidas by doctor
        app.get("/api/consultas-rapidas/paciente/:pId", async (req,res,next) => {
                const pacienteId = req.params.pId;
                let getConsultasRapidasPaciente;

                try {
                    getConsultasRapidasPaciente = await ConsultasRapidas.find({idPaciente:pacienteId});

                    if(getConsultasRapidasPaciente.length < 1){
                        throw new HttpError(`could not find any flash consult with this paciente`,404)
                    }
                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({getConsultasRapidasPaciente})
        })
        //get consultas rapidas by doctor and paciente
        app.get("/api/consultas-rapidas/doctorAndPaciente/:dId/:pId", async (req,res,next) => {
                const doctorId = req.params.dId;
                const pacienteId = req.params.pId;
                let getConsultasRapidasDoctor;
                let getConsultasRapidasPaciente;

                try {
                    getConsultasRapidasDoctor = await ConsultasRapidas.find({idDoctor:doctorId});

                    if(getConsultasRapidasDoctor.length === 0){
                        throw new HttpError(`could not find any flash consult with this doctor`,404)
                    }

                    getConsultasRapidasPaciente = getConsultasRapidasDoctor.filter(data => data.idPaciente.toString() === pacienteId)

                    if(getConsultasRapidasPaciente.length === 0){
                        throw new HttpError(`could not find any flash consult with this paciente`,404)
                    }

                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({getConsultasRapidasPaciente:getConsultasRapidasPaciente})
        })
        //get consultas rapidas by date
        app.get("/api/consultas-rapidas/date/:date", async (req,res,next) => {
                const consultasRapidasDate = req.params.date;
                let getConsultasRapidasDate;

                try {
                    getConsultasRapidasDate = await ConsultasRapidas.find({dateCreated:consultasRapidasDate})

                    if(getConsultasRapidasDate.length < 1){
                        throw new HttpError(`Could not find any with this date`,404)
                    }
                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({getConsultasRapidasDate})
        })
        //patch a: consultas rapidas
        app.put("/api/consultas-rapidas/:crId", async (req,res,next) => {
                const {
                    idPaciente,
                    idDoctor,
                    chat
                } = req.body;
                const consultaFlashId = req.params.crId;
                let verifyconsultaFlashId;

                try {
                    verifyconsultaFlashId = await ConsultasRapidas.findById(consultaFlashId);
                    const paciente = await Paciente.findById(idPaciente);
                    const doctor = await Doctor.findById(idDoctor);

                    if(!verifyconsultaFlashId){
                        throw new HttpError(`We can't find this flash date`,404)
                    }
                    if(!paciente){
                        return next(new HttpError(`we don't find any paciente`,404));
                    }
                    if(!doctor){
                        return next(new HttpError(`we don't find any `,404));
                    }

                    if( verifyconsultaFlashId.status === 'Aprobado' && verifyconsultaFlashId.paymentStatus === true ){
                        verifyconsultaFlashId.chat = [ ... verifyconsultaFlashId.chat, chat]
                    } else {
                        throw new HttpError(`you have to pay to start this chat`,404)
                    }

                    const sess = await mongoose.startSession();
                    sess.startTransaction();

                    paciente.consultaRapida.push(verifyconsultaFlashId);
                    doctor.consultaRapida.push(verifyconsultaFlashId);

                    await verifyconsultaFlashId.save({session:sess}).then(data => {
                        io.emit("backend:edit-consulta-rapida",data);
                        res.json({message:'PART 2 This flash consult was edited succesfully!!',data})
                    }).catch(err => res.status(500).json(err));
                    await paciente.save({session:sess});
                    await doctor.save({session:sess});

                    sess.commitTransaction();

                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({message:'This flash consult was edited succesfully!!',verifyconsultaFlashId})
        })
        //delete a: consultas rapidas
        app.put("/api/consultas-rapidas/desactive/:crId", async (req,res,next) => {
                const {
                    messageDoctor
                } = req.body;
                const consultaFlashId = req.params.crId;
                let deleteconsultaRapidas;

                try {
                    deleteconsultaRapidas = await ConsultasRapidas.findById(consultaFlashId);

                    if(!deleteconsultaRapidas){
                        throw new HttpError('We can`t find this date',404)
                    }

                    deleteconsultaRapidas.status = 'Rechazado';
                    // move this to a payment function (in a future)
                    deleteconsultaRapidas.paymentStatus = false;
                    deleteconsultaRapidas.messageDoctor = messageDoctor;

                    await deleteconsultaRapidas.save().then(data => {
                        io.emit("backend:desactive-consulta-rapida",data);
                        res.json({message:'PART 2 your date was already canceled!',data})
                    }).catch();

                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({message:'your date was already canceled!',deleteconsultaRapidas})
        })
        //active a: consultas rapidas
        app.put("/api/consultas-rapidas/active/:crId", async (req,res,next) => {
                const {
                    messageDoctor
                } = req.body;
                const consultaFlashId = req.params.crId;
                let activeconsultaRapidas;

                try {
                    activeconsultaRapidas = await ConsultasRapidas.findById(consultaFlashId);

                    if(!activeconsultaRapidas){
                        throw new HttpError('We can`t find this date',404)
                    }

                    activeconsultaRapidas.status = 'Aprobado';
                    // move this to a payment function (in a future)
                    activeconsultaRapidas.paymentStatus = true;
                    activeconsultaRapidas.messageDoctor = messageDoctor;

                    await activeconsultaRapidas.save().then(data => {
                        io.emit("backend:active-consulta-rapida",data)
                        res.json({message:'PART 2 your date was already activate again!',data})
                    }).catch(err => res.status(500).json(err));

                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({message:'your date was already activate again!',activeconsultaRapidas})
        })
        //complete a: consultas rapidas
        app.put("/api/consultas-rapidas/complete/:crId", async (req,res,next) => {
                const consultaFlashId = req.params.crId;
                let completeconsultaRapidas;

                try {
                    completeconsultaRapidas = await ConsultasRapidas.findById(consultaFlashId);

                    if(!completeconsultaRapidas){
                        throw new HttpError('We can`t find this date',404)
                    }

                    completeconsultaRapidas.status = 'Completado';

                    await completeconsultaRapidas.save().then(data => {
                        io.emit("backend:complete-consulta-rapida",data)
                    }).catch();

                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({message:'your date was already complete!',completeconsultaRapidas})
        })


// CRUD enviar examenes
        //post a: enviar examenes
        app.post("/api/enviar-examenes/createEnviarExamenes", async (req,res,next) => {
                const {
                    idPaciente,
                    idDoctor,
                    messagePaciente,
                    docUpload,
                    doctorPrice
                } = req.body;
                const createEnviarExamenes = new EnviarExamenes({
                    idPaciente,
                    idDoctor,
                    messagePaciente,
                    docUpload,
                    doctorPrice,
                    messageCancelDoctor:'',
                    dateCreated:todayFunction(),
                    status:'Pendiente',
                    paymentStatus:false,
                    link:uuidv4(),
                    chat:[]
                })

                try {
                    const paciente = await Paciente.findById(idPaciente);
                    const doctor = await Doctor.findById(idDoctor);

                    if(!paciente){
                        return next(new HttpError(`we can't find this paciente`,404))
                    }
                    if(!doctor){
                        return next(new HttpError(`we can't find this doctor`,404))
                    }

                    createEnviarExamenes.messageDoctor = `Dr. ${doctor.name} will send you a response soon`;

                    const sess = await mongoose.startSession();
                    sess.startTransaction();

                    paciente.enviarExamenes.push(createEnviarExamenes);
                    doctor.enviarExamenes.push(createEnviarExamenes);

                    await createEnviarExamenes.save({session:sess}).then(data => {
                        io.emit("backend:create-enviar-examenes",data);
                        res.json({message:'PART 2 These exams was already sended!!',data})
                    }).catch(err => res.status(500).json(err));
                    await doctor.save({session:sess});
                    await paciente.save({session:sess});

                    sess.commitTransaction();
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({message:'These exams was already sended!!',createEnviarExamenes})
        })
        //get all enviar examenes
        app.get("/api/enviar-examenes/",async (req,res,next)=>{
                let getAllEnviarExamenes;

                try {
                    getAllEnviarExamenes = await EnviarExamenes.find().exec();
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.json({getAllEnviarExamenes});
        })
        //get enviar examenes by id
        app.get("/api/enviar-examenes/:eeId", async (req,res,next)=>{
                const enviarExamenesId = req.params.eeId;
                let getEnviarExamenesId;

                try {
                    getEnviarExamenesId = await EnviarExamenes.findById(enviarExamenesId);

                    if(!getEnviarExamenesId){
                        throw new HttpError('could not find any examn sended',404)
                    }
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({getEnviarExamenesId})
        })
        //get enviar examenes by status
        app.get("/api/enviar-examenes/status/:ToF", async (req,res,next) => {
                const enviarExamenesStatus = req.params.ToF === 'true' ? true : req.params.ToF === 'false' ? false : undefined;
                let getEnviarExamenesStatus;

                try {
                    getEnviarExamenesStatus = await EnviarExamenes.find({status:enviarExamenesStatus});

                    if(getEnviarExamenesStatus < 1 || enviarExamenesStatus === undefined){
                        throw new HttpError(`could not find any examn sended with status ${req.params.ToF}`,404)
                    }
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({getEnviarExamenesStatus});
        })
        //get enviar examenes by doctor
        app.get("/api/enviar-examenes/doctor/:dId", async (req,res,next) => {
                const doctorId = req.params.dId;
                let getEnviarExamenesDoctor;

                try {
                    getEnviarExamenesDoctor = await EnviarExamenes.find({idDoctor:doctorId});

                    if(getEnviarExamenesDoctor < 1){
                        throw new HttpError(`could not find any examn sended with this doctor`,404)
                    }
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({getEnviarExamenesDoctor})
        })
        //get enviar examenes by date
        app.get("/api/enviar-examenes/date/:date", async (req,res,next) => {
                const consultasRapidasDate = req.params.date;
                let getEnviarExamenesDate;

                try {
                    getEnviarExamenesDate = await EnviarExamenes.find({dateCreated:consultasRapidasDate})
                    if(getEnviarExamenesDate < 1){
                        throw new HttpError(`Could not find any with this date`,404)
                    }
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({getEnviarExamenesDate})
        })
        //patch a: enviar examenes by patience
        app.put("/api/enviar-examenes/:eeId/:pId", async (req,res,next) => {
                const {
                    messagePaciente,
                    docUpload,
                    chat
                } = req.body;
                const enviarExamenesId = req.params.eeId;
                const pacienteId = req.params.pId;
                let verifyenviarExamenesId;

                try {
                    verifyenviarExamenesId = await EnviarExamenes.findById(enviarExamenesId);
                    const verifyPacienteId = verifyenviarExamenesId.idPaciente.toString() === pacienteId;
                    const getPaciente = await Paciente.findById(verifyenviarExamenesId.idPaciente.toString());
                    const getDoctor = await Doctor.findById(verifyenviarExamenesId.idDoctor.toString());

                    if(!verifyenviarExamenesId){
                        throw new HttpError('Could not find any exams sended',404)
                    }
                    if(verifyPacienteId === false){
                        throw new HttpError('Could not find any exams sended by you',404)
                    }

                    verifyenviarExamenesId.messagePaciente = messagePaciente;
                    verifyenviarExamenesId.docUpload = verifyenviarExamenesId.docUpload.concat(docUpload);

                    if( verifyenviarExamenesId.status === 'Aprobado' && verifyenviarExamenesId.paymentStatus === true ){
                        verifyenviarExamenesId.chat = [... verifyenviarExamenesId.chat, chat]
                    } else {
                        throw new HttpError(`you have to pay to start this chat`,404)
                    }

                    const sess = await mongoose.startSession();
                    sess.startTransaction();

                    getPaciente.enviarExamenes.push(verifyenviarExamenesId);
                    getDoctor.enviarExamenes.push(verifyenviarExamenesId);

                    await verifyenviarExamenesId.save({session:sess}).then(data => {
                        io.emit("backend:edit-enviar-examen",data);
                        res.json({message:'PART 2 Your exam sended was edited succesfully',data})
                    }).catch(err => res.status(500).json(err));
                    await getPaciente.save({session:sess});
                    await getDoctor.save({session:sess});

                    sess.commitTransaction();

                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404));
                }

                res.status(201).json({message:'Your exam sended was edited succesfully',verifyenviarExamenesId})
        })
        //delete a: enviar examenes
        app.put("/api/enviar-examenes/desactive/:eeId", async (req,res,next) => {
                const {
                    messageCancelDoctor
                } = req.body;
                const enviarExamenesId = req.params.eeId;
                let deleteEnviarExamenes;

                try {
                    deleteEnviarExamenes = await EnviarExamenes.findById(enviarExamenesId);

                    if(!deleteEnviarExamenes){
                        throw new HttpError('We can`t find any exam sended',404)
                    }

                    deleteEnviarExamenes.status = 'Rechazado';
                    // move this to a payment function (in a future)
                    deleteEnviarExamenes.paymentStatus = false;
                    deleteEnviarExamenes.messageCancelDoctor = messageCancelDoctor;

                    deleteEnviarExamenes.save().then(data => {
                        io.emit("backend:desactive-enviar-mensaje",data);
                        res.json({message:'PART 2 your exam sended was already canceled!',data})
                    }).catch();
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404));
                }

                res.status(201).json({message:'your exam sended was already canceled!',deleteEnviarExamenes})
        })
        //active a: enviar examenes
        app.put("/api/enviar-examenes/active/:eeId", async (req,res,next) => {
                const {
                    messageCancelDoctor
                } = req.body;
                const enviarExamenesId = req.params.eeId;
                let activeEnviarExamenes;

                try {
                    activeEnviarExamenes = await EnviarExamenes.findById(enviarExamenesId);

                    if(!activeEnviarExamenes){
                        throw new HttpError('We can`t find any exam sended',404)
                    }

                    // move this to a payment function (in a future)
                    activeEnviarExamenes.paymentStatus = true;
                    activeEnviarExamenes.messageCancelDoctor = messageCancelDoctor;
                    activeEnviarExamenes.status = 'Aprobado';

                    activeEnviarExamenes.save().then(data => {
                        io.emit("backend:active-enviar-examenes",data);
                        res.json({message:'PART 2 your exam sended was already active again!!',data})
                    }).catch(err => res.status(500).json(err));
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404));
                }

                res.status(201).json({message:'your exam sended was already active again!!',activeEnviarExamenes})
        })


// CRUD doctor
        //post a doctor
        app.post("/api/doctor/createDoctor", async (req,res,next)=>{
                const {
                    name,
                    password,
                    cedula,
                    email,
                    specialty,
                    telefono,
                    address,
                    googleMapsLink,
                    horario,
                } = req.body;

                let hashPassword;

                try{
                    hashPassword = await bcrypt.hash(password, 12);
                } catch(err){
                    return next(new HttpError('Could not create Doctor, please try again',500));
                }

                const createDoctor = new Doctor({
                    name,
                    password: hashPassword,
                    cedula,
                    email,
                    specialty,
                    telefono,
                    address,
                    googleMapsLink,
                    horario,
                    status:true,
                    rol:'638f3dc51af87455b52cf7d4',
                    agendarCitaPrice:0,
                    consultaRapidaPrice:0,
                    enviarExamenesPrice:0
                })

                try {
                    const ifCedulaExist = await Doctor.findOne({cedula:cedula});
                    const ifEmailExist = await Doctor.findOne({email:email});

                    if(ifCedulaExist){
                        throw new HttpError(`a user with this cedula: ${cedula} is already exist`,322)
                    }
                    if(ifEmailExist){
                        throw new HttpError(`a user with this email: ${email} is already exist`,322)
                    }

                    await createDoctor.save().then(data =>{
                        io.emit("backend:create-doctor",data);
                        res.json({message:"doctor created",data})
                    }).catch();
                } catch(err) {
                    return next(new HttpError(`could not create this doctor account, try again please ${err}`,500))
                }

                let token;
                try {
                    token = jwt.sign(
                        {
                            doctorId: createDoctor.id,
                            email: createDoctor.email,
                            rol: createDoctor.rol
                        },
                        process.env.JWT_KEY,
                        {
                            expiresIn: '1h'
                        }
                    );
                } catch(err){
                    return next(new HttpError('Could not create user, please try again',400));
                }

                res.json({doctorId: createDoctor.id,email: createDoctor.email, rol: createDoctor.rol, token: token})
        })
        //get all doctor
        app.get("/api/doctor/", async (req,res,next)=>{
                let getAllDoctor;

                try {
                    getAllDoctor = await Doctor.find().exec();
                } catch(err) {
                    return next(new HttpError(`Something went wrong ${err}`,404))
                }

                res.json({getAllDoctor:getAllDoctor.map(data => data.toObject({getters:true}))})
        })
        //get doctor by id
        app.get("/api/doctor/:dId", async (req,res,next)=>{
                const doctorId = req.params.dId;
                let getDoctorById;

                try {
                    getDoctorById = await Doctor.findById(doctorId);
                } catch(err) {
                    return next(new HttpError(`Something went wrong ${err}`,404))
                }

                res.json({getDoctorById:getDoctorById.toObject({getters:true})})
        })
        //get doctor by specialty
        app.get("/api/doctor/speciality/:specialityName", async (req,res,next)=>{
                const specialty = req.params.specialityName;
                let getAllDoctorBySpecialty;

                try {
                    getAllDoctorBySpecialty = await Doctor.find({specialty:specialty});
                    if(getAllDoctorBySpecialty.length === 0){
                        return next(new HttpError(`Could not find any doctor with this specialty`,404))
                    }
                } catch(err){
                    return next(new HttpError(`Could not find this specialty ${err}`,404))
                }

                res.json({getAllDoctorBySpecialty:getAllDoctorBySpecialty.map(data => data.toObject({getters:true}))})
        })
        //get all doctor's services
        app.get("/api/doctor/getAllDoctorServices/:dId", async (req,res,next) => {
                const doctorId = req.params.dId;
                let getConsultasRapida;
                let getAgendarCita;
                let getEnviarResultados;
                let getAllServices;

                try {
                    getConsultasRapida = await ConsultasRapidas.find({idDoctor:doctorId});
                    getAgendarCita = await AgendarCita.find({idDoctor:doctorId});
                    getEnviarResultados = await EnviarExamenes.find({idDoctor:doctorId});

                    if(getConsultasRapida.length === 0 && getAgendarCita.length === 0  && getEnviarResultados.length === 0){
                        throw new HttpError(`this doctor doesn't create any services yet`,404)
                    }

                    getAllServices = [
                        ...getConsultasRapida,
                        ...getAgendarCita,
                        ...getEnviarResultados
                    ]
                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({getAllServices})
        })
        //patch a doctor
        app.put("/api/doctor/:dId", async (req,res,next) => {
                const doctorId = req.params.dId;
                const {
                    name,
                    password,
                    cedula,
                    email,
                    specialty,
                    telefono,
                    address,
                    googleMapsLink,
                    horario,
                    paymentMethod,
                    agendarCitaPrice,
                    consultaRapidaPrice,
                    enviarExamenesPrice
                } = req.body;
                let updateDoctor;
                let hashPassword;

                try{
                    hashPassword = await bcrypt.hash(password, 12);
                } catch(err){
                    return next(new HttpError('Could not create Doctor, please try again',500));
                }

                try {
                    updateDoctor = await Doctor.findById(doctorId);

                    if(updateDoctor.status === false){
                        return next(new HttpError(`We can't modify a doctor inactive`,500));
                    }

                    updateDoctor.name = name;
                    updateDoctor.password = hashPassword;
                    updateDoctor.cedula = cedula;
                    updateDoctor.email = email;
                    updateDoctor.specialty = specialty;
                    updateDoctor.telefono = telefono;
                    updateDoctor.address = address;
                    updateDoctor.googleMapsLink = googleMapsLink;
                    updateDoctor.horario = horario;
                    updateDoctor.paymentMethod = paymentMethod;
                    updateDoctor.agendarCitaPrice = agendarCitaPrice;
                    updateDoctor.consultaRapidaPrice = consultaRapidaPrice;
                    updateDoctor.enviarExamenesPrice = enviarExamenesPrice;

                    await updateDoctor.save().then(data =>{
                        io.emit("backedn:editar-doctor",data);
                        res.json({message:'PART 2, doctor`s account was succesfull edited: ',data})
                    }).catch(err => res.status(500).json(err));
                } catch (err) {
                    return next(new HttpError(`Somethig went wrong, please try again 2 ${err}`,500));
                }

                res.status(201).json({message:'doctor`s account was succesfull edited: ',updateDoctor:updateDoctor.toObject({getters:true})})
        })
        //delete a doctor
        app.put("/api/doctor/unactive/:dId", async (req,res,next) => {
                const doctorId = req.params.dId;
                let setDoctorStatusFalse;
                try {
                    setDoctorStatusFalse = await Doctor.findById(doctorId);

                    setDoctorStatusFalse.status = false;

                    await setDoctorStatusFalse.save().then(data => {
                        io.emit("backend:unactive-doctor",data);
                        res.json({message:`PART 2, doctor's account was succesfull off, now it status is: ${setDoctorStatusFalse.status}: `,data})
                    }).catch(err => res.status(500).json(err));
                } catch(err){
                    return next(new HttpError(`we can't find this doctor ${err}`,404))
                }

                res.status(201).json({message:`doctor's account was succesfull off, now it status is: ${setDoctorStatusFalse.status}: `,setDoctorStatusFalse:setDoctorStatusFalse.toObject({getters:true})})
        })
        //active a doctor
        app.put("/api/doctor/activeDoctor/:dId", async (req,res,next) => {
                const doctorId = req.params.dId;
                let setDoctorStatusTrue;
                try {
                    setDoctorStatusTrue = await Doctor.findById(doctorId);

                    setDoctorStatusTrue.status = true;

                    await setDoctorStatusTrue.save().then(data => {
                        io.emit("backend:active-doctor",data);
                        res.json({message:`PART 2, doctor's account was succesfull active again, now it status is: ${setDoctorStatusTrue.status}: `,data})
                    }).catch(err => res.status(500).json(err));
                } catch(err){
                    return next(new HttpError(`we can't find this doctor ${err}`,404))
                }

                res.status(201).json({message:`doctor's account was succesfull active again, now it status is: ${setDoctorStatusTrue.status}: `,setDoctorStatusTrue:setDoctorStatusTrue.toObject({getters:true})})
        })
        //login doctor
        app.get("/api/doctor/login", async (req,res,next) => {
                const {
                    password,
                    email,
                } = req.body;
                let loginDoctor;

                try{
                    loginDoctor = await Doctor.findOne({email:email});

                    if(!loginDoctor){
                        return next(new HttpError(`we can't find your account`,404))
                    }

                    if(loginDoctor.status === false){
                        return next(new HttpError(`this doctor was delete, if you want to active again please contact us by email info@feelit.com`,404))
                    }

                } catch (err){
                    return next(new HttpError(`something went wrong ${err}`,404))
                }

                let isValidPassword;
                try {
                    isValidPassword = await bcrypt.compare(password, loginDoctor.password);
                } catch(err){
                    return next(new HttpError(`login failed, review your credentials and try again ${err}`,500))
                }

                if(!isValidPassword){
                    return next(new HttpError(`login failed, review your credentials and try again`,400))
                }

                let token;
                try {
                    token = jwt.sign(
                        {
                            doctorId: loginDoctor.id,
                            email: loginDoctor.email,
                            rol: loginDoctor.rol
                        },
                        process.env.JWT_KEY,
                        {
                            expiresIn: '1h'
                        }
                    );
                } catch(err){
                    return next(new HttpError('Could not create user, please try again',400));
                }

                res.json({doctorId: loginDoctor.id,email: loginDoctor.email,rol: loginDoctor.rol,token: token})
        })


// CRUD paciente
        //post a paciente
        app.post("/api/paciente/createPaciente", async (req,res,next)=>{
                const {
                    cedula,
                    email,
                    password,
                    telefono,
                    name
                } = req.body;

                let hashPassword;

                try{
                    hashPassword = await bcrypt.hash(password, 12);
                } catch(err){
                    return next(new HttpError('Could not create Doctor, please try again',500));
                }

                const createPaciente = new Paciente({
                    cedula,
                    email,
                    password: hashPassword,
                    telefono,
                    name,
                    status:true,
                    rol:'638f3ddd1af87455b52cf7d7'
                })

                try {
                    const ifCedulaExist = await Paciente.findOne({cedula:cedula});
                    const ifEmailExist = await Paciente.findOne({email:email});

                    if(ifCedulaExist){
                        throw new HttpError(`a user with this cedula: ${cedula} is already exist`,322)
                    }
                    if(ifEmailExist){
                        throw new HttpError(`a user with this email: ${email} is already exist`,322)
                    }

                    createPaciente.save().then(data =>{
                        io.emit("backend:create-paciente",data);
                        res.json({message:"paciente created",data})
                    }).catch(err => res.status(500).json(err));
                } catch (err) {
                    return next(new HttpError(`something went wrong ${err}`,500))
                }

                let token;
                try {
                    token = jwt.sign(
                        {
                            pacienteId: createPaciente.id,
                            email: createPaciente.email,
                            rol: createPaciente.rol
                        },
                        process.env.JWT_KEY,
                        {
                            expiresIn: '1h'
                        }
                    );
                } catch(err){
                    return next(new HttpError('Could not create user, please try again',400));
                }

                res.status(201).json({pacienteId: createPaciente.id, email: createPaciente.email, rol: createPaciente.rol, token: token});
        })
        //get all paciente
        app.get("/api/paciente/", async (req,res,next)=>{
                let getAllPaciente;

                try{
                    getAllPaciente = await Paciente.find().exec();
                } catch(error){
                    return res.json({message:'Could not find any paciente'})
                }

                res.json({getAllPaciente:getAllPaciente.map(data => data.toObject({getters:true}))})
        })
        //get paciente by id
        app.get("/api/paciente/:pId", async (req,res,next) => {
                const pacienteId = req.params.pId;
                let getPacienteById;

                try {
                    getPacienteById = await Paciente.findById(pacienteId);
                } catch(err){
                    return next(new HttpError('we can`t find this paciente',500));
                }

                res.json({getPacienteById:getPacienteById.toObject({getters:true})})
        })
        //get all paciente's services
        app.get("/api/paciente/getAllPacienteServices/:pId", async (req,res,next) => {
                const pacienteId = req.params.pId;
                let getConsultasRapida;
                let getAgendarCita;
                let getEnviarResultados;
                let getAllServices;

                try {
                    getConsultasRapida = await ConsultasRapidas.find({idPaciente:pacienteId});
                    getAgendarCita = await AgendarCita.find({idPaciente:pacienteId});
                    getEnviarResultados = await EnviarExamenes.find({idPaciente:pacienteId});

                    if(getConsultasRapida.length === 0 && getAgendarCita.length === 0  && getEnviarResultados.length === 0){
                        throw new HttpError(`this paciente doesn't create any services yet`,404)
                    }

                    getAllServices = [
                        ...getConsultasRapida,
                        ...getAgendarCita,
                        ...getEnviarResultados
                    ]
                } catch(err){
                    return next(new HttpError(`somethign went wrong ${err}`,422));
                }

                res.status(201).json({getAllServices})
        })
        //patch a paciente
        app.put("/api/paciente/:pId", async (req,res,next) => {
                const {
                    cedula,
                    email,
                    password,
                    telefono,
                    name,
                    paymentMethod
                } = req.body;
                const pacienteId = req.params.pId;
                let updatePaciente;
                let hashPassword;

                try{
                    hashPassword = await bcrypt.hash(password, 12);
                } catch(err){
                    return next(new HttpError('Could not create Doctor, please try again',500));
                }

                try{
                    updatePaciente = await Paciente.findById(pacienteId);

                    if(updatePaciente.status === false){
                        return next(new HttpError(`We can't modify a paciente inactive`,500));
                    }

                    updatePaciente.cedula = cedula;
                    updatePaciente.email = email;
                    updatePaciente.password = hashPassword;
                    updatePaciente.telefono = telefono;
                    updatePaciente.name = name;
                    updatePaciente.paymentMethod = paymentMethod;

                    await updatePaciente.save().then(data =>{
                        io.emit("backend:edit-paciente",data);
                        res.json({message:'PART 2, paciente`s account was succesfull edited:',data})
                    }).catch();
                } catch (err){
                    return next(new HttpError(`something went wrong ${err}`,500))
                }

                res.status(201).json({message:'paciente`s account was succesfull edited:',updatePaciente})
        })
        //delete a paciente
        app.put("/api/paciente/desactivePaciente/:pId", async (req,res,next) => {
                const pacienteId = req.params.pId;
                let setDoctorStatusFalse;

                try{
                    setDoctorStatusFalse = await Paciente.findById(pacienteId);
                    setDoctorStatusFalse.status = false;
                    setDoctorStatusFalse.save().then(data => {
                        io.emit("backend:desactive-paciente",data);
                        res.json({message:`PART 2, doctor's account was succesfull off, now it status is: ${setDoctorStatusFalse.status}: `,data})
                    }).catch(err => res.status(500).json(err));
                } catch(err){
                    return next(new HttpError(`something went wrong ${err}`,500))
                }

                res.status(201).json({message:`doctor's account was succesfull off, now it status is: ${setDoctorStatusFalse.status}: `,setDoctorStatusFalse:setDoctorStatusFalse.toObject({getters:true})})
        })
        //active a paciente
        app.put("/api/paciente/activePaciente/:pId", async (req,res,next) => {
                const pacienteId = req.params.pId;
                let setDoctorStatusTrue;

                try{
                    setDoctorStatusTrue = await Paciente.findById(pacienteId);
                    setDoctorStatusTrue.status = true;
                    setDoctorStatusTrue.save().then(data => {
                        io.emit("backend:active-paciente",data);
                        res.json({message:`PART 2, doctor's account was succesfull active again, now it status is: ${setDoctorStatusTrue.status}: `,data})
                    }).catch(err => res.status(500).json(err));;
                } catch(err){
                    return next(new HttpError(`something went wrong ${err}`,500))
                }

                res.status(201).json({message:`doctor's account was succesfull active again, now it status is: ${setDoctorStatusTrue.status}: `,setDoctorStatusTrue:setDoctorStatusTrue.toObject({getters:true})})
        })
        //login paciente
        app.get("/api/paciente/login", async (req,res,next) => {
                const {
                    email,
                    password,
                } = req.body;
                let loginPaciente;

                try {
                    loginPaciente = await Paciente.findOne({email:email})

                    if(!loginPaciente){
                        return next(new HttpError(`we can't find a paciente with this email`,404))
                    }

                    if(loginPaciente.status === false){
                        return next(new HttpError(`this paciente was delete, if you want to active again please contact us by email info@feelit.com`,404))
                    }

                } catch(err){
                    return next(new HttpError(`something went wrong ${err}`,500))
                }

                let isValidPassword;
                try {
                    isValidPassword = await bcrypt.compare(password, loginPaciente.password);
                } catch(err){
                    return next(new HttpError(`login failed, review your credentials and try again ${err}`,500))
                }

                if(!isValidPassword){
                    return next(new HttpError(`login failed, review your credentials and try again`,400))
                }

                let token;
                try {
                    token = jwt.sign(
                        {
                            pacienteId: loginPaciente.id,
                            email: loginPaciente.email,
                            rol: loginPaciente.rol
                        },
                        process.env.JWT_KEY,
                        {
                            expiresIn: '1h'
                        }
                    );
                } catch(err){
                    return next(new HttpError('Could not create user, please try again',400));
                }

                res.json({pacienteId: loginPaciente.id,email: loginPaciente.email,rol: loginPaciente.rol,token:token})
        })


// CRUD rol
        //post a rol
        app.post("/api/rol/createRol", async (req,res,next) => {
                const {
                    rolName
                } = req.body
                const createRol = new Rol({
                    rolName,
                    status:true
                })
                let noDuplicateName;

                try{
                    noDuplicateName = await Rol.find({rolName:rolName})
                    if(noDuplicateName.length === 1){
                        throw new HttpError('This Rol was already exist',404)
                    }
                    await createRol.save().then(data => {
                        io.emit("backend:create-rol",data);
                        res.json({message:"PART 2, rol created successfully",data})
                    }).catch();
                }catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({message:"rol created successfully",createRol})
        })
        //get all rol
        app.get("/api/rol/", async (req,res,next) => {
                let getRol;

                try{
                    getRol = await Rol.find().exec();
                    if(!getRol){
                        throw new HttpError('Could not find any Rol',404)
                    }
                }catch(err){
                    return next(new HttpError(`something went wrong ${err}`,404))
                }

                res.json({getRol})
        })
        //get a specific rol
        app.get("/api/rol/:rId", async (req,res,next) => {
                const rolId = req.params.rId;
                let getRolById;

                try{
                    getRolById = await Rol.findById(rolId)
                    if(!getRolById){
                        throw new HttpError('Could not find any Rol',404)
                    }
                }catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({getRolById})
        })
        //patch a rol
        app.put("/api/rol/:rId", async (req,res,next) => {
                const {
                    rolName
                } = req.body
                const rolId = req.params.rId;
                let verifyRolById;

                try{
                    const verifyName = await Rol.find({rolName:rolName})
                    verifyRolById = await Rol.findById(rolId)

                    if(!verifyRolById){
                        throw new HttpError('Could not find any rol',404)
                    }
                    if(verifyName.length === 1){
                        throw new HttpError('This specialty was already exist',404)
                    }

                    verifyRolById.rolName = rolName;
                    await verifyRolById.save().then(data =>{
                        io.emit("backend:edit-rol",data);
                        res.json({message:'PART 2, Rol updated!!',data})
                    }).catch(err => res.status(500).json(err));

                }catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({message:'Rol updated!!',verifyRolById})
        })
        //delete a rol
        app.put("/api/rol/desactive/:rId", async (req,res,next) => {
                const rolId = req.params.rId;
                let verifyRolById;

                try{
                    verifyRolById = await Rol.findById(rolId)

                    if(!verifyRolById){
                        throw new HttpError('Could not find any rol',404)
                    }

                    verifyRolById.status = false;
                    await verifyRolById.save().then(data =>{
                        io.emit("backend:desactive-rol",data);
                        res.json({message:'PART 2, Rol unactive!!',data})
                    }).catch(err => res.status(500).json(err));

                }catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({message:'Rol unactive!!',verifyRolById})
        })
        //active a rol
        app.put("/api/rol/active/:rId", async (req,res,next) => {
                const rolId = req.params.rId;
                let verifyRolById;

                try{
                    verifyRolById = await Rol.findById(rolId)

                    if(!verifyRolById){
                        throw new HttpError('Could not find any rol',404)
                    }

                    verifyRolById.status = true;
                    await verifyRolById.save().then(data =>{
                        io.emit("backend:active-rol",data);
                        res.json({message:'PART 2, Rol active again!!',data})
                    }).catch(err => res.status(500).json(err));

                }catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({message:'Rol active again!!',verifyRolById})
        })


// CRUD specialty
        //post a: specialty
        app.post("/api/specialty/createSpecialty", async (req,res,next)=>{
                const error = validationResult(req);
                if(!error.isEmpty()){
                    return next(new HttpError('Invalid inputs passed, please check your data',422));
                }
                const {specialtyName} = req.body;
                const createSpecialty = new Specialty({
                    specialtyName,
                    status:true
                })
                let verifyNotDuplicatedName;

                try {
                    verifyNotDuplicatedName = await Specialty.find({specialtyName:specialtyName});
                    if(verifyNotDuplicatedName.length === 1){
                        throw new HttpError('This specialty was already exist',404)
                    }
                    await createSpecialty.save().then(data =>{
                        io.emit("backend:create-specialty",data);
                        res.json({message:'PART 2, Your specialty was create succesfully',data})
                    }).catch(err => res.status(500).json(err));
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({message:'Your specialty was create succesfully',createSpecialty});
        })
        //get all specialty
        app.get("/api/specialty/", async (req,res,next)=>{
                let getSpecialty;

                try {
                    getSpecialty = await Specialty.find().exec();
                    if(!getSpecialty){
                        throw new HttpError('Could not find any specialty',404)
                    }
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.json({getSpecialty})
        })
        //get specialty by id
        app.get("/api/specialty/:sId", async (req,res,next)=>{
                const specialtyId = req.params.sId;
                let getSpecialtyId;

                try {
                    getSpecialtyId = await Specialty.findById(specialtyId);
                    if(!getSpecialtyId){
                        throw new HttpError('Could not find any specialty',404)
                    }
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({getSpecialtyId})
        })
        //patch a: specialty
        app.put("/api/specialty/:sId", async (req,res,next) => {
                const error = validationResult(req);
                if(!error.isEmpty()){
                    return next(new HttpError('Invalid inputs passed, please check your data',422));
                }
                const {specialtyName} = req.body;
                const specialtyId = req.params.sId;
                let verifyspecialtyId;

                try {
                    const verifyNotDuplicatedName = await Specialty.find({specialtyName:specialtyName});
                    verifyspecialtyId = await Specialty.findById(specialtyId);

                    if(!verifyspecialtyId){
                        throw new HttpError('Could not find any specialty',404)
                    }
                    if(verifyNotDuplicatedName.length === 1){
                        throw new HttpError('This specialty was already exist',404)
                    }

                    verifyspecialtyId.specialtyName = specialtyName;
                    await verifyspecialtyId.save().then(data =>{
                        io.emit("backend:edit-specialty",data);
                        res.json({message:'PART 2, Your specialty was modify succesfully',data})
                    }).catch(err => res.status(500).json(err));
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404))
                }

                res.status(201).json({message:'Your specialty was modify succesfully',verifyspecialtyId});
        })
        //delete a: specialty
        app.put("/api/specialty/desactive/:sId", async (req,res,next) => {
                const specialtyId = req.params.sId;
                let deleteSpecialtyId;

                try {
                    deleteSpecialtyId = await Specialty.findById(specialtyId);

                    if(!deleteSpecialtyId){
                        throw new HttpError('Could not find any specialty',404)
                    }

                    deleteSpecialtyId.status = false;

                    await deleteSpecialtyId.save().then(data =>{
                        io.emit("backend:desactive-specialty",data);
                        res.json({message:'PART 2, your specialty was already canceled!',data})
                    }).catch(err => res.status(500).json(err));
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404));
                }

                res.status(201).json({message:'your specialty was already canceled!',deleteSpecialtyId})
        })
        //active a: specialty
        app.put("/api/specialty/active/:sId", async (req,res,next) => {
                const specialtyId = req.params.sId;
                let activeSpecialtyId;

                try {
                    activeSpecialtyId = await Specialty.findById(specialtyId);

                    if(!activeSpecialtyId){
                        throw new HttpError('Could not find any specialty',404)
                    }

                    activeSpecialtyId.status = true;

                    await activeSpecialtyId.save().then(data =>{
                        io.emit("backend:active-specialty",data);
                        res.json({message:'PART 2, your specialty was already actived!!!',data})
                    }).catch(err => res.status(500).json(err));
                } catch(err){
                    return next(new HttpError(`somenthing went wrong ${err}`,404));
                }

                res.status(201).json({message:'your specialty was already actived!!!',activeSpecialtyId})
        })
    })
}
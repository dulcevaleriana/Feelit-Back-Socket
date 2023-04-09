import express from "express";
import AgendarCita from '../models/agendarCita.js';
import Doctor from '../models/doctor.js';
import Paciente from '../models/paciente.js';
import io from "../io.js"

const router = express.Router();

//post a: agendar cita
router.post('/createDate', async (req,res,next) => {
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
router.get("/", async (req,res,next)=>{
        let AgendarCitaDBA;

        try{
            AgendarCitaDBA = await AgendarCita.find().exec();
        }catch(err){
            return next(new HttpError(`something went wrong ${err}`,404))
        }

        res.json({AgendarCitaDBA})
})
//get agendar cita by id
router.get("/:acId", async (req,res,next)=>{
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
router.get("/status/:ToF", async (req,res,next) => {
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
router.get("/doctor/:dId", async (req,res,next) => {
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
router.get("/date/:date", async (req,res,next) => {
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
router.put("/:acId", async (req,res,next) => {
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
router.put("/desactive/:acId", async (req,res,next) => {
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
router.put("/active/:acId", async (req,res,next) => {
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

const agendarCitaRoutes = router;
export default agendarCitaRoutes;
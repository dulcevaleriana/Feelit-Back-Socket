import express from "express";
import ConsultasRapidas from '../models/consultasRapidas.js';
import Doctor from '../models/doctor.js';
import Paciente from '../models/paciente.js';
import io from "../io.js"
import HttpError from '../models/http-error.js';

const router = express.Router();

//post a: consultas rapidas
router.post("/createConsultaRapida", async (req,res,next)=>{
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
router.get("/", async (req,res,next)=>{
    let getAllconsultasRapidas;

    try {
        getAllconsultasRapidas = await ConsultasRapidas.find().exec();
    }catch(err){
        return next(new HttpError(`somethign went wrong ${err}`,422));
    }

    res.json({getAllconsultasRapidas})
})
//get consultas rapidas by id
router.get("/:crId", async (req,res,next)=>{
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
router.get("/status/:ToF", async (req,res,next) => {
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
router.get("/doctor/:dId", async (req,res,next) => {
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
router.get("/paciente/:pId", async (req,res,next) => {
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
router.get("/doctorAndPaciente/:dId/:pId", async (req,res,next) => {
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
router.get("/date/:date", async (req,res,next) => {
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
router.put("/:crId", async (req,res,next) => {
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
router.put("/desactive/:crId", async (req,res,next) => {
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
router.put("/active/:crId", async (req,res,next) => {
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
router.put("/complete/:crId", async (req,res,next) => {
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

const consultasRapidasRoutes = router;
export default consultasRapidasRoutes;
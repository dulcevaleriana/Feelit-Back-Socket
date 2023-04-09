import express from "express";
import EnviarExamenes from '../models/enviarExamenes.js';
import Doctor from '../models/doctor.js';
import Paciente from '../models/paciente.js';
import io from "../io.js"
import HttpError from '../models/http-error.js';

const router = express.Router();

//post a: enviar examenes
router.post("/createEnviarExamenes", async (req,res,next) => {
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
router.get("/",async (req,res,next)=>{
    let getAllEnviarExamenes;

    try {
        getAllEnviarExamenes = await EnviarExamenes.find().exec();
    } catch(err){
        return next(new HttpError(`somenthing went wrong ${err}`,404))
    }

    res.json({getAllEnviarExamenes});
})
//get enviar examenes by id
router.get("/:eeId", async (req,res,next)=>{
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
router.get("/status/:ToF", async (req,res,next) => {
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
router.get("/doctor/:dId", async (req,res,next) => {
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
router.get("/date/:date", async (req,res,next) => {
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
router.put("/:eeId/:pId", async (req,res,next) => {
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
router.put("/desactive/:eeId", async (req,res,next) => {
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
router.put("/active/:eeId", async (req,res,next) => {
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

const enviarExamenesRoutes = router;
export default enviarExamenesRoutes;
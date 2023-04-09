import express from 'express';
import AgendarCita from '../models/agendarCita.js';
import ConsultasRapidas from '../models/consultasRapidas.js';
import EnviarExamenes from '../models/enviarExamenes.js';
import Paciente from '../models/paciente.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import HttpError from '../models/http-error.js';

const router = express.Router();

//post a paciente
router.post("/createPaciente", async (req,res,next)=>{
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
router.get("/", async (req,res,next)=>{
    let getAllPaciente;

    try{
        getAllPaciente = await Paciente.find().exec();
    } catch(error){
        return res.json({message:'Could not find any paciente'})
    }

    res.json({getAllPaciente:getAllPaciente.map(data => data.toObject({getters:true}))})
})
//get paciente by id
router.get("/:pId", async (req,res,next) => {
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
router.get("/getAllPacienteServices/:pId", async (req,res,next) => {
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
router.put("/:pId", async (req,res,next) => {
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
router.put("/desactivePaciente/:pId", async (req,res,next) => {
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
router.put("/activePaciente/:pId", async (req,res,next) => {
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
router.get("/login", async (req,res,next) => {
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

const pacienteRoutes = router;
export default pacienteRoutes;
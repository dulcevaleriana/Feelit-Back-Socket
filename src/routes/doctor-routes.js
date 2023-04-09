import express from "express";
import AgendarCita from '../models/agendarCita.js';
import ConsultasRapidas from '../models/consultasRapidas.js';
import EnviarExamenes from '../models/enviarExamenes.js';
import Doctor from '../models/doctor.js';
import io from "../io.js"
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import HttpError from '../models/http-error.js';

const router = express.Router();

//post a doctor
router.post("/createDoctor", async (req,res,next)=>{
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
router.get("/", async (req,res,next)=>{
    let getAllDoctor;

    try {
        getAllDoctor = await Doctor.find().exec();
    } catch(err) {
        return next(new HttpError(`Something went wrong ${err}`,404))
    }

    res.json({getAllDoctor:getAllDoctor.map(data => data.toObject({getters:true}))})
})
//get doctor by id
router.get("/:dId", async (req,res,next)=>{
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
router.get("/speciality/:specialityName", async (req,res,next)=>{
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
router.get("/getAllDoctorServices/:dId", async (req,res,next) => {
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
router.put("/:dId", async (req,res,next) => {
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
router.put("/unactive/:dId", async (req,res,next) => {
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
router.put("/activeDoctor/:dId", async (req,res,next) => {
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
router.get("/login", async (req,res,next) => {
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

const doctorRoutes = router;
export default doctorRoutes;
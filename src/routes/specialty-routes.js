import HttpError from '../models/http-error.js';
import express from "express";

const router = express.Router();

//post a: specialty
router.post("/createSpecialty", async (req,res,next)=>{
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
router.get("/", async (req,res,next)=>{
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
router.get("/:sId", async (req,res,next)=>{
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
router.put("/:sId", async (req,res,next) => {
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
router.put("/desactive/:sId", async (req,res,next) => {
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
router.put("/active/:sId", async (req,res,next) => {
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

const specialtyRoutes = router;
export default specialtyRoutes;
import HttpError from '../models/http-error.js';
import express from "express";

const router = express.Router();

//post a rol
router.post("/createRol", async (req,res,next) => {
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
router.get("/", async (req,res,next) => {
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
router.get("/:rId", async (req,res,next) => {
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
router.put("/:rId", async (req,res,next) => {
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
router.put("/desactive/:rId", async (req,res,next) => {
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
router.put("/active/:rId", async (req,res,next) => {
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

const rolRoutes = router;
export default rolRoutes;
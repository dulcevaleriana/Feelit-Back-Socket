const httpError = require("../models/http-error");
const jwt = require('jsonwebtoken');

module.exports = (req, res,next) => {
    if(req.method === 'OPTIONS'){
        return next();
    }

    try {
        const token = req.headers.authorization.split(' ')[1];
        if(!token){
            const err = new httpError("Authentication failed",403);
            return next(err)
        }
        const decodedToken = jwt.verify(token,process.env.JWT_KEY);
        req.userData = {userId: decodedToken.userId}
        next();
    } catch(err){
        throw new httpError("Authentication failed",403);
    }

}
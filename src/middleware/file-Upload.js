const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const MINE_TYPE_MAP = {
    'image/png' : 'png',
    'image/jpeg' : 'jpeg',
    'image/jpg' : 'jpg',
    'image/svg' : 'svg',
};

const fileUpload = multer({
    limits: 500000,
    storage: multer.diskStorage({
        destination: (req,file,cb) => {
            cb(null, 'uploads/images')
        },
        filename: (req,file,cb) => {
            const ext = MINE_TYPE_MAP[file.mimetype];
            cb(null, uuidv4() + '.' + ext)
        }
    }),
    fileFilter: (req,file,cb) => {
        const isValid = !!MINE_TYPE_MAP[file.mimetype];
        let error = isValid ? null : new Error('Invalid file type, only accept .jpg, .svg, .png or .jpeg file');
        cb(error, isValid)
    }
})

module.exports = fileUpload;
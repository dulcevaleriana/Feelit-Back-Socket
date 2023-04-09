export default class HttpError extends Error {
    constructor(message, status){
        super(message);
        this.code = status;
    }
}
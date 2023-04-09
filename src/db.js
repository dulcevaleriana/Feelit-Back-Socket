import { connect } from 'mongoose'
import { config } from "dotenv";
config()
// this's database connection with mongodb
export const connectDB = async () => {
    try {
        await connect(`mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_KEY}@cluster0.rcqta.mongodb.net/${process.env.MONGODB_DBA}?retryWrites=true&w=majority`)
        console.log("connection works!!")
    } catch(err){
        console.log({err})
    }
}
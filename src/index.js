// import app from "./app.js"
import { connectDB } from "./db.js";
import sockets from "./sockets.js";
import io from "./io.js";
// here we access to database
connectDB();
// here we create all CRUD process and pass io connection server
sockets(io);
// This's a success message
console.log("lisent to port 3000")
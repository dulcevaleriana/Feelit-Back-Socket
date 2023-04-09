// import app from "./app.js"
import { Server as websockerServer } from "socket.io"
import http from "http"
import { connectDB } from "./db.js"
import sockets from "./sockets.js"
import express from "express";

// here we access to database
connectDB();
// here we create connection server
const app = express()
const server = http.createServer(app);
const httpServer = server.listen(3000);
const io = new websockerServer(httpServer);
// here we create all CRUD process
sockets(io,app)
// This's a success message
console.log("lisent to port 3000")
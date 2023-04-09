import express from "express";
import { Server as websockerServer } from "socket.io";
import http from "http";
// here we create connection server
const app = express();
const server = http.createServer(app);
const httpServer = server.listen(3000);
const io = new websockerServer(httpServer);

export default io;
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const port = process.env.PORT || 80;

const app = express();
const path = require("path");
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(bodyParser.json());

server.listen(port, () => {
  console.log("Server listening at 80");
});

console.log(port);

app.use(express.static("client/build"));
//app.use("/api", routes);
app.use(express.json());

let arrUsernameSocketid = [];

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("username-color", (data) => {
    arrUsernameSocketid.push({
      username: data.username,
      socketid: socket.id,
      socket: socket,
      color: data.color,
    });

    socket.join("main-chat-group");

    io.to("main-chat-group").emit("user-joined", data);
    let arrusernames = [];
    arrUsernameSocketid.forEach(function (item) {
      //let x = item.username;
      let data = { username: item.username, color: item.color };
      arrusernames.push(data);
    });
    io.to("main-chat-group").emit("userlist", arrusernames);
  });

  socket.on("messagefromclient", (data) => {
    socket.to("main-chat-group").emit("broadcast", data);
  });

  socket.on("istyping", (data) => {
    socket.to("main-chat-group").emit("broadcast-typing", data);
  });

  socket.on("game_request", (data) => {
    //console.log(data);
    //username to send request to
    let tosocket = arrUsernameSocketid.find((o) => o.username == data.to);
    if (tosocket != null) {
      io.to(tosocket.socketid).emit("incoming_request", data.from);
    }
  });
  let matchLogger = [];
  socket.on("requests_response", (data) => {
    let gameStartObject = {
      from: data.from,
      to: data.to,
      x: data.from,
      o: data.to,
      matchno: matchLogger.length + 1,
    };
    console.log(gameStartObject);
    io.to("main-chat-group").emit("game-started", gameStartObject);
    matchLogger.push(gameStartObject);
    socket.off("game_request");
  });
  socket.on("disconnect", async () => {
    console.log(`${socket.id} diconnectd`);

    let usernamedisconnected = arrUsernameSocketid.find(
      (p) => p.socketid == socket.id
    );

    arrUsernameSocketid = arrUsernameSocketid.filter(
      (p) => p.socketid != socket.id
    );

    let arrusernames = [];
    arrUsernameSocketid.forEach(function (item) {
      let data = { username: item.username, color: item.color };
      arrusernames.push(data);
    });
    io.to("main-chat-group").emit("userlist", arrusernames);
  });
});

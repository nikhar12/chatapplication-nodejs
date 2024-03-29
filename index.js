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
let matchLogger = [];
let gameStartObject;
let currentMatchID = "";
let que = [];
let gameBoard = [
  [-1, -1, -1],
  [-1, -1, -1],
  [-1, -1, -1],
];
function initGameboard() {
  gameBoard = [
    [-1, -1, -1],
    [-1, -1, -1],
    [-1, -1, -1],
  ];
}
let kvpair = {
  1: "0-0",
  2: "0-1",
  3: "0-2",
  4: "1-0",
  5: "1-1",
  6: "1-2",
  7: "2-0",
  8: "2-1",
  9: "2-2",
};

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
    let m = matchLogger.find((p) => p.currentMatchID == currentMatchID);
    if (m != null) {
      console.log("m:" + m.currentMatchID + " curretmatid" + currentMatchID);
      io.to(socket.id).emit("game-started", m);
    }
  });

  socket.on("messagefromclient", (data) => {
    socket.to("main-chat-group").emit("broadcast", data);
  });

  socket.on("istyping", (data) => {
    socket.to("main-chat-group").emit("broadcast-typing", data);
  });

  socket.on("game_request", (data) => {
    console.log(data);
    //username to send request to
    let tosocket = arrUsernameSocketid.find((o) => o.username == data.to);
    if (tosocket != null) {
      io.to(tosocket.socketid).emit("incoming_request", data.from);
    }
  });

  socket.on("requests_response", (data) => {
    currentMatchID = "id" + Math.random().toString(16).slice(2);
    gameStartObject = {
      from: data.from,
      to: data.to,
      x: data.from,
      o: data.to,
      matchno: matchLogger.length + 1,
      onGoing: 1,
      currentMatchID: currentMatchID,
      likes: 0,
      firstchance: data.from,
      que: [],
      turncounter: 0,
      votecounter: 0,
    };
    console.log(gameStartObject);
    io.to("main-chat-group").emit("game-started", gameStartObject);
    matchLogger.push(gameStartObject);
  });

  let votecounter = 0;
  socket.on("game_controls", (data) => {
    if (data.type == "abandon") {
      let m = matchLogger.find((p) => p.currentMatchID == data.currentMatchID);
      if (m.from == data.player || m.to == data.player) {
        matchLogger.find(
          (p) => p.currentMatchID == data.currentMatchID
        ).onGoing = 0;

        gameendfunc(data.player, "abandoning");
      }
    } else if (data.type == "votetostop") {
      console.log("votetostop by:" + data.player);
      if (arrUsernameSocketid.length > 2) {
        matchLogger.find((p) => p.currentMatchID == data.currentMatchID)
          .votecounter++;
        //console.log("votetostop by:" + data.player + " votec:" + votecounter);
        if (
          arrUsernameSocketid.length - 2 ==
          matchLogger.find((p) => p.currentMatchID == data.currentMatchID)
            .votecounter
        ) {
          //game end by vote
          matchLogger.find(
            (p) => p.currentMatchID == data.currentMatchID
          ).onGoing = 0;
          gameendfunc("", "voting");
        }
      }
    } else if (data.type == "like") {
      matchLogger.find((p) => p.currentMatchID == data.currentMatchID).likes++;
    }
  });
  let turncounter = 0;
  let gameobject = {};

  socket.on("userturn", (data) => {
    //turncounter++;
    let d = { boxnumber: data.boxnumber, k: data.k };
    que.push(d);
    matchLogger.find((p) => p.onGoing == 1).que = que;

    let ijvalues = String(kvpair[data.boxnumber]);
    let arr = ijvalues.split("-");
    let i = arr[0];
    let j = arr[1];

    //if valid turn
    if (gameBoard[i][j] == -1) {
      gameBoard[i][j] = data.k;
      matchLogger.find((p) => p.onGoing == 1).turncounter++;
    }

    // console.log(turncounter + " gb:" + gameBoard);
    gameobject.status = 0;

    if (
      matchLogger.find((p) => p.onGoing == 1).turncounter >= 5 &&
      matchLogger.find((p) => p.onGoing == 1).turncounter <= 9
    ) {
      gameobject = gameWinnerDetector(gameBoard);

      console.log(
        "gameobject status " +
          gameobject.status +
          " code " +
          gameobject.code +
          " wonby " +
          gameobject.wonby
      );
    }

    data.gamewinobj = gameobject;

    io.to("main-chat-group").emit("userturn-broadcast", data);

    if (gameobject.status == 1) {
      console.log("winning");
      gameendfunc("", "winning");
    } else if (
      matchLogger.find((p) => p.onGoing == 1).turncounter == 9 &&
      gameobject.status == 0
    ) {
      console.log("draw");
      gameendfunc("", "draw");
    }
    console.log("ongoign: " + matchLogger.find((p) => p.onGoing == 1));
  });

  socket.on("disconnect", async () => {
    console.log(`${socket.id} diconnectd`);

    let usernamedisconnected = arrUsernameSocketid.find(
      (p) => p.socketid == socket.id
    );
    let m = matchLogger.find((p) => p.currentMatchID == currentMatchID);
    if (m != null) {
      if (
        m.from == usernamedisconnected.username ||
        m.to == usernamedisconnected.username
      ) {
        //if game ends by player exiting
        gameendfunc(usernamedisconnected.username, "exiting");
      }
    }
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
  const gameendfunc = (player, gameendby) => {
    console.log("gameendfunc player:" + player + " gameendby:" + gameendby);
    if (gameendby != "winning") {
      let gameendobj = {
        player: player,
        gameendby: gameendby,
      };

      io.to("main-chat-group").emit("game-abandoned", gameendobj);
    }
    //clean everything
    matchLogger
      .find((p) => p.currentMatchID == currentMatchID)
      .que.splice(
        0,
        matchLogger.find((p) => p.currentMatchID == currentMatchID).que.length
      );
    console.log(
      "que at gameendfunc:" +
        matchLogger.find((p) => p.currentMatchID == currentMatchID).que
    );
    matchLogger.find((p) => p.currentMatchID == currentMatchID).turncounter = 0;
    matchLogger.find((p) => p.currentMatchID == currentMatchID).votecounter = 0;
    matchLogger.find((p) => p.currentMatchID == currentMatchID).onGoing = 0;
    currentMatchID = "";
    initGameboard();
    //
  };
});

const gameWinnerDetector = (gameb) => {
  let gameobject = { status: 0 };
  //gameb is an 2d array
  let j = 0;
  let k = 0;

  outerloop: for (let i = 0; i < 3; i++) {
    //if(gameb[i][j]!=-1|| gameb[k][i]!=-1)
    //{
    let a = gameb[i][j];
    let b = gameb[k][i];

    j++;
    k++;
    let row = true;
    let column = true;
    innerloop: for (; j < 3; ) {
      if (a != -1) {
        //console.log("i:"+i+" j:"+j+" a:"+a);
        if (gameb[i][j] == a) {
          j++;
        } else {
          a = gameb[i][j];
          j++;
          row = false;
          //break innerloop;
        }
      } else {
        j++;
        row = false;
      }
      //console.log("k:"+k+" i:"+i+" b:"+b);
      if (b != -1) {
        //coulm
        if (gameb[k][i] == b) {
          k++;
        } else {
          b = gameb[k][i];
          k++;
          column = false;
        }
      } else {
        column = false;
      }
    }

    j = 0;
    k = 0;

    if (row) {
      //row - a won
      //console.log("R"+i+" won by:"+a);
      gameobject.status = 1;
      gameobject.code = "R" + i;
      gameobject.wonby = a;
      //break outerloop;
    }
    if (column) {
      // some column b won

      //console.log("C"+i+" won by:"+b);
      gameobject.status = 1;
      gameobject.code = "C" + i;
      gameobject.wonby = b;
      //break outerloop;
    }

    //}
  }
  let down = false;
  let up = false;
  let c;
  if (
    gameb[0][0] == gameb[1][1] &&
    gameb[1][1] == gameb[2][2] &&
    gameb[2][2] != -1
  ) {
    down = true;
    c = gameb[2][2];
  }
  if (
    gameb[2][0] == gameb[1][1] &&
    gameb[1][1] == gameb[0][2] &&
    gameb[0][2] != -1
  ) {
    up = true;
    c = gameb[0][2];
  }
  if (down) {
    //console.log("D");
    gameobject.status = 1;
    gameobject.code = "D";
    gameobject.wonby = c;
  }
  if (up) {
    //console.log("U");
    gameobject.status = 1;
    gameobject.code = "U";
    gameobject.wonby = c;
  }
  console.log(gameobject.code);
  return gameobject;
};

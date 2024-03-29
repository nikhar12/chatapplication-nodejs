$(document).ready(function () {
  //clicking on ttt boxes

  $(".gbox").click(function () {
    if (usertype != "spec" && gameOngoing == 1) {
      if (username == turn) {
        let boxnumber = $(this).attr("id");
        console.log(boxnumber);

        if (blockBox.find((p) => p == boxnumber) == boxnumber) return;
        blockBox.push(boxnumber);
        console.log("blockbox: " + blockBox);
        $(this).html(insertImage);
        //block that box -disable click
        // $(this).prop("disabled", true);

        let ijvalues = String(kvpair[boxnumber]);
        let arr = ijvalues.split("-");
        let i = arr[0];
        let j = arr[1];

        //if valid turn
        if (gameBoard[i][j] == -1) {
          gameBoard[i][j] = k;
          let data = {
            from: username,
            to: opponent,
            boxnumber: boxnumber,
            k: k,
          };
          socket.emit("userturn", data);
        }
      }
    }
  });
});

let gameBoard;
initGame();
let gameObjectt;
let insertImage;
let turn, k;
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
function initGame() {
  gameBoard = [
    [-1, -1, -1],
    [-1, -1, -1],
    [-1, -1, -1],
  ];
  blockBox = [];
}

function player_game(data) {
  $(".gbox").removeAttr("disabled");
  gameObjectt = data;
  if (data.x == username) {
    insertImage = "<img src='/images/ttt-cross.png'/>";
    k = 1;
  }

  if (data.o == username) {
    insertImage = "<img src='/images/ttt-circle.png'/>";
    k = 0;
  }

  if (data.firstchance != username) {
    //$(".gbox").off("click");
  } else {
    $(".gbox").removeAttr("disabled");
  }
  turn = data.firstchance;
}

function switchturn(turn, m) {
  if (m == 0) {
    $("#div-circle").css("background-color", "#03ff93");
    $("#div-cross").css("background-color", "white");
  } else {
    $("#div-cross").css("background-color", "#03ff93");
    $("#div-circle").css("background-color", "white");
  }
  if (turn == username) {
    turn = opponent;
  } else {
    turn = username;
  }
}
function spectator_game(data) {
  //$(".gbox").attr("disabled", "disabled");
}

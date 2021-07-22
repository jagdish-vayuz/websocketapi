const express = require("express");
const app = express();

const Socket = require("websocket").server;
const http = require("http");

const server = http.createServer((req, res) => {});

server.listen(process.env.PORT || 5000, () => {
  console.log("Listening on port 5000...");
});

const webSocket = new Socket({ httpServer: server });

let users = [];
let users2 = [];
let rooms = [];
let time;
var startTime;
var hr = 00;
var min = 00;
var sec = 00;

let time1;
var startTime1;
var hr1 = 00;
var min1 = 00;
var sec1 = 00;

webSocket.on("request", (req) => {
  const connection = req.accept();

  connection.on("message", (message) => {
    const data = JSON.parse(message.utf8Data);

    const user = findUser(data.username);
    const user2 = findUser2(data.username);

    switch (data.type) {
      case "store_user":
        if (user != null) {
          return;
        }

        const newUser = {
          conn: connection,
          username: data.username,
        };

        users.push(newUser);

        break;
      case "store_offer":
        if (user == null) return;
        user.offer = data.offer;
        break;

      case "store_candidate":
        if (user == null) {
          return;
        }
        if (user.candidates == null) user.candidates = [];

        user.candidates.push(data.candidate);
        break;
      case "send_answer":
        if (user == null) {
          return;
        }

        sendData(
          {
            type: "answer",
            answer: data.answer,
          },
          user.conn
        );

        break;
      case "send_candidate":
        if (user == null) {
          return;
        }

        sendData(
          {
            type: "candidate",
            candidate: data.candidate,
          },
          user.conn
        );

        break;
      case "join_call":
        console.log("join call");
        if (user == null) {
          return;
        }

        sendData(
          {
            type: "offer",
            offer: user.offer,
          },
          connection
        );

        user.candidates.forEach((candidate) => {
          sendData(
            {
              type: "candidate",
              candidate: candidate,
            },
            connection
          );
        });

        startTime1 = Date.now();

        users.forEach((user) => {
          setInterval(() => {
            time1 = clock1();
            let t1 = {
              type: "timer",
              time: time1,
            };
            user.conn.send(JSON.stringify(t1));
            connection.send(JSON.stringify(t1));
          }, 1000);
        });

        break;

      //group video calling
      case "create_room":
        rooms.push(data.meeting_id);
        break;

      case "find_room":
        sendData(
          {
            type: "room_avail",
            username: data.username,
            meeting_id: data.meeting_id,
            avail: findRoom(data.meeting_id),
          },
          connection
        );

        break;

      case "join":
        console.log("join");

        if (!user2) {
          users2.push({
            username: data.username,
            conn: connection,
          });
        } else {
          console.log("username should be unique");
          return;
        }
        let total_user = users2.length;

        users2.forEach((user) => {
          if (data.username != user.username) {
            sendData(
              {
                type: "new user",
                username: data.username,
                total_user: total_user,
              },
              user.conn
            );
          }
        });
        if (total_user == 2) {
          startTime = Date.now();
        }
        if (total_user > 1) {
          users2.forEach((user) => {
            setInterval(() => {
              time = clock();
              let t = {
                type: "timer",
                time: time,
              };
              user.conn.send(JSON.stringify(t));
            }, 1000);
          });
        }
        break;

      case "offer":
        let to;
        users2.forEach((user) => {
          if (user.username == data.to) {
            to = user.conn;
          }
        });
        sendData(
          {
            type: "offer",
            offer: data.offer,
            from: data.from,
            to: data.to,
          },
          to
        );
        break;
      case "answer":
        let ansewerto;
        users2.forEach((user) => {
          if (user.username == data.to) {
            ansewerto = user.conn;
          }
        });
        sendData(
          {
            type: "answer",
            from: data.from,
            to: data.to,
            answer: data.answer,
          },
          ansewerto
        );

        break;

      case "candidate":
        console.log("candidate");
        let sendto;
        users2.forEach((user) => {
          if (user.username == data.to) {
            sendto = user.conn;
          }
        });
        sendData(
          {
            type: "candidate",
            from: data.from,
            candidate: data.candidate,
          },
          sendto
        );

        break;
    }
  });

  connection.on("close", (reason, description) => {
    hr1 = 00;
    min1 = 00;
    sec1 = 00;
    startTime1 = Date.now();
    users.forEach((user) => {
      if (user.conn == connection) {
        users.splice(users.indexOf(user), 1);
        return;
      }
    });
    users2.forEach((user) => {
      if (user.conn == connection) {
        users2.splice(users2.indexOf(user), 1);
        return;
      }
    });
  });
});

function sendData(data, conn) {
  conn.send(JSON.stringify(data));
}

function findUser(username) {
  for (let i = 0; i < users.length; i++) {
    if (users[i].username == username) return users[i];
  }
}

function findUser2(username) {
  for (let i = 0; i < users2.length; i++) {
    if (users2[i].username == username) return users2[i];
  }
  return false;
}

function findRoom(meeting_id) {
  console.log(meeting_id + "-----" + rooms.length);
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i] == meeting_id) {
      console.log(rooms[i]);
      return true;
    }
  }
  return false;
}

function clock() {
  sec = Math.trunc((Date.now() - startTime) / 1000);
  if (sec == 60) {
    min += 1;
    startTime = Date.now();
    sec = 0;
    if (min == 60) {
      min = 00;
      hr += 1;
    }
  }
  return {
    hr: hr,
    min: min,
    sec: sec,
  };
}

function clock1() {
  sec1 = Math.trunc((Date.now() - startTime1) / 1000);
  if (sec1 == 60) {
    min1 += 1;
    startTime1 = Date.now();
    sec1 = 0;
    if (min1 == 60) {
      min1 = 00;
      hr1 += 1;
    }
  }
  return {
    hr: hr1,
    min: min1,
    sec: sec1,
  };
}

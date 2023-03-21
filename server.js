const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server);
const { ExpressPeerServer } = require("peer");
const url = require("url");
const peerServer = ExpressPeerServer(server, {
    debug: true,
});
const path = require("path");
const cookieParser = require('cookie-parser');

app.set("view engine", "ejs");
app.use("/public", express.static(path.join(__dirname, "static")));
app.use("/peerjs", peerServer);
app.use(cookieParser());

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "static", "index.html"));
});

app.get("/join", (req, res) => {
    res.redirect(
        url.format({
            pathname: `/join/${uuidv4()}`,
            query: { ...req.query, __internal_redirect: true },
        })
    );
});

app.get("/joinold", (req, res) => {
    res.redirect(
        url.format({
            pathname: (req.query.meeting_id.startsWith("http") ? '' : `/join/`) + req.query.meeting_id,
            query: { ...req.query, __internal_redirect: true },
        })
    );
});

app.get("/join/:rooms", (req, res) => {
    let userData = null;
    if (req.cookies?.userData != undefined) {
        userData = JSON.parse(req.cookies.userData);
    }
    if (req.query.__internal_redirect && req.query.name) {
        userData = { name: req.query.name, id: req.params.rooms };
        res.cookie("userData", JSON.stringify(userData));
        res.redirect(req.path); return;
    }
    if (userData != null && userData.id == req.params.rooms) {
        res.render("room", { roomid: req.params.rooms, Myname: userData.name });
    }
    else
        res.redirect("/");
});

app.post("/leave", (req, res) => {
    res.cookie("userData", "", { maxAge: -1000 });
    res.redirect("/");
});

io.on("connection", (socket) => {
    socket.on("join-room", (roomId, id, myname) => {
        socket.join(roomId);
        socket.to(roomId).broadcast.emit("user-connected", id, myname);

        socket.on("messagesend", (message) => {
            console.log(message);
            io.to(roomId).emit("createMessage", message);
        });

        socket.on("tellName", (myname) => {
            console.log(myname);
            socket.to(roomId).broadcast.emit("AddName", myname);
        });

        socket.on("disconnect", () => {
            socket.to(roomId).broadcast.emit("user-disconnected", id);
        });
    });
});

server.listen(process.env.PORT || 3030);
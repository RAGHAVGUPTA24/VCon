const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server) //importing socket.io
const { v4: uuid4 } = require('uuid');

//through first three lines we create server
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
    debug: true
});
app.use('/peerjs', peerServer);
app.set('view engine', 'ejs');

app.use(express.static('public'));
app.get('/', (req, res) => {
    res.redirect(`/${uuid4()}`);
})
app.get('/:room', (req, res) => {
    res.render('room', { roomId: req.params.room })
})

const members = {};

io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        console.log(members[roomId]);
        io.to(socket.id).emit('notify-user-list', members[roomId] ?? []);
        if (!Object.hasOwnProperty(members, roomId))
            members[roomId] = [];
        members[roomId].push(userId);
        io.to(roomId).emit('user-connected', userId);

        socket.on('message', message => {
            io.to(roomId).emit('createMessage', message)
        })
    })
})
server.listen(3030); 
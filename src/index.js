var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var config = require('config');
var redisChatModel = require('./model/RedisChat.js');

var RedisChat = new redisChatModel(config.get('redis.hostName'), config.get('redis.port'));
var authController = require('./controller/AuthController');

app.get('/auth/create', function(req, res) {
    var token = authController.createToken(req, res);
    res.send(JSON.stringify(token));
});

app.get('/auth/validate', function(req, res){
    var validation = authController.validateToken(req, res);
    res.send(validation);
});

var connectedUsers = [];
io.on('connection', function(socket){
    console.log('Connected');
    socket.emit('connected', 'mooocow');
    socket.on('validateToken', function(token){
        var Auth = require("./model/Auth");
        var authInstance = new Auth();
        var user = null;
        userDetails = authInstance.validateToken(token);
        console.log('Validated ' + userDetails);
        if (!userDetails) {
            console.log('This is just an anonymous user, no need to save anything');
        } else {
            user = JSON.parse(userDetails);
            console.log('saving to connectedUsers with key ' + socket.id);
            connectedUsers[socket.id] = user;
            socket.emit('authenticated', user);
        }
    });


    socket.on('sendMessage', function(room, message) {
        if (!connectedUsers[socket.id]) {
            socket.disconnect('Anonymous user trying to speak - go away');
        }
        console.log(connectedUsers[socket.id].username + ' says ' + message);
        var user = connectedUsers[socket.id];
        // I don't like this :(
        var Auth = require("./model/Auth");
        var authInstance = new Auth();
        if (authInstance.lockRooms == true) {
            if (room != user.room) {
                console.log('this user cannot post to this room');
                return false;
            }
        }
        RedisChat.saveMessage(room, user, message)
        socket.emit('message', { room: room, message: { user: user, message: message} });
        socket.broadcast.emit('message', { room: room, message: { user: user, message: message} });
    });

    socket.on('loadMessages', function(room) {
        var Auth = require("./model/Auth");
        var authInstance = new Auth();
        if (authInstance.lockRooms == true) {
            if (room != user.room) {
                console.log('this user cannot post to this room');
                return false;
            }
        }
        console.log('sending socket ' + socket.id);
        RedisChat.loadMessages(room, socket);
    });
    socket.on('disconnect', function(){
        var user = connectedUsers[socket.id];
        if (user) {
            delete connectedUsers[socket.id];
            console.log('disconnected user ' + user.username);
        } else {
            console.log('disconnected annonymous user');
        }
    })
});

http.listen(config.get('port'), function(){
    console.log('listening on *:' + config.get('port'));
});

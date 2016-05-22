var redis = require('redis');
require('datejs');

function RedisChat(ip, port) {
    this.client = redis.createClient(port, ip);
    this.client.on('connect', function() {
        console.log('connected to redis');
    });
}

RedisChat.prototype.saveMessage = function(
    room,
    user,
    message
) {

    this.client.lpush('chitchat_messages_' + room, JSON.stringify({user: user, message: message, utctime: Date.today()}), function(err, reply){
        console.log(reply);
    });
    this.client.ltrim('chitchat_messages_' + room, 0, 200);
};

RedisChat.prototype.loadMessages = function(
    room,
    socket
) {
    this.client.lrange('chitchat_messages_' + room, 0, -1, function(socket, room, err, reply){
        socket.emit('messages', { room: room, messages: reply.reverse() });
    }.bind(this,socket,room));
};

module.exports = RedisChat;
var redis = require('redis');
require('datejs');

function RedisChat(ip, port, floodInterval, floodCount) {
    this.client = redis.createClient(port, ip);
    this.client.on('connect', function() {
        console.log('connected to redis');
    });
    this.floodInterval = floodInterval;
    this.floodCount = floodCount;
}

RedisChat.prototype.sendMessage = function(
    room,
    user,
    message,
    socket
) {
    var data = {
        room: room,
        user: user,
        message: message,
        socket: socket
    };
    this.saveMessageIfNotFlood(data);
};

RedisChat.prototype.loadMessages = function(
    room,
    socket
) {
    this.client.lrange('chitchat_messages_' + room, 0, -1, function(socket, room, err, reply){
        socket.emit('messages', { room: room, messages: reply.reverse() });
    }.bind(this,socket,room));
};

RedisChat.prototype.broadcastMessage = function(socket, room, user, message, allUsers) {
    if (typeof allUsers == "undefined") {
        allUsers = true;
    }
    socket.emit('message', { room: room, message: { user: user, message: message} });
    if (allUsers == true) {
        socket.broadcast.emit('message', {room: room, message: {user: user, message: message}});
    }
} ;

RedisChat.prototype.saveMessageIfNotFlood = function(data) {
    this.client.get('chitchat_floodcount_' + data.socket.id, function(data, that, err, reply){
        if (reply == null) {
            // This user hasn't sent any messages recently
            // Create a new key that expires after floodInterval seconds
            that.client.set('chitchat_floodcount_' + data.socket.id, 1);
            that.client.expire('chitchat_floodcount_' + data.socket.id, that.floodInterval);
            // Then send the message as normal
            that.saveMessage(data);
            that.broadcastMessage(
                data.socket,
                data.room,
                data.user,
                data.message,
                true
            );
        } else {
            // Have they posted more than the floodCount limit?
            if (reply > that.floodCount) {
                // Reset their expire time
                that.client.expire('chitchat_floodcount_' + data.socket.id, that.floodInterval);
                // Send a message just to that user
                that.broadcastMessage(
                    data.socket,
                    data.room,
                    data.user,
                    "[Anti-Flood] Please wait a few moments before posting again",
                    false
                );
            } else {
                // Send normally and increment their current messages
                that.client.incr('chitchat_floodcount_' + data.socket.id);
                that.saveMessage(data);
                that.broadcastMessage(
                    data.socket,
                    data.room,
                    data.user,
                    data.message,
                    true
                );
            }
        }
    }.bind(this, data, this));
};

RedisChat.prototype.saveMessage = function(data) {
    this.client.lpush('chitchat_messages_' + data.room, JSON.stringify({user: data.user, message: data.message, utctime: Date.today()}));
    this.client.ltrim('chitchat_messages_' + data.room, 0, 200);
};

module.exports = RedisChat;
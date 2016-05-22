var encryptionMethod = "aes";
var CryptoJS = require("crypto-js");
var crypter = require("crypto-js/" + encryptionMethod);
var urlencode = require('urlencode');
var config = require('config');
var secureKey = config.get('auth.secureKey');
// ToDo: Save this in a config somewhere

function Auth() {
    // Init
    this.lockRooms = false;
}

Auth.prototype.createToken = function(
    username,
    imageurl,
    colour,
    room
) {
    // ToDo: add some global key store here but for now use this string
    var userDetails = this.createUserDetailsObject(username, imageurl, colour, room, true);
    if (this.lockRooms == false) {
        delete userDetails.room;
    }
    var token = this.tokenEncode(userDetails);
    // Client must add this to their users requests, along with all the other data
    return { token: urlencode(token.toString()) };
};

Auth.prototype.createUserDetailsObject = function(username, imageurl, colour, room, requiresUrlDecoding) {
    if (requiresUrlDecoding == true) {
        return {
            "username": urlencode.decode(username),
            "imageurl": urlencode.decode(imageurl),
            "colour": urlencode.decode(colour),
            "room": urlencode.decode(room)
        };
    } else {
        return {
            "username" : username,
            "imageurl" : imageurl,
            "colour"   : colour,
            "room"     : room
        };
    }
}

// This will be hit through the node socket, and won't require url decoding on the objects
Auth.prototype.validateToken = function(
      token
) {
    var decodedString = this.tokenDecode(urlencode.decode(token));
    if (decodedString) {
        return decodedString;
    }
    return false;
};

// Decode token
Auth.prototype.tokenDecode = function(encodedToken) {
    decrypted = crypter.decrypt(encodedToken, secureKey);
    return decrypted.toString(CryptoJS.enc.Utf8);
};

// Encode token
Auth.prototype.tokenEncode = function(object) {
    return crypter.encrypt(JSON.stringify(object), secureKey);
};

module.exports = Auth;
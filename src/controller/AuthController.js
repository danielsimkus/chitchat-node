
function createToken(request, response) {
    console.log("in AuthController::createToken");
    var params = request.query;
    var Auth = require("../model/Auth");
    var authInstance = new Auth();
    // ToDo: Add a way to easily modify the returned headers for json etc..
    return  authInstance.createToken(params.username, params.imageurl, params.colour, params.room);
}

function validateToken(request, response) {
    console.log("in AuthController::validateToken");
    var params = request.query;
    var Auth = require("../model/Auth");
    var authInstance = new Auth();
    return authInstance.validateToken(params.token);
}
exports.createToken = createToken;
exports.validateToken = validateToken;
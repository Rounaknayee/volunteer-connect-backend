const userTypes = require('./enum').userType;

function isUserType(req, userType){
    return req.decoded.user_type == userType;
};

module.exports = {
    isUserType
};
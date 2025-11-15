const jwt = require('jsonwebtoken')
const zlib = require('zlib')
const SESSION_TIME = process.env.SESSION_TIME;
const JWT_SECRET = process.env.JWT_SECRET;

//####################################################
//------------Generates User Session Token------------
//####################################################
const generateUserToken = (user) => {
    return jwt.sign({
        id: user.id,
        name: user.name,
        unit: user.unit,
        grade: user.grade,
        department: user.department,
        session_id:user.session_Id,
        currentPath: '/',
    }, JWT_SECRET, {
        expiresIn: SESSION_TIME
    }
    );
};

//####################################################
//--------Generates User App Permission Tokens--------
//####################################################
const generatePermissionToken = (menus) => {
    return jwt.sign({
        menus:menus,
    }, JWT_SECRET, {
        expiresIn: SESSION_TIME
    }
    );
};

module.exports = {generateUserToken,generatePermissionToken};
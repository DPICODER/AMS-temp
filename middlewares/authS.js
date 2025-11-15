const zlib = require('zlib')
const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET;
function jwtToSession(req, res, next) {
    const token = req.cookies.token;
    const premToken = req.cookies.permToken;
    // console.log("Jwt token status -> ", token ? token.length : 0);
    if (!token) {
        req.session = {};
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const permissions = jwt.verify(premToken,JWT_SECRET);
        const menusJson = JSON.parse(zlib.inflateSync(Buffer.from(permissions.menus,'base64')).toString());
        req.session = {
            user: {
                id:decoded.id,
                name:decoded.name,
                unit:decoded.unit,
                grade:decoded.grade,
                theme:decoded.theme,
                department:decoded.department,
                currentPath:decoded.currentPath||req.path,
                menus:menusJson,
                session_id:decoded.session_id
            },
        }
        req.user=decoded;

        next();
    } catch (error) {
        if(process.env.APP_ENV=='Dev'){
            logger.error(`Error:${error}`);
            logger.error(`Error-Stack:${error.stack}`);
            logger.error(`Error-Message:${error.message}`);
        }else{
            logger.error(`Error @ authS -> Req Session Storage`)
        }
        res.clearCookie('token');
        next();
    }
}




module.exports = jwtToSession;
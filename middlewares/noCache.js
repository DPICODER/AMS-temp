const logger = require("./logger");

module.exports = (req,res,next)=>{
    res.setHeader('Cache-Control','no-store');

    next();
}

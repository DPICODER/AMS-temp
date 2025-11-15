require('dotenv').config();
const { Sequelize } = require('sequelize');  // Importing Sequelize
const logger = require('../middlewares/logger'); // Adjust this path as necessary

const sequelize = new Sequelize(
  process.env.DB_CORE_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'mariadb',
    logging: (msg) => {
      if (process.env.APP_ENV === 'Prod') {
        if (msg.toLowerCase().includes('error')) {
          logger.error(msg);  // Log errors in production
        }
      } else {
        // logger.info(msg);  // Log info messages in development
      }
    }
  }
);

sequelize.authenticate().then(() => {
    sequelize.sync().then(()=>{
    console.log("core Synced");
  })
  logger.always(`Connected to mariadb, ${process.env.DB_CORE_NAME} @ ${process.env.DB_HOST}`);
}).catch(err => {
  logger.error(`Couldnt connect to mariadb, ${process.env.DB_CORE_NAME} @ ${process.env.DB_HOST}`);
  process.exit(1);
});



async function checkDBServer() {
  try {
    await sequelize.authenticate(); 
    console.log(`Could connect to mariadb, ${process.env.DB_CORE_NAME} @ ${process.env.DB_HOST}`);  
  } catch (error) {
    console.log(`Could connect to mariadb, ${process.env.DB_CORE_NAME} @ ${process.env.DB_HOST}`);
    process.exit(1);  
  } finally {
    //await sequelize.close();
    //
  }
}
checkDBServer(); 


module.exports = {
  sequelize,
};
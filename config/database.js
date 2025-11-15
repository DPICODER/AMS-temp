require("dotenv").config();
const { Sequelize } = require("sequelize");
const logger = require("../middlewares/logger"); // Adjust this path as necessary

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: "mariadb",
    logging: false, // to stop DB query messages
  }
);

sequelize.authenticate().then(() => {
  sequelize.sync()
  logger.always(`Connected to mariadb, ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
}).catch(() => {
  logger.error(`Couldnt connect to mariadb, ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
  process.exit(1);
});

async function checkDBServer() {
  try {
    await sequelize.authenticate();
    logger.trace(`Could connect to Mariadb @ ${process.env.DB_HOST}`);
  } catch (error) {
    logger.trace(`Couldn't connect to Mariadb @ ${process.env.DB_HOST}`, error);
  } finally {
    //
  }
}
checkDBServer();
module.exports = {
  sequelize,
};

require("dotenv").config();
const pino = require("pino");

const isProd = process.env.APP_ENV === "Prod";

const transport = !isProd
  ? {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss.l",
        levelFirst: true,
        ignore: "pid,hostname",
        singleLine: true,
        errorLikeObjectKeys: ["err", "error"],
        errorProps: "type,message,stack",
      },
    }
  : undefined;

const logger = pino({
  level: isProd ? "error" : "debug",
  transport,
  ...(isProd && {
    destination: "logs/error.log",
  }),
});

// Always print to stdout no matter what
logger.always = (...args) => console.log(...args);

function getCurrentDateTime() {
  const now = new Date();
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  return new Intl.DateTimeFormat("en-GB", options)
    .format(now)
    .replace(/(\d+)\/(\d+)\/(\d+),/, "$3-$2-$1");
}

module.exports = logger;

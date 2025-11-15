require("dotenv").config();
const express = require("express");
const router = express.Router();
const logger = require("../../middlewares/logger.js");
const { Op, where } = require("sequelize");
const nocache = require("../../middlewares/noCache.js");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
const isAuthenticated = require("../../middlewares/authenticate");
const Employee = require("../../models/core/Employee.js");
const { Sequelize } = require("sequelize");
const constants = require("../../models/core/Constants.js");
const today = new Date();
const time = new Date().toLocaleTimeString();

const formattedDate = `${today.getFullYear()}-${String(
  today.getDate()
).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}`;
// const { Issue, Tag, AssetLog, Acquisition, AcquisitionLineItems, Asset } = require("../../models/AQ_C.js");
const { sequelize } = require("../../config/database.js");
const httpsAgent = new https.Agent({
  cert: fs.readFileSync(path.resolve(process.env.DEV_SSL_CERT_PATH)),
  key: fs.readFileSync(path.resolve(process.env.DEV_SSL_KEY_PATH)),
  passphrase: process.env.DEV_SSL_PASS_PHRASE, // Use the correct passphrase environment variable
  rejectUnauthorized: false, // Accept self-signed certificates
});

const id = process.env.CORE_API_ID;
const password = process.env.CORE_API_PASSWORD;

router.get("/ams/asset/fetch-fill-data",
  nocache,
  isAuthenticated,
  async (req, res) => {
    logger.info("-> Ajax Calls 3 {GET}");
    const { s_id } = req.query;
    console.log('S_id', s_id);
    const value = s_id;
    try {
      const response = await axios.post(`https://172.1.6.202:3011/core/globalFetch`, new URLSearchParams({
        key: "fetchempbyname",
        value: value, // Replace with the actual employee number
        id,
        password
      }), {
        httpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      // console.log("RESPONSE :",response);

      return res.status(200).send(response.data);
    } catch (error) {
      logger.error('Error fetching employee details:', error.response ? error.response.data : error.message);
      logger.error(`Error:${error}`);
      logger.error(`Error-Stack:${error.stack}`);
      logger.error(`Error-Message:${error.message}`);
      if (error.response) {
        logger.error('Status:', error.response.status); // Print the error response status
        logger.error('Headers:', error.response.headers); // Print the error response headers
      }
      return res.status(500).json({ error: 'Error fetching employee details' });
    }
  }
);

router.get("/ams/asset/fetch-tagSuggestion", nocache, isAuthenticated, async (req, res) => {
  logger.info("-> Ajax Calls 2 {GET}");
  const { value } = req.query;
  const { type } = req.query;
  try {
    var suggestion;
    var userData;
    if (type === "empname") {
      suggestion = await Employee.findAll({
        where: {
          [Op.or]: [
            {
              NAME: {
                [Op.like]: `%${value}%`,
              },
            },
            {
              SAP_ID: {
                [Op.like]: `%${value}%`,
              },
            },
          ],
        },
        attributes: ["SAP_ID", "NAME"],
        limit: 10,
      });
      if (!suggestion) {
        logger.error(`No data Fetched `);
        res.status(400).send("No data fetched");
      } else {
        res.json(suggestion.map((suggestion) => suggestion.dataValues));
      }
    } else if (type === "sapid") {
      ////console.log("Value :", value, "\n type :", type);
      ////console.log("Automatic");

      userData = await Asset.findOne({
        where: {
          sapid: value,
        },
      });
      if (!userData) {
        logger.error(`No data Fetched`);
        res.status(400).res.send("No data found");
      } else {
        res.json(userData);
      }
    } else if (type === "phone") {
      suggestion = await Asset.findAll({
        attributes: [
          [Sequelize.fn("DISTINCT", Sequelize.col("phone")), "phone"],
        ],
        where: {
          phone: {
            [Op.like]: `${value}%`,
          },
        },
        limit: 10,
      });
      if (!suggestion) {
        logger.error(`No data Fetched `);
        res.status(400).send("No data fetched");
      } else {
        res.json(suggestion.map((suggestion) => suggestion.dataValues));
      }
    } else if (type === "building") {
      suggestion = await Asset.findAll({
        attributes: [
          [Sequelize.fn("DISTINCT", Sequelize.col("building")), "building"],
        ],
        where: {
          building: {
            [Op.like]: `${value}%`,
          },
        },
        limit: 10,
      });
      if (!suggestion) {
        logger.error(`No data Fetched `);
        res.status(400).send("No data fetched");
      } else {
        res.json(suggestion.map((suggestion) => suggestion.dataValues));
      }
    } else if (type === "designation") {
      suggestion = await Asset.findAll({
        attributes: [
          [
            Sequelize.fn("DISTINCT", Sequelize.col("designation")),
            "designation",
          ],
        ],
        where: {
          designation: {
            [Op.like]: `%${value}%`,
          },
        },
        limit: 10,
      });
      if (!suggestion) {
        logger.error(`No data Fetched `);
        res.status(400).send("No data fetched");
      } else {
        res.json(suggestion.map((suggestion) => suggestion.dataValues));
      }
    } else if (type === "dept") {
      suggestion = await Asset.findAll({
        attributes: [
          [
            Sequelize.fn("DISTINCT", Sequelize.col("department")),
            "department",
          ],
        ],
        where: {
          department: {
            [Op.like]: `${value}%`,
          },
        },
        limit: 10,
      });
      if (!suggestion) {
        logger.error(`No data Fetched `);
        res.status(400).send("No data fetched");
      } else {
        res.json(suggestion.map((suggestion) => suggestion.dataValues));
      }
    }
  } catch (error) {
    logger.error(`Error fetching suggestion :${error.message}`);
    res.status(500).json({ message: "Error fetching data" });
  }
}
);

//service allocation ajax
router.post("/ams/asset/service_assign", async (req, res) => {
  console.log("Req body :", req.body);
  const { ticket, assign } = req.body;
  const date = new Date()

  try {
    const data = await Issue.update(
      {
        r_alloted_To: assign,
        repairStatus: "In Repair",
        alloted_on: date,
        ticket_status: "InProgress"
      },
      { where: { id: ticket } }
    );
    if (data) {
      console.log("success");
      res.send(data).status(201);
    } else {
      res.send("error No data found Update Failed").status(404);
    }

  } catch (error) {
    res.send(error).status(404);
    logger.error(`Error =>: ${error.message}`);
    logger.error(`Error-Stack => : ${error.stack}`);
  }
});

router.get("/ams/asset/fetch-assetStatus", async (req, res) => {
  const { type } = req.query;

  const data = await constants.findAll({
    where: {
      c_name: "AST-Change",
      c_value_1: type,
    }, attributes: ["c_value_2", "c_value_3"],
  });
  let stats = {};
  console.log("data :", data);

  data.forEach((val) => {
    stats = [val.c_value_2, val.c_value_3];
  });
  res.json(stats);
});

router.put('/ams/asset/condemn_asset', isAuthenticated, async (req, res) => {
  logger.info(
    `Initiated Asset Condemn Transaction  ${time} : Asset condemn in progress...`
  );
  const t = await sequelize.transaction();
  try {
    const { Status, assetid, ticket_id } = req.body;
    if (Status === "Condemned") {

      const item = await Asset.findOne({ where: { id: assetid } })
      await Tag.update(
        {
          assetstatus: Status,
          department: "",
        },
        {
          where: {
            id: assetid,
          },
          transaction: t,
        }
      );

      const create = await Asset.update(
        {
          allocatedTo: "null",
          phone: null,
          building: "null",
          value: 0,
          description: item.description,
          status: Status,
          department: "null",
          uniqueId: item.uniqueId,
          sapid: null,
          designation: null,
          os: null,
          division: "null",
        },
        {
          where: { uniqueId: item.uniqueId },
          transaction: t,
        }
      );

      const data = await Issue.update(
        {
          ticket_status: Status,
        },
        {
          where: {
            id: ticket_id,
          },
        }
      );

      message = {
        msg: `Asset no [${item.uniqueId}] has been ${Status}`,
        type: "Success",
        color: "success",
      };
      const log_msg = `[UPDATED on ${formattedDate}] : Asset no [${item.uniqueId}] has been ${Status}.`;

      const logData = {
        a_u_tag: item.id,
        a_description: item.description,
        a_log: log_msg,
        a_updated_on: formattedDate,
      };
      const logCreate = await AssetLog.create(logData, { transaction: t });
      successMessage = message.msg;
      await t.commit();
      logger.info(
        `Transaction Success at ${time} : Asset Condemned.`
      );
      res.status(200).send(`${log_msg}`)
    }
  } catch (error) {
    await t.rollback();
    logger.error(`Error :${error.message}`)
    logger.error(`Error-Stack :${error.stack}`)
    logger.info(
      `Transaction Failed at ${time} while discarding Asset.`
    );
    res.status(500).send("Error")

  }
})

module.exports = router;

const express = require("express");
const router = express.Router();
//const { Sequelize } = require('sequelize');
const Login_Log = require("../../models/core/Login_Log.js"); // Adjust the path to your model
const nocache = require("../../middlewares/noCache");

const isAuthenticated = require("../../middlewares/authenticate.js");
const logger = require("../../middlewares/logger");

let successMessage = null,
  errorMessage = null;

// Route to display login logs of current user
router.get("/core/myLog",isAuthenticated, async (req, res) => {
  try {
    const ll_id = req.session.user.id; // Extract the user ID; // Get ll_id from the session
    const logs = await Login_Log.findAll({
      where: { ll_id },
      order: [["ll_login_ts", "ASC"]],
    });
    //logger.info(logs);
    successMessage = "Log Loaded";
    res.render("core/userLog", {
      title: "Your Logs",
      logs,
      errorMessage: errorMessage,
      successMessage: successMessage,
    });
  } catch (error) {
    logger.error("Cant Fetch Logs:", error);
    const errorMessage = `Log Fetch Error: ${error.message}`;
    res.redirect("/core/userLog", {
      title: "Log",
      successMessage: successMessage,
      errorMessage: errorMessage,
    });
  }
});

// Route to display login logs
router.get("/core/allLog",isAuthenticated, async (req, res) => {
  try {
    //const ll_id = req.params.id; // Extract the user ID; // Get ll_id from the session
    const logs = await Login_Log.findAll({ order: [["ll_login_ts", "ASC"]] });
    successMessage = "Log Loaded";
    res.render("core/userLog", {
      title: "All Users Logs",
      logs,
      errorMessage: errorMessage,
      successMessage: successMessage,
    });
  } catch (error) {
    logger.error("Cant Fetch Logs:", error);
    const errorMessage = `Log Fetch Error: ${error.message}`;
    res.redirect("/core/userLog", {
      title: "Log",
      successMessage: successMessage,
      errorMessage: errorMessage,
    });
  }
});
module.exports = router;

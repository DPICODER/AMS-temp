const express = require("express");
const router = express.Router();
const Login_Log = require("../../models/core/Login_Log.js"); // Adjust the path to your model
const User = require("../../models/core/Users.js");
const bcrypt = require("bcrypt");
const isAuthenticated = require("../../middlewares/authenticate.js");
const nocache = require("../../middlewares/noCache");
const {
  getUserById,
  updateSessionId,
  Session,
} = require("../../config/core_db.js"); // Update this path according to your project structure
const UserMenu = require("../../models/core/UserMenu.js"); // Adjust path as necessary
const AppMenu = require("../../models/core/AppMenu.js"); // Adjust path as necessary
let errorMessage = null,
  successMessage = null;
const { Op } = require("sequelize");
const logger = require("../../middlewares/logger");
const os = require("os");
function getIPAddress() {
  const interfaces = os.networkInterfaces();
  for (let iface in interfaces) {
    for (let alias of interfaces[iface]) {
      if (alias.family === "IPv4" && !alias.internal) {
        // IPv4 and not internal
        return alias.address;
      }
    }
  }
  return "127.0.0.1"; // Default to localhost if no IP found
}
router.get("/", async (req, res) => {
  // req.session.appname = process.env.APP_NAME;
  // await req.session.save();
  res.redirect('/ams/login');
});
router.get("/ams", async (req, res) => {
  // req.session.appname = process.env.APP_NAME;
  // await req.session.save();
  res.redirect('/ams/login');
});

router.get("/ams/home", (req, res) => {
  res.render("ams/flow", {
    successMessage: successMessage,
    errorMessage: errorMessage,
    title: "Process Flow of ams",
  });
});

router.get("/ams/login", (req, res) => {
  // res.redirect(`https://${process.env.SESSION_DOMAIN}:3003/`)
  res.render("ams/login", { errorMessage: errorMessage });
});

// Login route
router.post("/ams/login", async (req, res) => {
  // res.redirect(`https://${process.env.SESSION_DOMAIN}:3011/`)
  logger.info(`Login Routes ${req.path}`);
  const { u_id, u_password } = req.body;
  console.log("CRED ",u_id,u_password);
  
  try {
    const user = await User.findOne({ where: { u_id } });
    const currentDate = new Date();
    const userDOR = user ? new Date(user.u_dor) : null;

    switch (true) {
      case !user:
        errorMessage = "Invalid username or password";
        await log_login(req, u_id, 0);
        res.render("ams/login", { errorMessage: errorMessage });
        break;

      case !bcrypt.compareSync(u_password, user.u_password):
        errorMessage = "Invalid username or password";
        await log_login(req, u_id, 0);
        res.render("ams/login", { errorMessage: errorMessage });
        break;

      case userDOR && userDOR < currentDate:
        errorMessage = "User DOR is in the past. Please contact administrator.";
        await log_login(req, user.u_id, 0);
        res.render("ams/login", { errorMessage: errorMessage });
        break;

      default:
        const u_app = process.env.APP_NAME || "AMS"; // Read app name from environment variables
        const user_menu_array = await fetchUserMenuArray(user.u_id, u_app);
        const menus = await getMenuTree(0, "1", user_menu_array, u_app);
        const user_id = user.u_id;
        const existingSession = await getUserById(user_id);



        if (existingSession) {
          // Destroy the existing session , new session is created by authenticate.js
          await existingSession.destroy();
          successMessage = 'Old session replaced with New, as only one session per ID is allowed';
        } else {
          successMessage = ' Welcome, New session Created and Data Loaded.';
        }
        logger.info(successMessage);
        // Create a new session and save it in Sequelize session
        req.session.user = {
          id: user.u_id,
          department: user.u_department,
          name: user.u_name,
          unit: user.u_unit,
          grade: user.u_unit,
          theme: user.u_theme,
          menus: menus,

        };
        req.session.menus = menus; // Save menu in session
        req.session.message = successMessage; //save session message in session for using in dashboard/home
        await log_login(req, user.u_id, 1);
        const s_user = req.session.user;
        req.session.menus = menus; // Save menu in session
        req.session.message = successMessage; //save session message in session for using in dashboard/home
        await log_login(req, user.u_id, 1);
        const user_department = req.session.user.department;
        const user_menus = req.session.user.menus;

        if (user_menus.find(menu => menu.link === '#Home')?.children.some(child => child.link === '/ams/asset/dashboard')) {
          res.redirect("/ams/asset/dashboard");
        } else if (user_menus.find(menu => menu.link === '#Home')?.children.some(child => child.link === '/ams/asset/user/dashboard')) {
          res.redirect("/ams/asset/user/dashboard");
        } else if (user_menus.find(menu => menu.link === '#Home')?.children.some(child => child.link === '/ams/asset/service_dashboard')) {
          res.redirect("/ams/asset/service_dashboard");
        } else if (user_menus.find(menu => menu.link === '#Home')?.children.some(child => child.link === '/ams/asset/tickets_dashboard')) {
          res.redirect("/ams/asset/tickets_dashboard?type=All tickets");
        }
        break;
    }
  } catch (error) {
    errorMessage = "Please try again later.:" + error;
    logger.error("Login error:", error);
    res.render("ams/login", { errorMessage: errorMessage });
  }
});


// Logout route
router.get("/ams/logout", isAuthenticated, async (req, res) => {
  const TimeOut = req.query.TimeOut || null;

  logger.info(`Login Routes ${req.path}  , Timeout ${TimeOut}`);
  let errorMessage = "";
  try {
    await log_logout(req.session.user.id); // Update logout log
    res.clearCookie("token");
    if (TimeOut) {
      errorMessage = TimeOut;
    } else {
      errorMessage = "Logged out! Please relogin.";
    }
    res.redirect(`https://${process.env.SESSION_DOMAIN}:3011/`)
  } catch (error) {
    logger.error("Error during logout:", error);
    errorMessage = "Logout error: " + error;
    res.redirect(`https://${process.env.SESSION_DOMAIN}:3011/`)
  }
});

router.get('/ams/session-time-left', isAuthenticated, (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ timeLeft: 0 });
  }

  try {
    const decoded = require('jsonwebtoken').decode(token);
    if (!decoded || !decoded.exp) {
      return res.json({ timeLeft: 0 });
    }

    const now = Math.floor(Date.now() / 1000);
    const timeLeft = (decoded.exp - now) * 1000;

    return res.json({
      timeLeft: timeLeft > 0 ? timeLeft : 0,
      userID: decoded.user ? id : null
    });

  } catch (error) {
    return res.json({ timeLeft: 0 });
  }

})
// Middleware to get client IP address
const getClientIp = (req) => {
  return req.headers["x-forwarded-for"] || req.connection.remoteAddress;
};

// Middleware to get browser/OS details
const getClientDetails = (req) => {
  return req.headers["user-agent"];
};
//Insert Log login time to lll
async function log_login(req, ll_id, ll_attempt) {
  try {
    //const { id: ll_id } = req.session.user; // Get u_id from the session as ll_id
    const ll_client = getClientIp(req); // Capture client IP address
    const clientDetails = getClientDetails(req); // Capture browser/OS details
    const ll_msg = clientDetails; // Store only the client details in ll_msg

    // Get the current timestamp in your local timezone
    const currentTimestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    // Insert a new login log
    const newLoginLog = await Login_Log.create({
      ll_id,
      ll_client,
      ll_attempt: !!ll_attempt, // Convert 0 or 1 to true or false
      ll_msg,
      ll_login_ts: currentTimestamp, // Set the login timestamp to the current time in local timezone
    });

    logger.info("Login", ll_id), newLoginLog;
    // return newLoginLog;
  } catch (error) {
    logger.error("Error creating login log:", ll_id, error);
    // throw error;
  }
}
//Update Log logout to ll
async function log_logout(ll_id) {
  try {
    // Find the latest login log record for the given ll_id
    const latestLog = await Login_Log.findOne({
      where: { ll_id },
      order: [["ll_login_ts", "DESC"]], // Ensure to order by ll_login_ts
    });
    // logger.log('Latest Log:', latestLog); // Log the result of the query

    if (latestLog) {
      const currentTimestamp = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      // Update the ll_logout_ts field to the current timestamp
      const newLogoutLog = await Login_Log.update(
        { ll_logout_ts: currentTimestamp }, // Set logout timestamp to the current time in local timezone
        {
          where: {
            ll_id,
            ll_login_ts: latestLog.ll_login_ts, // Ensure to match the latest login timestamp
          },
        }
      );
      logger.info("Logout", ll_id, newLogoutLog);
    } else {
      logger.info("No login log record found for the given ll_id.");
    }
  } catch (error) {
    logger.error("Error updating login log:", ll_id, error);
    //throw error;
  }
}

async function fetchUserMenuArray(u_id, u_app_name) {
  // For admin users, return all menu IDs
  if (u_id === 9999 || u_id === 999999) {
    const allMenus = await AppMenu.findAll({
      where: { am_app_name: u_app_name },
    });
    return allMenus.map((menu) => menu.am_id);
  }

  // Fetch user menus for the given user ID and application name
  const userMenus = await UserMenu.findAll({
    where: { um_u_id: u_id, um_app_name: u_app_name },
  });

  // Return the IDs of the user menus
  return userMenus.map((menu) => menu.um_menu_id);
}
// Fetch menus with the given parent ID and status for the specified application name
async function getMenuTree(
  m_parent_id,
  m_status,
  user_menu_array,
  am_app_name,
  isAdmin
) {
  /*const menus = await AppMenu.findAll({
        where: {
            am_parent_id: m_parent_id, am_app_name: am_app_name,
            [Op.or]: [{ am_status: '1' }, { am_status: '2' }]
        }
    }); */
  const menus = await AppMenu.findAll({
    where: {
      am_parent_id: m_parent_id,
      am_app_name: am_app_name,
      [Op.or]: [{ am_status: "1" }, { am_status: "2" }],
    },
    order: [["am_parent_id", "ASC"]],
  });

  const menuTree = [];
  for (const menu of menus) {
    // Include menu only if it is in user_menu_array for non-admin users
    if (isAdmin || user_menu_array.includes(menu.am_id)) {
      const children = await getMenuTree(
        menu.am_id,
        m_status,
        user_menu_array,
        am_app_name,
        isAdmin
      );
      menuTree.push({
        id: menu.am_id,
        name: menu.am_name,
        link: menu.am_link,
        icon: menu.am_icon,
        status: menu.am_status,
        tooltip: null,
        // tooltip: menu.am_tooltip,
        children,
        isChecked: user_menu_array.includes(menu.am_id),
      });
    }
  }

  return menuTree;
}

module.exports = router;

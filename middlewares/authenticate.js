const jwt = require("jsonwebtoken");
const logger = require("./logger");
const jwtToSession = require("./authS");
const zlib = require("zlib");
const {
  generateUserToken,
  generatePermissionToken,
} = require("../utils/generateJWT");
const JwtSessionStore = require("../models/core/JwtSessionStore");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;


//####################################################
//----------Load Allowed Paths from dotenv------------
//####################################################
const allowedPaths = parseAllowedPaths(process.env.APP_ALLOWED_PATHS);

//#######################################################
//--Helper function to parse and prepare allowed paths---
//#######################################################
function parseAllowedPaths(appAllowedPaths) {
  if (!appAllowedPaths) {
    return [
      "/",
      "/gst/dashboard",
      "/gst/login",
      "/gst/logout",
      "/gst/globalFetch",
      "/gst/datalogs/logs/details",
      "/gst/logout",
    ];
  }
  return appAllowedPaths.split(",").map((path) => {
    const trimmedPath = path.trim();
    if (trimmedPath.includes(":id")) {
      return new RegExp(`^${trimmedPath.replace(":id", "\\d+")}$`);
    }
    return trimmedPath;
  });
}

//####################################################
//--Utility function to check if a path is allowed----
//####################################################
function isPathAllowed(path, allowedPaths) {
  try {
    const allowedPathUpdated = allowedPaths.find(
      (iterPath) => iterPath === path
    );
    return allowedPathUpdated ? true : false;
  } catch (error) {
    logger.error("Error occured at Path Allowed Check");
    return false;
  }
}

//####################################################
//-----Remove any Tailing numbers in Request PATH-----
//####################################################
const stripTailingNumberFromPath = (path) => {
  if (typeof path !== "string") return "";
  return path
    .trim()
    .replace(/(\/\d+)+$/, "")
    .replace(/\/$/, ""); //Regular Expression to remove Number in path
};

//###########################################################################################################################
// //-----strips parmas from fetched path from database  /abc/view/:id -> /abc/view =>helps for better path comparision-----
//###########################################################################################################################
const stripParamsFromMenuPath = (path) => {
  if (typeof path !== "string" || path === undefined) return "";
  return path
    .trim()
    .replace(/\/:.*$/, "")
    .replace(/\/$/, ""); //Regular Expression to remove :id in path
};

//####################################################################
//-----Utility function to check if a page is in the user's menu-----
//####################################################################
function isPageInMenus(menus, requestedPage) {
  const normalizedPath = stripTailingNumberFromPath(requestedPage);
  for (const menu of menus) {
    if (stripParamsFromMenuPath(menu) === normalizedPath) {
      return true;
    }
  }
  return false;
}

//####################################################
//------Check session remaining time to refresh-------
//####################################################
function checkSessionTimeValidity(req, res) {
  const currentTime = Math.floor(Date.now() / 1000);
  const expiryTime = req.user.exp;
  const remainingTime = expiryTime - currentTime;
  if (remainingTime < 600) {
    const existingSessionID = req.session?.user?.session_id;
    const userData = {
      ...req.session.user,
      session_Id: existingSessionID,
    };
    const userPayload = generateUserToken(userData);
    res.cookie("token", userPayload, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 20 * 60 * 1000,
      path: "/",
    });
    jwtToSession(req, res, () => { });
    return true;
  }
  return false;
}

//####################################################
//-----Check if Session Exist's in Database s_id------
//####################################################
async function inDBSession(req, res, next) {
  const user_id = req.session?.user.id;
  const session_id = req.session?.user?.session_id;
  if (!user_id) {
    return false;
  }
  const userSessionInDb = await JwtSessionStore.findOne({
    where: { user_id },
    raw: true,
    order: [["id", "DESC"]],
  });
  if (!userSessionInDb) {
    return false;
  } else {
    if (userSessionInDb?.user_id == user_id) {
      if (userSessionInDb?.session_unique == session_id) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
}

//####################################################
//-----------Middleware Main Execution block----------
//####################################################
module.exports = async (req, res, next) => {
  // const user = req.session?.user;
  try {
    console.log("bypasssing middleware");

    req.session = req.session || {};


  req.session.user = {
    id: 201,
    department: "ITD",
    name: "Sai",
    unit: "KBU",
    grade: "G1",
    theme: "dark",
    session_id: "SYNTH-SESSION-001",
    menus: [
      "/ams/dashboard",
      "/ams/globalFetch",
      "/ams/datalogs/logs/details",
      "/ams/report/view",
      "/ams/settings",
    ]
  };

    // <- IMPORTANT FIX
    
    //   logger.warn(`current PATH : ${req.path}`);
    //   const currentDomain = req.hostname || req.headers.host;
    //   //####################################################
    //   //-----Domain check if server is up on given domain---
    //   //####################################################
    //   if (currentDomain !== process.env.SESSION_DOMAIN) {
    //     return res
    //       .status(401)
    //       .render("core/login", {
    //         errorMessage: "Domain Mismatch. Please Login.",
    //       });
    //   }

    //   //####################################################
    //   //-Determines if the request is an XHR/Fetch request--
    //   //####################################################
    //   const requestedWith = (req.headers["x-requested-with"] || "").toLowerCase();
    //   const isXHR = req.xhr || requestedWith === "xmlhttprequest";
    //   const isFetch =
    //     (req.headers["content-type"] || "")?.includes("application/json") ||
    //     ["fetch-client", "fetch", "tabulator"].includes(requestedWith);

    //   if (!user) {
    //     logger.info("No JWT user Session found . Redirecting to login");
    //     const message =
    //       "You've been signed out due to inactivity or a new login from another device. For security reasons,please log in again to continue.";
    //     return res.redirect(
    //       `https://${process.env.SESSION_DOMAIN}:3011/core/login?errorMessage=${message}`
    //     );
    //   }

    //   /**
    //    * Allows AJAX || FETCH requests (if session exists)
    //    * This check is moved up for efficiency as XHR/Fetch requests often don't need full DB session validation
    //    */
    //   if (!(await inDBSession(req, res))) {
    //     logger.info("DataBase check level-1 ");
    //     logger.debug(`Session MissMatch`);
    //     const message = "No DB session Found Please Login.";
    //     return res.redirect(
    //       `https://${process.env.SESSION_DOMAIN}:3011/core/login?errorMessage=${message}`
    //     );
    //   }

    //   if (isPathAllowed(req.path, allowedPaths)) {
    //     logger.debug(
    //       `access Granted: ${req.path} hasPermission: [${isPathAllowed(
    //         req.path,
    //         allowedPaths
    //       )}]`
    //     );
    //     return next(); // public path, allow
    //   }

    //   if ((isXHR || isFetch) && user) {
    //     logger.info(
    //       `XHR/Fetch request for authenticated user ${user.id}. Bypassing full CRED validation.`
    //     );
    //     return next();
    //   }

    //   /**
    //    * If you have menu/roles stored in token or can fetch from DB, validate access
    //    */
    //   if (
    //     (await inDBSession(req, res)) &&
    //     req.session.user.menus &&
    //     isPageInMenus(req.session.user.menus, req.path)
    //   ) {
    //     logger.info("DataBase check level-2 ");
    //     const validity = checkSessionTimeValidity(req, res);
    //     logger.debug("access Granted from req.session.user.menus");
    //     return next();
    //   }

    //####################################################
    //-----Admin override Full Access All Permissions-----
    //####################################################
    // if (req.user.sub === 9999 || req.user.sub === 999999) {
    //   logger.debug(`Admin total Bypass Validataions`);
    //   return next();
    // }
    return next();

    return res.status(403).send("Unauthorized Access");
  } catch (error) {
    logger.error(`Error in Authentication Middleware`);
    return next(error);
  }
};

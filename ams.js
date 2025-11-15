// app.js
const express = require('express');
const path = require('path');
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();
NODE_MODULE_PATH=path.resolve(__dirname, process.env.NODE_MODULE_PATH)||'../node_modules';
PUBLIC_PATH=path.resolve(__dirname, process.env.PUBLIC_PATH)||'../public';
const https = require("https");

const app = express();


// Middleware
app.set("view engine", "ejs");

app.use(express.json({limit:'10mb'}));
app.use(express.urlencoded({ limit:'10mb' , extended: true }));
// app.use(cookieparser());
//static
app.use("/ams", express.static(PUBLIC_PATH));
app.set("views", path.join(__dirname, "views"));
// Serve static files from node_modules
app.use("/ams/css", express.static(path.join(NODE_MODULE_PATH, "jquery-ui/dist/themes/base")));
app.use("/ams/css", express.static(path.join(NODE_MODULE_PATH, "bootstrap/dist/css")));
app.use("/ams/css", express.static(path.join(NODE_MODULE_PATH, "bootstrap-icons/font")));
app.use("/ams/css", express.static(path.join(NODE_MODULE_PATH, "datatables.net-bs4/css")));
app.use("/ams/css", express.static(path.join(NODE_MODULE_PATH, "datatables.net-buttons-bs4/css")));
app.use("/ams/css", express.static(path.join(NODE_MODULE_PATH, "datatables.net-dt/css")));
app.use("/ams/css", express.static(path.join(NODE_MODULE_PATH, "datatables.net-buttons-dt/css")));
app.use("/ams/js", express.static(path.join(NODE_MODULE_PATH, "jquery/dist")));
app.use("/ams/js", express.static(path.join(NODE_MODULE_PATH, "jquery-ui/dist/")));
app.use("/ams/js", express.static(path.join(NODE_MODULE_PATH, "chart.js/dist/")));
app.use("/ams/js", express.static(path.join(NODE_MODULE_PATH, "datatables.net/js")));
app.use("/ams/js", express.static(path.join(NODE_MODULE_PATH, "datatables.net-buttons/js")));
app.use("/ams/js", express.static(path.join(NODE_MODULE_PATH, "popper.js/dist/umd")));
app.use("/ams/js", express.static(path.join(NODE_MODULE_PATH, "bootstrap/dist/js")));
app.use("/ams/js", express.static(path.join(NODE_MODULE_PATH, "jszip/dist")));
app.use("/ams/js", express.static(path.join(NODE_MODULE_PATH, "pdfmake/build")));
app.use('/ams/tabulator', express.static(path.join(NODE_MODULE_PATH, 'tabulator-tables')));
app.use("/ams/js", express.static(path.join(NODE_MODULE_PATH, "jspdf/dist")));
app.use("/ams/js", express.static(path.join(NODE_MODULE_PATH, "xlsx/dist")));

// seed a fake session user for dev/testing (move this BEFORE route mounts)
app.use(function (req, res, next) {
  req.session = req.session || {};   // In case session is not initialized

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

  // Make available to views as `user`
  res.locals.user = req.session.user;
  next();
});


app.use("/", require("./routes/ams/AjaxRoutes.js")); //All ajax calls
// app.use("/", require('./routes/FromPoRoutes.js'))//fetching required po's and either generating tags or alloting assets
app.use("/", require("./routes/ams/acquisitionRoutes.js")); // Use the asset routes
app.use("/", require("./routes/ams/loginRoutes.js")); // Login, logout, menu build and log entry to DB
app.use("/", require("./routes/core/logRoutes.js")); // User login and logout display pages
app.use("/", require("./routes/core/myProfileRoutes.js")); // Self profile, password change pages
app.use("/", require("./routes/core/accessRoutes.js")); // Access Menu Manager to User
app.use("/", require("./routes/core/appMenuRoutes.js")); // Edit Access Menu List in DB
app.use("/", require("./routes/ams/dashboardRoutes.js")); // View of the main dashboard and its details
app.use("/", require("./routes/ams/allotAssetRoutes.js")); // routes for allotment of assets
app.use("/", require("./routes/ams/IssueRoutes.js"));
app.use("/", require("./routes/ams/assetMasterRoutes.js"));
app.use("/", require("./routes/ams/adminIssues.js"));
app.use("/", require("./routes/ams/technicianRoutes.js"));


app.use("/", require("./routes/ams/mapAssetRoutes.js"));
app.use("/", require("./routes/ams/userDashboardRoutes.js"));
// Example route
// app.get('/', (req, res) => {
//   res.redirect('/ams/login')
// });

// API route example
app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});



// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

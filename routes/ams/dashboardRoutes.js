// routes/ams/dashboardRoutes.js

const express = require("express");
const router = express.Router();
const { sequelize } = require("../../config/database");
const { QueryTypes } = require("sequelize");
const isAuthenticated = require("../../middlewares/authenticate");
const logger = require("../../middlewares/logger");

const User = require("../../models/core/Users");

// Helpers
function zeroArray(n = 12) {
  return Array.from({ length: n }).map(() => ({ asset_count: 0 }));
}

function formatMonthlyResults(rows) {
  const result = zeroArray();
  rows.forEach((r) => {
    const m = Number(r.month) - 1;
    if (m >= 0 && m < 12) result[m].asset_count = Number(r.asset_count);
  });
  return result;
}

router.get("/ams/asset/dashboard", isAuthenticated, async (req, res) => {
  logger.info("-> Asset Dashboard (Using asset.type classification)");

  try {
    /* ---------------------------------------------------------
       1. Identify User
    --------------------------------------------------------- */
    const userName = req.session.user.name;
    const currentUser = await User.findOne({ where: { u_name: userName } });
    if (!currentUser) return res.redirect("/ams");

    const adminDept = currentUser.u_department;

    /* ---------------------------------------------------------
       2. TOTAL ASSETS = SUM(procured_quantity)
    --------------------------------------------------------- */
    const totalAssetsRow = await sequelize.query(
      `SELECT COALESCE(SUM(aq_qty),0) AS total
       FROM Acquisition
       WHERE aq_dept = :dept`,
      { replacements: { dept: adminDept }, type: QueryTypes.SELECT }
    );
    const totalAssets = Number(totalAssetsRow[0]?.total || 0);

    /* ---------------------------------------------------------
       3. TOTAL VALUE = SUM(aq_po_value)
    --------------------------------------------------------- */
    const totalValueRow = await sequelize.query(
      `SELECT COALESCE(SUM(aq_po_value),0) AS total
       FROM Acquisition
       WHERE aq_dept = :dept`,
      { replacements: { dept: adminDept }, type: QueryTypes.SELECT }
    );
    const totalValue = Number(totalValueRow[0]?.total || 0);

    /* ---------------------------------------------------------
       4. ASSET DISTRIBUTION USING assets.type
    --------------------------------------------------------- */
    const distRows = await sequelize.query(
      `
      SELECT 
          a.type AS category,
          COUNT(*) AS cnt
      FROM assets a
      INNER JOIN Acquisition aq ON aq.aq_po_no = a.po_no
      WHERE aq.aq_dept = :dept
      GROUP BY a.type
      ORDER BY cnt DESC
      `,
      { replacements: { dept: adminDept }, type: QueryTypes.SELECT }
    );

    const pielabels = distRows.map((r) => r.category || "Others");
    const pie_a_cnt = distRows.map((r) => Number(r.cnt));

    /* ---------------------------------------------------------
       5. LATEST ALLOCATION SUBQUERY
    --------------------------------------------------------- */
    const latestAllocSubquery = `
      SELECT a.*
      FROM allocation a
      INNER JOIN (
        SELECT al_uniqueId, MAX(al_id) AS maxid
        FROM allocation
        GROUP BY al_uniqueId
      ) mx ON mx.al_uniqueId = a.al_uniqueId AND mx.maxid = a.al_id
    `;

    /* ---------------------------------------------------------
       6. STATUS COUNTS
    --------------------------------------------------------- */
    const statusCounts = await sequelize.query(
      `
      SELECT
        SUM(CASE WHEN la.al_status IN ('Alloted','Reallocated') AND la.al_active = 1 THEN 1 END) AS allocated_count,
        SUM(CASE WHEN la.al_status = 'Free' AND la.al_active = 1 THEN 1 END) AS free_count,
        SUM(CASE WHEN la.al_status = 'Repair' AND la.al_active = 1 THEN 1 END) AS repair_count,
        SUM(CASE WHEN la.al_status = 'Condemned' THEN 1 END) AS condemned_count
      FROM (${latestAllocSubquery}) la
      INNER JOIN assets a ON a.tag = la.al_uniqueId
      INNER JOIN Acquisition aq ON aq.aq_po_no = a.po_no
      WHERE aq.aq_dept = :dept
      `,
      { replacements: { dept: adminDept }, type: QueryTypes.SELECT }
    );

    const allocated = Number(statusCounts[0].allocated_count || 0);
    const freeAssets = Number(statusCounts[0].free_count || 0);
    const repairAssets = Number(statusCounts[0].repair_count || 0);
    const condemnedAssets = Number(statusCounts[0].condemned_count || 0);

    /* ---------------------------------------------------------
       7. UTILIZATION
    --------------------------------------------------------- */
    const utilization =
      totalAssets > 0 ? Number(((allocated / totalAssets) * 100).toFixed(2)) : 0;

    /* ---------------------------------------------------------
       8. DEPT-WISE OWNERSHIP COUNTS
    --------------------------------------------------------- */
    const deptDist = await sequelize.query(
      `
      SELECT aq.aq_dept AS department, COUNT(*) AS assetCount
      FROM assets a
      INNER JOIN Acquisition aq ON aq.aq_po_no = a.po_no
      GROUP BY aq.aq_dept
      ORDER BY assetCount DESC
      LIMIT 20
      `,
      { type: QueryTypes.SELECT }
    );

    const deptLabels = deptDist.map((r) => r.department);
    const dept_a_cnt = deptDist.map((r) => Number(r.assetCount));

    /* ---------------------------------------------------------
       9. MONTHLY TRENDS
    --------------------------------------------------------- */
    const year = new Date().getFullYear();

    const monthlyAllocated = await sequelize.query(
      `
      SELECT MONTH(la.al_allocated_on) AS month, COUNT(*) AS asset_count
      FROM (${latestAllocSubquery}) la
      INNER JOIN assets a ON a.tag = la.al_uniqueId
      INNER JOIN Acquisition aq ON aq.aq_po_no = a.po_no
      WHERE aq.aq_dept = :dept
        AND la.al_status IN ('Alloted','Reallocated')
        AND YEAR(la.al_allocated_on) = :year
      GROUP BY month
      `,
      { replacements: { dept: adminDept, year }, type: QueryTypes.SELECT }
    );

    const monthlyCondemned = await sequelize.query(
      `
      SELECT MONTH(la.updatedAt) AS month, COUNT(*) AS asset_count
      FROM (${latestAllocSubquery}) la
      INNER JOIN assets a ON a.tag = la.al_uniqueId
      INNER JOIN Acquisition aq ON aq.aq_po_no = a.po_no
      WHERE aq.aq_dept = :dept
        AND la.al_status = 'Condemned'
        AND YEAR(la.updatedAt) = :year
      GROUP BY month
      `,
      { replacements: { dept: adminDept, year }, type: QueryTypes.SELECT }
    );

    const monthlyRepair = await sequelize.query(
      `
      SELECT MONTH(la.updatedAt) AS month, COUNT(*) AS asset_count
      FROM (${latestAllocSubquery}) la
      INNER JOIN assets a ON a.tag = la.al_uniqueId
      INNER JOIN Acquisition aq ON aq.aq_po_no = a.po_no
      WHERE aq.aq_dept = :dept
        AND la.al_status = 'Repair'
        AND YEAR(la.updatedAt) = :year
      GROUP BY month
      `,
      { replacements: { dept: adminDept, year }, type: QueryTypes.SELECT }
    );

    const assetCounts = formatMonthlyResults(monthlyAllocated);
    const cond_monthRes = formatMonthlyResults(monthlyCondemned);
    const repair_monthRes = formatMonthlyResults(monthlyRepair);

    /* ---------------------------------------------------------
       10. TICKET COUNTS
    --------------------------------------------------------- */
    const ticketRows = await sequelize.query(
      `
      SELECT
        COUNT(ai.issue_id) AS total,
        SUM(CASE WHEN ai.status IN ('Open','Assigned','InRepair','WaitingForPart') THEN 1 END) AS pending,
        SUM(CASE WHEN ai.status IN ('Resolved','Closed') THEN 1 END) AS closed
      FROM asset_issues ai
      INNER JOIN assets a ON ai.tag = a.tag
      INNER JOIN Acquisition aq ON aq.aq_po_no = a.po_no
      WHERE aq.aq_dept = :dept
      `,
      { replacements: { dept: adminDept }, type: QueryTypes.SELECT }
    );

    const ticketResults = [
      {
        t_tickets: Number(ticketRows[0].total || 0),
        t_pending: Number(ticketRows[0].pending || 0),
        t_closed: Number(ticketRows[0].closed || 0),
      },
    ];

    /* ---------------------------------------------------------
       11. RENDER DASHBOARD
    --------------------------------------------------------- */
    return res.render("ams/dashboard", {
      title: "Asset Management Dashboard",
      finalTotal: totalAssets,
      totalValue,
      freeAssets,
      discardedAssets: condemnedAssets,
      repairAssets,
      u_department: adminDept,
      utilization,
      deptLabels,
      dept_a_cnt,
      pielabels,
      pie_a_cnt,
      assetCounts,
      cond_monthRes,
      repair_monthRes,
      ticketResults,
      userAssets: null,
      assetAllocations: [],
      u_id: req.session.user.id,
      successMessage: `Welcome ${currentUser.u_name}`,
      errorMessage: null,
    });

  } catch (err) {
    logger.error("DASHBOARD ERROR => " + err.message + "\n" + err.stack);
    return res.render("ams/dashboard", {
      title: "Asset Management Dashboard",
      finalTotal: 0,
      totalValue: 0,
      freeAssets: 0,
      discardedAssets: 0,
      repairAssets: 0,
      utilization: 0,
      deptLabels: [],
      dept_a_cnt: [],
      pielabels: [],
      pie_a_cnt: [],
      assetCounts: zeroArray(),
      cond_monthRes: zeroArray(),
      repair_monthRes: zeroArray(),
      ticketResults: [{ t_tickets: 0, t_pending: 0, t_closed: 0 }],
      errorMessage: "Failed to load dashboard",
    });
  }
});

module.exports = router;

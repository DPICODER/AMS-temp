const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const isAuthenticated = require('../../middlewares/authenticate');
const AssetIssue = require('../../models/AssetIssues');
const Assets = require('../../models/Assets');
const Users = require('../../models/core/Users');
const issueService = require('../../services/issueService');
const { AssetLog } = require('../../models');
const Allocation = require('../../models/Allocation')

// --------------------------------------------------------------------
// PAGE: List all open tickets
// --------------------------------------------------------------------
router.get('/ams/admin/issues', isAuthenticated, async (req, res) => {
  try {
    const issues = await AssetIssue.findAll({
    where: {
        status: {
        [Op.in]: ['Open', 'Assigned', 'InRepair', 'Resolved']   // <— ADD THIS
        }
    },
    order: [['createdAt', 'DESC']]
    });


    const enriched = await Promise.all(
      issues.map(async i => {
        const asset = await Assets.findOne({ where: { tag: i.tag } });
        const user = await Users.findOne({ where: { u_id: i.raised_by } });

        return {
          ...i.get({ plain: true }),
          asset_description: asset?.description || 'Unknown',
          raised_user: user?.u_name || 'User'
        };
      })
    );

    res.render('ams/admin/issues/list-issues', {
      title: "Issue List",
      issues: enriched,
      successMessage:`Welcome ${req.session.user.name}`,
      errorMessage:null
    });

  } catch (err) {
    console.error(err);
    res.render('ams/admin/issues/list-issues', {
      title: "Issue List",
      issues: [],
      errorMessage: "Failed to load issues",
        successMessage:`Welcome ${req.session.user.name}`,
    });
  }
});

router.get('/ams/admin/issues/finalize', isAuthenticated, async (req, res) => {
  try {
    const issues = await AssetIssue.findAll({
      where: { status: 'Resolved' },
      include: [
        { model: Assets, as: 'asset', required: true }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.render('ams/admin/issues/pending-finalization', {
      title: 'Finalize Repaired Assets',
      issues,
      successMessage: null,
      errorMessage: null
    });

  } catch (err) {
    console.error(err);
    res.render('ams/admin/issues/pending-finalization', {
      title: 'Finalize Repaired Assets',
      issues: [],
      successMessage: null,
      errorMessage: 'Failed to load'
    });
  }
});
router.post('/ams/admin/issues/finalize', isAuthenticated, async (req, res) => {
  try {
    const adminId = req.session.user.id;
    const { issue_id, action, emp } = req.body;   // <-- FIX HERE

    const result = await issueService.adminFinalizeRepair({
      issue_id,
      adminId,
      action,
      emp   // <-- MUST PASS TO SERVICE
    });

    return res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success:false, message: err.message });
  }
});




// --------------------------------------------------------------------
// PAGE: Single Issue Details
// --------------------------------------------------------------------
router.get('/ams/admin/issues/:id', isAuthenticated, async (req, res) => {
  try {
    const issue = await AssetIssue.findByPk(req.params.id);
    if (!issue) return res.redirect('/ams/admin/issues');

    const asset = await Assets.findOne({ where: { tag: issue.tag } });
    const user = await Users.findOne({ where: { u_id: issue.raised_by } });
    // 🔥 Fetch all logs for this asset
    const logs = await AssetLog.findAll({
      where: { al_uniqueId: issue.tag },
      order: [['createdAt', 'ASC']]
    });

    res.render('ams/admin/issues/issue-details', {
      title: `Issue #${issue.issue_id}`,
      issue,
      asset,
      raisedUser: user,
      logs,                   // <-- MUST PASS THIS
      successMessage:`Welcome ${req.session.user.name}`,
      errorMessage:null
    });

  } catch (err) {
    console.error(err);
    res.redirect('/ams/admin/issues');
  }
});


// --------------------------------------------------------------------
// POST: Assign technician
// --------------------------------------------------------------------
router.post('/ams/admin/issues/assign', isAuthenticated, async (req, res) => {
  try {
    const issue = await issueService.assignTechnician({
      issue_id: req.body.issue_id,
      technicianId: req.body.technicianId,
      adminId: req.session.user.id
    });

    return res.json({ success: true, issue });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------
// POST: Technician completes
// --------------------------------------------------------------------
router.post('/ams/admin/issues/resolve', isAuthenticated, async (req, res) => {
  try {
    const issue = await issueService.completeRepair({
      issue_id: req.body.issue_id,
      technicianId: req.session.user.id,
      resolution: req.body.resolution
    });

    return res.json({ success: true, issue });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});




// GET last allocation for an asset (for reallocation modal auto-fill)
router.get('/ams/admin/issues/get-last-allocation/:tag', isAuthenticated, async (req, res) => {
  try {
    
    const tag = req.params.tag;

    

    const allocation = await Allocation.findOne({
      where: { al_uniqueId: tag },
      order: [['al_id', 'DESC']]
    });

    

    if (!allocation) {
      return res.json({ success: false, message: "No previous allocations found" });
    }

    return res.json({
      success: true,
      allocation: {
        name: allocation.al_allocatedTo || "",
        sapid: allocation.al_sapid || "",
        designation: allocation.al_designation || "",
        division: allocation.al_division || "",
        department: allocation.al_department || "",
        phone: allocation.al_phone || "",
        building: allocation.al_building || ""
      }
    });
  } catch (err) {
    console.error("Last allocation error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

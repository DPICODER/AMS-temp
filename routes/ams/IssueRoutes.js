// routes/ams/issues.js
const express = require('express');
const router = express.Router();
const issueService = require('../../services/issueService');
const isAuthenticated = require('../../middlewares/authenticate');
const { Allocation } = require('../../models');
// User raises an issue
router.post('/ams/api/issues/raise', isAuthenticated, async (req, res) => {
  try {
    console.log("Raise issue:", req.body);

    const issue = await issueService.raiseIssue({
      tag: req.body.tag,
      raised_by: req.session.user.id,
      category: req.body.category,
      description: req.body.description
    });

    return res.json({ success: true, issue });

  } catch (err) {
    console.error("Issue raise error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});



// Admin finalization endpoint
// POST body: { issue_id, action: 'free'|'reallocate'|'condemn', emp? }
router.post('/ams/admin/api/issues/finalize', isAuthenticated, async (req, res) => {
  try {
    const adminId = req.session.user.id;
    const { issue_id, action, emp } = req.body;
    if (!issue_id || !action) return res.status(400).json({ success:false, message:'Missing fields' });

    const allowed = ['free','reallocate','condemn'];
    if (!allowed.includes(action)) return res.status(400).json({ success:false, message:'Invalid action' });

    const result = await issueService.adminFinalizeRepair({
      issue_id,
      adminId,
      action,
      emp // for reallocate must be provided
    });

    return res.json({ success:true, result });
  } catch (err) {
    logger.error('Admin finalize error: ' + (err.stack || err.message));
    return res.status(500).json({ success:false, message: err.message || 'Finalize failed' });
  }
});


// Admin assigns technician
router.post('/ams/api/issues/assign', isAuthenticated, async (req, res) => {
  try {
    const issue = await issueService.assignTechnician({
      issue_id: req.body.issue_id,
      technicianId: req.body.assigned_to,
      adminId: req.session.user.id
    });

    return res.json({ success: true, issue });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Technician resolves
router.post('/ams/api/issues/resolve', isAuthenticated, async (req, res) => {
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


router.post('/ams/api/issues/tech-update', isAuthenticated, async (req, res) => {
  try {
    const result = await issueService.updateTechnicianStatus({
      issue_id: req.body.issue_id,
      technicianId: req.session.user.id,
      action: req.body.action,
      note: req.body.note
    });

    return res.json({ success: true, issue: result });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

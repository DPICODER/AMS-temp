// routes/ams/technicianRoutes.js
const express = require('express');
const router = express.Router();
const isAuthenticated = require('../../middlewares/authenticate');
const logger = require('../../middlewares/logger');
const issueService = require('../../services/issueService');
const { Op } = require('sequelize');
const AssetIssue = require('../../models/AssetIssues');

// Optional guard
function requireTechnician(req, res, next) { return next(); }

/**
 * Technician dashboard page — page will fetch data via JSON API
 */
router.get('/ams/tech/dashboard', isAuthenticated, requireTechnician, async (req, res) => {
  try {
    const techId = req.session.user.id;
    return res.render('ams/tech/dashboard', { title: 'Service Desk - Technician', techId ,successMessage:`Welcome ${req.session.user.name}`,errorMessage:null});
  } catch (err) {
    logger.error('Tech dashboard render error: ' + (err.stack || err.message));
    return res.status(500).render('ams/tech/dashboard', { title: 'Service Desk - Technician', techId: req.session.user?.id || null, errorMessage: 'Failed to load dashboard' });
  }
});

/**
 * JSON: list issues assigned to this technician
 */
router.get('/ams/api/tech/issues', isAuthenticated, requireTechnician, async (req, res) => {
  try {
    const techId = req.session.user.id;
    const rows = await AssetIssue.findAll({
      where: {
        assigned_to: techId,
        status: { [Op.in]: ['Assigned', 'InRepair', 'WaitingForPart'] }
      },
      order: [['createdAt','DESC']]
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Tech issues list error: ' + (err.stack || err.message));
    return res.status(500).json({ success:false, message:'Failed to fetch issues' });
  }
});

/**
 * Technician: update status (StartRepair / WaitingForPart / InRepair)
 * body: { issue_id, status, note? }
 */
router.post('/ams/api/tech/issues/update', isAuthenticated, requireTechnician, async (req, res) => {
  try {
    const techId = req.session.user.id;
    const { issue_id, status, note } = req.body;
    if (!issue_id || !status) return res.status(400).json({ success:false, message:'Missing fields' });

    const allowed = ['StartRepair','InRepair','WaitingForPart'];
    if (!allowed.includes(status)) return res.status(400).json({ success:false, message:'Invalid status' });

    const result = await issueService.updateTechnicianStatus({
      issue_id,
      technicianId: techId,
      action: status,
      note
    });

    return res.json({ success:true, issue: result });
  } catch (err) {
    logger.error('Tech update error: ' + (err.stack || err.message));
    return res.status(500).json({ success:false, message: err.message || 'Update failed' });
  }
});

/**
 * Technician: mark resolved (submit resolution note)
 * body: { issue_id, resolution }
 */
router.post('/ams/api/tech/issues/resolve', isAuthenticated, requireTechnician, async (req, res) => {
  try {
    const techId = req.session.user.id;
    const { issue_id, resolution } = req.body;
    if (!issue_id || !resolution || resolution.trim().length < 3) return res.status(400).json({ success:false, message:'Missing/invalid fields' });

    const issue = await issueService.completeRepair({ issue_id, technicianId: techId, resolution });
    return res.json({ success:true, issue });
  } catch (err) {
    logger.error('Tech resolve error: ' + (err.stack || err.message));
    return res.status(500).json({ success:false, message: err.message || 'Failed to resolve' });
  }
});

module.exports = router;

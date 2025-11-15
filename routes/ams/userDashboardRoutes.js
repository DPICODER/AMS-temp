// routes/ams/dashboardRoute.js
const express = require('express');
const router = express.Router();
const { Op, fn, col } = require('sequelize');
const isAuthenticated = require('../../middlewares/authenticate');
const logger = require('../../middlewares/logger');
const Allocation = require('../../models/Allocation'); // your Allocation model
// const Assets = require('../../models/Assets'); // Optionally used if you later join values

/**
 * GET /ams/asset/user/dashboard
 *
 * - Renders user dashboard with allocations (Option 1: Allocation table)
 * - Also supports JSON response if client requests application/json (used for refresh)
 */
router.get('/ams/asset/user/dashboard', isAuthenticated, async (req, res) => {
  logger.info('-> USER Dashboard (Allocations only)');

  try {
    // Identify user: prefer sap id if stored, else fallback to user name
    const sessionUser = req.session.user || {};
    const userSap = sessionUser.id || sessionUser.sapid || null; // attempt to match al_sapid
    const userName = sessionUser.name || sessionUser.u_name || null;
    console.log("SAP ",userSap);
    
    if (!userSap && !userName) {
      logger.warn('Session user has no id/name');
      return res.redirect('/');
    }

    // Fetch allocations belonging to this user
    // We attempt both matches: al_sapid equals userSap OR al_allocatedTo matches userName (case-insens)
    const where = {
      [Op.or]: []
    };
    if (userSap) where[Op.or].push({ al_sapid: userSap });
    if (userName) where[Op.or].push({ al_allocatedTo: { [Op.like]: `${userName}%` } });

    // If no where clauses (shouldn't happen), force empty set
    if (where[Op.or].length === 0) {
      where[Op.or].push({ al_id: null });
    }

    const allocations = await Allocation.findAll({
      where: {
        al_sapid: userSap,
        al_active: true
      }
      ,
      order: [['al_id', 'DESC']]
    });

    // Only return active allocations
  const filteredAllocations = allocations.filter(a =>
    ['Alloted', 'Reallocated', 'Repair'].includes(a.al_status)
  );

    // Map into simpler structure for frontend
    const userAssets = filteredAllocations.map(a => ({
      al_id: a.al_id,
      al_uniqueId: a.al_uniqueId,
      al_description: a.al_description,
      al_status: a.al_status,
      al_allocated_on: a.al_allocated_on,
      al_cycle_count: a.al_cycle_count,
      al_value: a.al_value || 0,
      al_allocatedTo: a.al_allocatedTo,
      al_sapid: a.al_sapid
    }));

    // compute stats based on Allocation rows
    const totalValue = userAssets.reduce((s, r) => s + (Number(r.al_value) || 0), 0);
    const totalCount = userAssets.length;
    const repairAssets = userAssets.filter(r => r.al_status === 'Repair').length;
    const allocatedCount = userAssets.filter(r => r.al_status === 'Alloted' || r.al_status === 'Reallocated').length;
    const utilization = totalCount > 0 ? Math.round((allocatedCount / totalCount) * 10000) / 100 : 0; // 2 decimal

    // Allow AJAX refresh: return JSON if requested
    const acceptsJson = req.headers['accept'] && req.headers['accept'].includes('application/json');

    if (acceptsJson) {
      return res.json({
        success: true,
        userAssets,
        totalValue,
        totalCount,
        repairAssets,
        utilization
      });
    }

    // render the EJS page
    return res.render('ams/user_dashboard', {
      title: 'My Assets',
      userAssets,
      totalValue,
      utilization,
      repairAssets,
      successMessage:`Welcome ${req.session.user.name}`,errorMessage:null
    });

  } catch (err) {
    logger.error('Dashboard error: ' + (err.stack || err.message));
    // render fallback with empty data and error message
    return res.render('ams/user_dashboard', {
      title: 'My Assets',
      userAssets: [],
      totalValue: 0,
      utilization: 0,
      repairAssets: 0,
      errorMessage: 'Failed to load dashboard'
    });
  }
});

module.exports = router;

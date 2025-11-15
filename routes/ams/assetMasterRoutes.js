// routes/ams/assetManagementRoutes.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const logger = require('../../middlewares/logger');
const isAuthenticated = require('../../middlewares/authenticate');
const { sequelize } = require('../../config/database');
const { Allocation, Assets, AssetLog } = require('../../models');

const assetService = require('../../services/assetAllocationService');
function safeJSON(obj){
  try { return JSON.parse(JSON.stringify(obj)); } catch(e){ return obj; }
}

// ---------------------------------------
// PAGE: Asset Management UI
// ---------------------------------------
router.get('/ams/asset-management', isAuthenticated, (req, res) => {
  res.render('ams/assetManagement/list-assets', {
    title: 'Asset Management',
    successMessage:null,errorMessage:null
  });
});

// ========================================================================
// API: GET /ams/api/assets  (List all assets with filters + search)
// ========================================================================
router.get('/ams/api/assets', isAuthenticated, async (req, res) => {
  try {
    const filter = (req.query.filter || 'all').toLowerCase();
    const q = req.query.q ? req.query.q.trim() : null;

    const where = {};

    // ---------- FILTER ----------
    if (filter !== 'all') {
      const map = {
        free: 'Free',
        alloted: 'Alloted',
        reallocated: 'Reallocated',
        repair: 'Repair',
        condemned: 'Condemned'
      };
      if (map[filter]) where.al_status = map[filter];
    }

    // ---------- SEARCH ----------
    if (q) {
      where[Op.or] = [
        { al_uniqueId: { [Op.like]: `%${q}%` } },
        { al_description: { [Op.like]: `%${q}%` } },
        { al_allocatedTo: { [Op.like]: `%${q}%` } },
        { al_sapid: { [Op.like]: `%${q}%` } }
      ];
    }

    // ---------- FETCH ----------
    const rows = await Allocation.findAll({
      where,
      order: [['al_id', 'DESC']]
    });

    return res.json({ success: true, data: rows });

  } catch (err) {
    logger.error("asset list error: " + err.stack);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// API: allocate by existing tag (preferred)
router.post('/ams/api/asset/allocate', isAuthenticated, async (req, res) => {
  try {
    const { al_uniqueId, empname, sapid, designation, division, department, phone, building } = req.body;
    if (!al_uniqueId || !empname) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const emp = {
      name: empname,
      sapid,
      designation,
      division,
      department,
      phone,
      building,
      role: req.session.user?.role || null
    };

    const result = await assetService.allocateAsset({ tag: al_uniqueId, emp, adminId: req.session.user?.id || null });
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error('API allocate error:', err);
    if (err.message && err.message.includes('allocated')) {
      return res.status(409).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// API: deallocate
router.post('/ams/api/asset/deallocate', isAuthenticated, async (req, res) => {
  try {
    const { al_uniqueId, reason } = req.body;
    if (!al_uniqueId) return res.status(400).json({ success: false, message: 'Missing tag' });

    const result = await assetService.deallocateAsset({ tag: al_uniqueId, reason, adminId: req.session.user?.id || null });
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`API deallocate error: ${err}`, err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// Keep other existing endpoints (list, history), but those can also be migrated to use the service for consistency.
router.get('/ams/api/asset/history/:tag', isAuthenticated, async (req, res) => {
  try {
    const tag = req.params.tag;
    const logs = await AssetLog.findAll({ where: { al_uniqueId: tag }, order: [['id', 'ASC']] });
    return res.json({ success: true, data: logs });
  } catch (err) {
    logger.error('history error: ' + err.stack);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

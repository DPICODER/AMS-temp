// routes/ams/allotAssetRoute.js
const express = require('express');
const router = express.Router();
const logger = require('../../middlewares/logger');
const isAuthenticated = require('../../middlewares/authenticate');
const assetService = require('../../services/assetAllocationService');

// Legacy route: allocate from acquisition line (keeps UI flow)
router.post('/ams/asset/allocate', isAuthenticated, async (req, res) => {
  logger.info('-> Allot Asset (acquisition flow) {POST}');
  try {
    const {
      empname, sapid, designation, division, department, phone, building, li_id
    } = req.body;

    if (!li_id || !empname) {
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

    const result = await assetService.allocateFromLineItem({ li_id, emp, adminId: req.session.user?.id || null });
    return res.status(200).json({ success: true, ...result });

  } catch (err) {
    logger.error('allotAssetRoute error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Allocation failed' });
  }
});

module.exports = router;

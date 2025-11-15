// services/assetAllocationService.js
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const Assets = require('../models/Assets');
const Allocation = require('../models/Allocation');
const AssetLog = require('../models/AssetLog'); // or require('../models/Asset_Log')
const AcquisitionLineItems = require('../models/AcquisitionLineItems');
const Acquisition = require('../models/Acquisition');

const DEFAULT_ADMIN_ID = 999999;

function now() {
  return new Date();
}

/**
 * Helper: Generate continuous tag using last asset row
 * NOTE: Production systems may use a central sequence table or DB sequence.
 */
async function generateContinuousTag(po_no, po_date, tx) {
  // Use Assets table tag-based sequence to avoid clashing with allocation id logic
  const last = await Assets.findOne({
    order: [['asset_id', 'DESC']],
    attributes: ['asset_id'],
    transaction: tx,
    lock: tx.LOCK.UPDATE
  });

  const next = last ? last.asset_id + 1 : 100001;
  // Normalize po_date to YYYY-MM
  const poMonth = (new Date(po_date)).toISOString().slice(0, 7);
  return `${po_no}/${poMonth}/${next}`;
}

/**
 * Create N assets from an acquisition line item.
 * Returns array of created asset records (Sequelize instances).
 */
async function createAssetsFromLineItem({ li_id, quantity = 1, tx, adminId }) {
  if (!tx) throw new Error('Transaction is required');

  const li = await AcquisitionLineItems.findOne({
    where: { li_id },
    transaction: tx,
    lock: tx.LOCK.UPDATE
  });
  if (!li) throw new Error('Acquisition line item not found');

  // Get PO date and number
  const po = await Acquisition.findOne({
    where: { aq_po_no: li.aq_po_no || li.li_po_no || li.po_no }, // tolerant
    attributes: ['aq_po_date', 'aq_po_no'],
    transaction: tx,
    lock: tx.LOCK.UPDATE
  });
  if (!po) throw new Error('Purchase order not found for line item');

  const createdAssets = [];
  for (let i = 0; i < quantity; i++) {
    const tag = await generateContinuousTag(po.aq_po_no || li.li_po_no || li.po_no, po.aq_po_date, tx);
    const asset = await Assets.create({
      tag,
      description: li.li_material_description || li.description || 'UNKNOWN',
      po_no: po.aq_po_no || li.li_po_no || li.po_no,
      po_date: po.aq_po_date,
      material_code: li.li_material_code || null,
      value: Number(li.li_po_value || 0) / Math.max(1, Number(li.li_qty || 1)),
      vendor: li.vendor || null,
      acquisition_li_id: li_id,
      status: 'Free',
      warranty_upto: null,
      remarks: `Created from LI ${li_id}`,
    }, { transaction: tx });

    // Update line item counts
    await li.update({
      li_created_assets: (li.li_created_assets || 0) + 1
    }, { transaction: tx });

    createdAssets.push(asset);
  }

  return createdAssets;
}

/**
 * Core: allocate an existing asset to a user (or reallocate if asset is Free).
 *
 * params:
 *  - tag (required) : asset tag
 *  - emp: {name, sapid, designation, division, department, phone, building}
 *  - adminId (optional) : acting admin user id
 *
 * Behavior:
 *  - Validates asset exists
 *  - If Assets.status === 'Condemned' or 'Repair' -> reject
 *  - If Allocation doesn't exist => create Allocation with status Alloted
 *  - If Allocation exists and status == Free => reallocate (increment cycle count)
 *  - If Allocation exists and status != Free => throw conflict
 *  - Update Assets.status to Alloted/Reallocated accordingly
 *  - Insert AssetLog
 */
async function allocateAsset({ tag, emp, adminId = null }) {
  const tx = await sequelize.transaction();
  try {
    if (!tag) throw new Error('Missing tag');

    // ensure adminId fallback
    const actor = adminId || DEFAULT_ADMIN_ID;

    // Find asset (lock it)
    const asset = await Assets.findOne({
      where: { tag },
      transaction: tx,
      lock: tx.LOCK.UPDATE
    });
    if (!asset) {
      await tx.rollback();
      throw new Error('Asset not found. Create asset before allocation.');
    }

    if (['Condemned', 'Repair'].includes(asset.status)) {
      await tx.rollback();
      throw new Error(`Asset status '${asset.status}' not allocatable`);
    }

    // Find latest allocation record for this tag (most recent)
    let allocation = await Allocation.findOne({
      where: { al_uniqueId: tag },
      order: [['al_id', 'DESC']],
      transaction: tx,
      lock: tx.LOCK.UPDATE
    });

    const timestamp = now();

    if (!allocation) {
      // First-time allocation - create allocation row
      allocation = await Allocation.create({
        al_uniqueId: tag,
        al_description: asset.description,
        al_value: asset.value,
        al_division: emp.division || allocation?.al_division || 'BDL',
        al_department: emp.department || allocation?.al_department || 'UNKNOWN',
        al_status: 'Alloted',
        al_allocatedTo: emp.name,
        al_sapid: emp.sapid || null,
        al_phone: emp.phone || null,
        al_building: emp.building || null,
        al_designation: emp.designation || null,
        al_allocated_on: timestamp,
        al_allocated_by: actor,
        al_cycle_count: 0,
        al_active: true,
        al_reason: null
      }, { transaction: tx });

      // Update asset status
      await asset.update({ status: 'Alloted' }, { transaction: tx });

      // Log
      await AssetLog.create({
        al_id: allocation.al_id,
        al_uniqueId: tag,
        event: 'Allocated',
        details: `Allocated to ${emp.name} (${emp.sapid || 'N/A'})`,
        performed_by: actor,
        performed_by_role: emp.role || null
      }, { transaction: tx });

      await tx.commit();
      return { success: true, action: 'Allocated', allocation: allocation.get({ plain: true }) };
    }

    // If allocation exists but status is Free -> Reallocate
    if (allocation.al_status === 'Free') {
      const newCycle = (allocation.al_cycle_count || 0) + 1;

      await allocation.update({
        al_allocatedTo: emp.name,
        al_sapid: emp.sapid || null,
        al_designation: emp.designation || null,
        al_phone: emp.phone || null,
        al_building: emp.building || null,
        al_division: emp.division || allocation.al_division,
        al_department: emp.department || allocation.al_department,
        al_allocated_on: timestamp,
        al_allocated_by: actor,
        al_status: 'Reallocated',
        al_cycle_count: newCycle,
        al_reason: null,
        al_active: true
      }, { transaction: tx });

      // Update Assets.status
      await asset.update({ status: 'Reallocated' }, { transaction: tx });

      // Log
      await AssetLog.create({
        al_id: allocation.al_id,
        al_uniqueId: tag,
        event: 'Reallocated',
        details: `Reallocated to ${emp.name} (${emp.sapid || 'N/A'}), cycle ${newCycle}`,
        performed_by: actor,
        performed_by_role: emp.role || null
      }, { transaction: tx });

      await tx.commit();
      return { success: true, action: 'Reallocated', allocation: allocation.get({ plain: true }) };
    }

    // allocation exists and not free -> conflict
    await tx.rollback();
    throw new Error('Asset is already allocated. Deallocate first.');
  } catch (err) {
    if (!tx.finished) await tx.rollback();
    throw err;
  }
}

/**
 * Deallocate an asset: set latest allocation to Free, keep record active.
 * - tag
 * - reason
 * - adminId
 */
async function deallocateAsset({ tag, reason = null, adminId = null }) {
  const tx = await sequelize.transaction();
  try {
    const actor = adminId || DEFAULT_ADMIN_ID;
    const asset = await Assets.findOne({
      where: { tag },
      transaction: tx,
      lock: tx.LOCK.UPDATE
    });
    if (!asset) {
      await tx.rollback();
      throw new Error('Asset not found');
    }

    const allocation = await Allocation.findOne({
      where: { al_uniqueId: tag },
      order: [['al_id', 'DESC']],
      transaction: tx,
      lock: tx.LOCK.UPDATE
    });

    if (!allocation) {
      await tx.rollback();
      throw new Error('Allocation record not found for this tag');
    }

    if (allocation.al_status === 'Free') {
      await tx.rollback();
      throw new Error('Asset is already free');
    }

    await allocation.update({
      al_status: 'Free',
      al_deallocated_on: now(),
      al_deallocated_by: actor,
      al_active: true,
      al_reason: reason || null
    }, { transaction: tx });

    // update asset status to Free
    await asset.update({ status: 'Free' }, { transaction: tx });

    await AssetLog.create({
      al_id: allocation.al_id,
      al_uniqueId: tag,
      event: 'Deallocated',
      details: reason || `Deallocated by ${actor}`,
      performed_by: actor,
      performed_by_role: null
    }, { transaction: tx });

    await tx.commit();
    return { success: true, action: 'Deallocated', allocation: allocation.get({ plain: true }) };
  } catch (err) {
    if (!tx.finished) await tx.rollback();
    throw err;
  }
}

/**
 * Allocate directly from acquisition line (legacy/GUI flow).
 * Steps:
 *  - Fetch LI, ensure available qty
 *  - Create a new Asset (and tag) from LI (1 unit)
 *  - Create Allocation and AssetLog
 *  - Update LI counters (li_allocated_qty++, li_available_qty--)
 *
 * Params:
 *  - li_id, po_no (optional), emp, adminId
 */
async function allocateFromLineItem({ li_id, emp, adminId = null }) {
  const tx = await sequelize.transaction();
  try {
    const actor = adminId || DEFAULT_ADMIN_ID;

    const li = await AcquisitionLineItems.findOne({
      where: { li_id },
      transaction: tx,
      lock: tx.LOCK.UPDATE
    });
    if (!li) throw new Error('Line item not found');

    if ((li.li_available_qty || 0) <= 0) {
      throw new Error('No available quantity left for this line item');
    }

    // create one asset from LI
    // get PO
    const po = await Acquisition.findOne({
      where: { aq_po_no: li.aq_po_no || li.li_po_no || li.po_no },
      attributes: ['aq_po_date', 'aq_po_no'],
      transaction: tx,
      lock: tx.LOCK.UPDATE
    });
    if (!po) throw new Error('Purchase order not found');

    const tag = await generateContinuousTag(po.aq_po_no || li.li_po_no || li.po_no, po.aq_po_date, tx);

    const asset = await Assets.create({
      tag,
      description: li.li_material_description || li.description || 'UNKNOWN',
      po_no: po.aq_po_no || li.li_po_no || li.po_no,
      po_date: po.aq_po_date,
      material_code: li.li_material_code || null,
      value: Number(li.li_po_value || 0) / Math.max(1, Number(li.li_qty || 1)),
      acquisition_li_id: li_id,
      type:li.li_type,
      status: 'Alloted',
      remarks: `Created and allocated from LI ${li_id}`
    }, { transaction: tx });

    // create allocation
    const allocation = await Allocation.create({
      al_uniqueId: asset.tag,
      al_description: asset.description,
      al_value: asset.value,
      al_division: emp.division || 'BDL',
      al_department: emp.department || 'UNKNOWN',
      al_status: 'Alloted',
      al_allocatedTo: emp.name,
      al_sapid: emp.sapid || null,
      al_phone: emp.phone || null,
      al_building: emp.building || null,
      al_designation: emp.designation || null,
      al_allocated_on: now(),
      al_allocated_by: actor,
      al_cycle_count: 0,
      al_active: true
    }, { transaction: tx });

    // Asset log
    await AssetLog.create({
      al_id: allocation.al_id,
      al_uniqueId: asset.tag,
      event: 'Allocated',
      details: `Allocated on creation to ${emp.name} (${emp.sapid || 'N/A'})`,
      performed_by: actor,
      performed_by_role: emp.role || null
    }, { transaction: tx });

    // update LI counters
    await li.update({
      li_allocated_qty: (li.li_allocated_qty || 0) + 1,
      li_available_qty: (li.li_available_qty || 0) - 1
    }, { transaction: tx });

    await tx.commit();
    return { success: true, action: 'CreatedAndAllocated', tag: asset.tag, allocation: allocation.get({ plain: true }) };

  } catch (err) {
    if (!tx.finished) await tx.rollback();
    throw err;
  }
}

module.exports = {
  allocateAsset,
  deallocateAsset,
  allocateFromLineItem,
  createAssetsFromLineItem
};

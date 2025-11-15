// services/issueService.js
const { sequelize } = require('../config/database');
const AssetIssue = require('../models/AssetIssues');
const Assets = require('../models/Assets');
const AssetLog = require('../models/AssetLog');
const Allocation = require('../models/Allocation'); // note: not destructured from index to keep names same
const DEFAULT_ADMIN_ID = 999999;

function now(){ return new Date(); }

module.exports = {

  // User raises an issue
  async raiseIssue({ tag, raised_by, category, description }) {
    const tx = await sequelize.transaction();
    try {
      const asset = await Assets.findOne({ where:{ tag }, lock: tx.LOCK.UPDATE, transaction: tx });
      if (!asset) throw new Error('Asset not found.');

      // Move asset to Repair state
      await asset.update({ status: 'Repair' }, { transaction: tx });

      // Update latest allocation (if exists) to Repair so it shows in lists
      const allocation = await Allocation.findOne({
        where: { al_uniqueId: tag },
        order: [['al_id','DESC']],
        lock: tx.LOCK.UPDATE,
        transaction: tx
      });
      if (allocation) {
        await allocation.update({ al_status: 'Repair' }, { transaction: tx });
      }

      const issue = await AssetIssue.create({
        tag,
        raised_by,
        category,
        priority: 'Medium',
        description,
        status: 'Open'
      }, { transaction: tx });

      await AssetLog.create({
        al_uniqueId: tag,
        event: 'RepairRequested',
        details: `Issue raised by user ${raised_by}. Category: ${category}`,
        performed_by: raised_by
      }, { transaction: tx });

      await tx.commit();
      return issue.get ? issue.get({ plain: true }) : issue;
    } catch (err) {
      if (!tx.finished) await tx.rollback();
      throw err;
    }
  },

  // Admin assigns technician
  async assignTechnician({ issue_id, adminId, technicianId }) {
    const tx = await sequelize.transaction();
    try {
      const issue = await AssetIssue.findByPk(issue_id, { transaction: tx, lock: tx.LOCK.UPDATE });
      if (!issue) throw new Error('Issue not found.');

      await issue.update({ status: 'Assigned', assigned_to: technicianId }, { transaction: tx });

      await AssetLog.create({
        al_uniqueId: issue.tag,
        event: 'RepairAssigned',
        details: `Assigned to technician ${technicianId}`,
        performed_by: adminId
      }, { transaction: tx });

      await tx.commit();
      return issue.get ? issue.get({ plain: true }) : issue;
    } catch (err) {
      if (!tx.finished) await tx.rollback();
      throw err;
    }
  },

  // Technician completes repair (marks resolved) — **does NOT free asset**
  async completeRepair({ issue_id, technicianId, resolution }) {
    const tx = await sequelize.transaction();
    try {
      const issue = await AssetIssue.findByPk(issue_id, { transaction: tx, lock: tx.LOCK.UPDATE });
      if (!issue) throw new Error('Issue not found.');

      // Lock asset
      const asset = await Assets.findOne({
        where: { tag: issue.tag },
        transaction: tx,
        lock: tx.LOCK.UPDATE
      });
      if (!asset) throw new Error('Linked asset not found.');

      // Mark issue Resolved (technician's work done)
      await issue.update({
        status: 'Resolved',
        resolution_note: resolution,
        closed_at: now()
      }, { transaction: tx });

      // IMPORTANT: set asset to Repaired (admin will finalize)
      await asset.update({ status: 'Repaired' }, { transaction: tx });

      // Keep allocation in Repair so admin sees it; update latest allocation if exists
      const allocation = await Allocation.findOne({
        where: { al_uniqueId: issue.tag },
        order: [['al_id','DESC']],
        transaction: tx,
        lock: tx.LOCK.UPDATE
      });
      if (allocation) {
        await allocation.update({ al_status: 'Repair' }, { transaction: tx });
      }

      await AssetLog.create({
        al_uniqueId: issue.tag,
        event: 'RepairCompletedByTech',
        details: `Resolved by technician ${technicianId}: ${resolution}`,
        performed_by: technicianId
      }, { transaction: tx });

      await tx.commit();
      return issue.get ? issue.get({ plain: true }) : issue;
    } catch (err) {
      if (!tx.finished) await tx.rollback();
      throw err;
    }
  },

  // Technician quick status updates: Start repair / Waiting for part / InRepair
  async updateTechnicianStatus({ issue_id, technicianId, action, note }) {
    const tx = await sequelize.transaction();
    try {
      const issue = await AssetIssue.findByPk(issue_id, { transaction: tx, lock: tx.LOCK.UPDATE });
      if (!issue) throw new Error('Issue not found.');

      const asset = await Assets.findOne({ where:{ tag: issue.tag }, transaction: tx, lock: tx.LOCK.UPDATE });
      if (!asset) throw new Error('Asset not found.');

      if (action === 'StartRepair' || action === 'InRepair') {
        await issue.update({ status: 'InRepair' }, { transaction: tx });
        await asset.update({ status: 'Repair' }, { transaction: tx });

        await AssetLog.create({
          al_uniqueId: issue.tag,
          event: 'RepairStarted',
          details: `Technician ${technicianId} started repair`,
          performed_by: technicianId
        }, { transaction: tx });

        await tx.commit();
        return issue.get ? issue.get({ plain: true }) : issue;
      }

      if (action === 'WaitingForPart' || action === 'WaitingForPart') {
        await issue.update({ status: 'WaitingForPart', resolution_note: note || null }, { transaction: tx });
        await asset.update({ status: 'Repair' }, { transaction: tx });

        await AssetLog.create({
          al_uniqueId: issue.tag,
          event: 'RepairPending',
          details: `Waiting for part: ${note || 'unspecified'}`,
          performed_by: technicianId
        }, { transaction: tx });

        await tx.commit();
        return issue.get ? issue.get({ plain: true }) : issue;
      }

      throw new Error('Invalid action');
    } catch (err) {
      if (!tx.finished) await tx.rollback();
      throw err;
    }
  },

  /**
   * ADMIN: Finalize repair after technician resolves.
   * action: 'free' | 'reallocate' | 'condemn'
   * For reallocate, pass emp = { name, sapid, designation, division, department, phone, building }
   */
  async adminFinalizeRepair({ issue_id, adminId, action, emp = null }) {
    const tx = await sequelize.transaction();
    try {
      const issue = await AssetIssue.findByPk(issue_id, { transaction: tx, lock: tx.LOCK.UPDATE });
      if (!issue) throw new Error('Issue not found.');

      const asset = await Assets.findOne({ where: { tag: issue.tag }, transaction: tx, lock: tx.LOCK.UPDATE });
      if (!asset) throw new Error('Asset not found.');

      const allocation = await Allocation.findOne({
        where: { al_uniqueId: issue.tag },
        order: [['al_id','DESC']],
        transaction: tx,
        lock: tx.LOCK.UPDATE
      });

      if (action === 'free') {
        // Mark issue closed/finalized, asset free, allocation -> Free (if allocation exists)
        await asset.update({ status: 'Free' }, { transaction: tx });

        if (allocation) {
          await allocation.update({
            al_status: 'Free',
            al_deallocated_on: now(),
            al_deallocated_by: adminId
          }, { transaction: tx });
        }

        await AssetLog.create({
          al_uniqueId: issue.tag,
          event: 'FinalizedFree',
          details: `Admin ${adminId} finalized and freed the asset.`,
          performed_by: adminId
        }, { transaction: tx });

        // Optionally close issue (set Closed)
        await issue.update({ status: 'Closed' }, { transaction: tx });

        await tx.commit();
        return { action: 'free', issue: issue.get({ plain: true }) };
      }

      if (action === 'reallocate') {

        if (!emp) throw new Error('Employee details required for reallocation');

        // 1️⃣ DEACTIVATE OLD ALLOCATION
        if (allocation) {
            await allocation.update({
            al_active: false,
            al_status: 'Reallocated',
            al_deallocated_on: now(),
            al_deallocated_by: adminId
            }, { transaction: tx });
        }

        // 2️⃣ CREATE NEW ALLOCATION ENTRY
        const newAllocation = await Allocation.create({
            al_uniqueId: issue.tag,
            al_description: asset.description,
            al_value: asset.value || 0,
            al_division: emp.division || allocation?.al_division || 'BDL',
            al_department: emp.department || allocation?.al_department || null,
            al_status: 'Alloted',
            al_allocatedTo: emp.name,
            al_sapid: emp.sapid,
            al_phone: emp.phone,
            al_building: emp.building,
            al_designation: emp.designation,
            al_allocated_on: now(),
            al_allocated_by: adminId,
            al_cycle_count: allocation ? allocation.al_cycle_count + 1 : 0,
            al_active: true
        }, { transaction: tx });

        // 3️⃣ UPDATE ASSET
        await asset.update({ status: 'Alloted' }, { transaction: tx });

        await AssetLog.create({
            al_uniqueId: issue.tag,
            event: 'FinalizedReallocated',
            details: `Admin ${adminId} reallocated to ${emp.name} (${emp.sapid})`,
            performed_by: adminId
        }, { transaction: tx });

        await issue.update({ status: 'Closed' }, { transaction: tx });

        await tx.commit();
        return { action: 'reallocate', allocation: newAllocation.get({ plain: true }) };
        }


      if (action === 'condemn') {
        await asset.update({ status: 'Condemned' }, { transaction: tx });
        if (allocation) await allocation.update({ al_status: 'Condemned' }, { transaction: tx });

        await AssetLog.create({
          al_uniqueId: issue.tag,
          event: 'FinalizedCondemned',
          details: `Asset condemned by admin ${adminId}`,
          performed_by: adminId
        }, { transaction: tx });

        await issue.update({ status: 'Closed' }, { transaction: tx });

        await tx.commit();
        return { action: 'condemn' };
      }

      throw new Error('Invalid finalize action');
    } catch (err) {
      if (!tx.finished) await tx.rollback();
      throw err;
    }
  }

};

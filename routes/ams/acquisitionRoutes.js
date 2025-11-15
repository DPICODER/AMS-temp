// routes/ams/acquisitionRoutes.js
const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Acquisition, AcqisitionLineItems } = require("../../models"); // uses models/index.js
const { sequelize } = require("../../config/database");
const logger = require("../../middlewares/logger");
const isAuthenticated = require("../../middlewares/authenticate");
const nocache = require("../../middlewares/noCache");

/** Utility: safe parse ints */
const toInt = v => (v == null ? null : parseInt(v, 10));

/** Build Tabulator-friendly grouped response */
function buildGroupedResponse(rows) {
  const groupBy = require("lodash/groupBy");
  const grouped = groupBy(rows, r => r["aq_id"]);

  return Object.values(grouped).map(rows => {
    const acq = rows[0];
    const children = rows
      .filter(r => r["lineItems.li_id"] != null)
      .map(r => ({
        li_id: r["lineItems.li_id"],
        aq_po_no: r["lineItems.aq_po_no"],
        li_type: r["lineItems.li_type"],
        li_material_code: r["lineItems.li_material_code"],
        li_material_description: r["lineItems.li_material_description"],
        li_qty: r["lineItems.li_qty"],
        li_po_value: r["lineItems.li_po_value"],
        li_asset_specs: r["lineItems.li_asset_specs"],
        li_allocated_qty: r["lineItems.li_allocated_qty"],
        li_available_qty: r["lineItems.li_available_qty"],
        li_is_fully_allocated: r["lineItems.li_is_fully_allocated"]
      }));

    return {
      id: acq["aq_id"],
      PO_NO: acq["aq_po_no"],
      PO_Date: acq["aq_po_date"],
      Value: acq["aq_po_value"],
      Quantity: acq["aq_qty"],
      vendorCode: acq["aq_vendor_code"],
      vendorName: acq["aq_vendor_name"],
      SAPID: acq["aq_sap_id"],
      _children: children
    };
  });
}

/* ---------- Pages ---------- */

// Render master list page
router.get("/ams/asset/acquisition", nocache, isAuthenticated, (req, res) => {
  res.render("ams/acquisition/list-acquisitions", {
    title: "Asset Acquisition",
    sYear: new Date().getFullYear(),
    successMessage: null,
    errorMessage: null
  });
});

/* ---------- API: list acquisitions (POST) ---------- */
/* Accepts { year: 2025 } in body */
router.post("/ams/api/acquisition/list", isAuthenticated, async (req, res) => {
  const year = Number(req.body.year) || new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  try {
    // We will use raw join for grouping - so raw:true and model alias is important
    const rows = await Acquisition.findAll({
      where: { aq_po_date: { [Op.between]: [start, end] } },
      include: [
        {
          model: AcqisitionLineItems,
          as: "lineItems",         // ⭐ REQUIRED alias
          required: false,
        }
      ],
      raw: true
    });
    console.log("rows :",rows);
    const structured = buildGroupedResponse(rows);
    
    // console.log("structured :",structured);
    return res.json({ success: true, data: structured });
  } catch (err) {
    logger.error(`acquisition list error:${err}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------- API: validate PO number ---------- */
router.post("/ams/validate_po_number", isAuthenticated, async (req, res) => {
  try {
    const po_no = (req.body.po_number || "").toString().trim();
    if (!/^\d{10}$/.test(po_no)) {
      return res.status(400).json({ success: false, message: "Invalid PO format" });
    }
    const po_check = await Acquisition.findOne({ where: { aq_po_no: po_no }, attributes: ["aq_po_no"], raw: true });
    if (po_check) return res.json({ success: true, exists: true, message: "PO exists" });
    return res.json({ success: true, exists: false });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/ams/asset/acquisition/add", nocache, isAuthenticated, (req, res) => {
  logger.info("-> Acquisiiton -> add {GET}");
  successMessage = "Please Enter Details";
  errorMessage = null;
  res.render("ams/acquisition/add-acquisition", {
    title: "",
    errorMessage: errorMessage,
    successMessage: successMessage,
  });
});
/* ---------- API: add acquisition (POST) ---------- */
/**
 * Payload:
 * {
 *   header: { po_no, po_date, vendor_code, vendor_name },
 *   items: [ { asset_type, material_code, material_desc, quantity, unit_price, total_price, specs } ]
 * }
 */
router.post("/ams/asset/acquisition/add", isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { header, items } = req.body;

    if (!header || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    const po_no = (header.po_no || "").toString().trim();
    const po_date = header.po_date;
    if (!/^\d{10}$/.test(po_no)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "PO number must be 10 digits" });
    }

    // check uniqueness using transaction lock
    const existing = await Acquisition.findOne({
      where: { aq_po_no: po_no },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ success: false, message: "PO already exists" });
    }

    // compute totals & validate items
    let totalQty = 0, totalValue = 0;
    for (const it of items) {
      const qty = Number(it.quantity || 0);
      const total = Number(it.total_price || 0);
      if (qty <= 0 || Number.isNaN(qty) || total < 0 || Number.isNaN(total)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Invalid item values" });
      }
      totalQty += qty;
      totalValue += total;
    }

    // create header
    const acq = await Acquisition.create({
      aq_po_no: po_no,
      aq_po_date: po_date,
      aq_vendor_code: header.vendor_code || null,
      aq_vendor_name: header.vendor_name || null,
      aq_qty: totalQty,
      aq_po_value: totalValue,
      aq_sap_id: req.session?.user?.id || 0,
      aq_dept: req.session?.user?.department || "UNKNOWN"
    }, { transaction: t });

    // create line items
    for (const it of items) {
      await AcqisitionLineItems.create({
        aq_po_no: po_no,
        li_type: it.asset_type || null,
        li_material_code: it.material_code || null,
        li_material_description: it.material_desc || null,
        li_qty: Number(it.quantity),
        li_po_value: Number(it.total_price),
        li_asset_specs: it.specs || null,
        li_available_qty: Number(it.quantity),
        li_allocated_qty: 0
      }, { transaction: t });
    }

    await t.commit();
    return res.status(201).json({ success: true, message: "Acquisition created" });
  } catch (err) {
    await t.rollback();
    logger.error("acquisition add error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------- API: update single line item ---------- */
/* Accepts JSON body with li_id and fields to update (guarded) */
router.post("/ams/asset/update/lineItem", isAuthenticated, async (req, res) => {
  try {
    const { li_id } = req.body;
    // console.log("update :",req.body);
    
    if (!li_id) return res.status(400).json({ success: false, message: "li_id required" });

    // allow only certain fields to be updated
    const allowed = ["li_material_code", "li_material_description", "li_qty", "li_po_value", "li_asset_specs"];
    const payload = {};
    for (const k of allowed) if (k in req.body) payload[k] = req.body[k];


    // console.log("update Payload :",payload);
    

    const [n] = await AcqisitionLineItems.update(payload, { where: { li_id } });
    if (n === 0) return res.status(404).json({ success: false, message: "Line item not found" });

    const updated = await AcqisitionLineItems.findOne({ where: { li_id }, raw: true });
    return res.json({ success: true, data: updated });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

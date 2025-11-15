// models/AcqisitionLineItems.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Line items for Acquisition.
 * Note: model name intentionally matches legacy alias "Acqisition_Line_Items"
 * so raw join keys like "Acqisition_Line_Items.li_id" remain stable.
 */
const AcqisitionLineItems = sequelize.define(
  "Acqisition_Line_Items",   // model alias used in raw join prefix
  {
    li_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    aq_po_no: {                      // FK to Acquisition.aq_po_no
      type: DataTypes.CHAR(10),
      allowNull: false,
    },
    li_type: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    li_material_code: {
      type: DataTypes.CHAR(14),
      allowNull: true,
    },
    li_material_description: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    li_qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    li_po_value: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    // Keep specs JSON — easier for UI and future fields
    li_asset_specs: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    li_allocated_qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    li_available_qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    li_isTagged: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    li_is_fully_allocated: {
      type: DataTypes.TINYINT,
      allowNull: true
    }
  },
  {
    tableName: "Acqisition_Line_Items", // EXACT existing DB table
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ["aq_po_no"] },
      { fields: ["li_material_code"] }
    ],
    hooks: {
      beforeValidate: (rec) => {
        if (rec.aq_po_no && typeof rec.aq_po_no === "string") rec.aq_po_no = rec.aq_po_no.trim();
        if (rec.li_material_code && typeof rec.li_material_code === "string") rec.li_material_code = rec.li_material_code.trim();
      }
    }
  }
);

module.exports = AcqisitionLineItems;

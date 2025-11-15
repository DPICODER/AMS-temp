// models/Acquisition.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Acquisition model - parent header for a PO
 */
const Acquisition = sequelize.define(
  "Acquisition", // model name / alias used by Sequelize
  {
    aq_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    aq_po_no: {
      type: DataTypes.CHAR(10),
      allowNull: false,
      unique: true,
    },
    aq_po_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    aq_qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    aq_vendor_code: {
      type: DataTypes.CHAR(7),
      allowNull: true,
    },
    aq_vendor_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    aq_po_value: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    aq_sap_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    aq_dept: {
      type: DataTypes.STRING(50),
      allowNull: false,
    }
  },
  {
    tableName: "Acquisition",
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ["aq_po_no"], unique: true },
      { fields: ["aq_po_date"] },
      { fields: ["aq_sap_id"] }
    ],
    hooks: {
      beforeValidate: (rec) => {
        if (rec.aq_po_no && typeof rec.aq_po_no === "string") {
          rec.aq_po_no = rec.aq_po_no.trim();
        }
        if (rec.aq_vendor_code && typeof rec.aq_vendor_code === "string") {
          rec.aq_vendor_code = rec.aq_vendor_code.trim();
        }
      }
    }
  }
);

module.exports = Acquisition;

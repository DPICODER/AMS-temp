// models/Assets.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Assets = sequelize.define('Assets', {
  asset_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  tag: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },

  type:{
    type:DataTypes.STRING(20),
    allowNull:false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  po_no: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  po_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },

  material_code: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },

  vendor: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  acquisition_li_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  status: {
    type: DataTypes.ENUM('Free','Alloted','Reallocated','Repair','Repaired','Condemned'),
    defaultValue: 'Free'
  },
  warranty_upto: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  remarks: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'assets', // IMPORTANT: lowercase matches your DB table
  indexes: [
    { fields: ['tag'] },
    { fields: ['po_no'] },
    { fields: ['material_code'] },
    { fields: ['status'] }
  ]
});

module.exports = Assets;

// models/Asset_Log.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AssetLog = sequelize.define('Asset_Log', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  al_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  al_uniqueId: {
    type: DataTypes.STRING(255),
    allowNull: true, // <-- CHANGE THIS to true
    references: {
      model: 'assets',
      key: 'tag'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL' // This can now work
  },

event: {
  type: DataTypes.STRING(100),
  allowNull: false
},

  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  performed_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  performed_by_role: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'asset_log',
  timestamps: true,
  createdAt: true,
  updatedAt: false
});

module.exports = AssetLog;

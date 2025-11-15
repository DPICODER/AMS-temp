// models/AssetIssue.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AssetIssue = sequelize.define('AssetIssue', {
  issue_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  tag: {
    type: DataTypes.STRING(255),
    allowNull: false,
    references: {
      model: 'assets',
      key: 'tag'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },

  raised_by: {
    type: DataTypes.INTEGER,
    allowNull: false,   // FK to user id
  },

  category: {
    type: DataTypes.ENUM('Hardware', 'Software', 'Network', 'Other'),
    allowNull: false
  },

  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    defaultValue: 'Medium'
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },

// models/AssetIssues.js (snippet)
status: {
  type: DataTypes.ENUM(
    'Open',
    'Assigned',
    'InRepair',
    'WaitingForPart',
    'Resolved',
    'Closed'
  ),
  defaultValue: 'Open'
},


  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  resolution_note: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  closed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }

}, {
  tableName: 'asset_issues',
  timestamps: true
});

module.exports = AssetIssue;

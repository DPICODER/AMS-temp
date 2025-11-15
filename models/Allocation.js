// models/Allocation.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Allocation = sequelize.define('Allocation', {
  al_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  al_uniqueId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    references: {
      model: 'assets',  // MUST match lowercase table name
      key: 'tag'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },

  al_description: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  al_value: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },

  al_status: {
    type: DataTypes.ENUM('Free', 'Alloted', 'Reallocated', 'Repair', 'Condemned'),
    defaultValue: 'Free'
  },

  al_sapid: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  al_allocatedTo: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  al_designation: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  al_division: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'UNKNOWN'
  },

  al_department: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'UNKNOWN'
  },

  al_building: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  al_phone: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  al_os: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  al_allocated_on: {
    type: DataTypes.DATE,
    allowNull: true
  },

  al_allocated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  al_deallocated_on: {
    type: DataTypes.DATE,
    allowNull: true
  },

  al_deallocated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  al_cycle_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },

  al_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },

  al_reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  }

}, {
  tableName: 'allocation',
  indexes: [
    { fields: ['al_uniqueId'] },
    { fields: ['al_sapid'] },
    { fields: ['al_status'] },
    { fields: ['al_active'] }
  ]
});

module.exports = Allocation;

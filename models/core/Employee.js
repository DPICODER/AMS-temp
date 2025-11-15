const { DataTypes, Model } = require('sequelize');
const {sequelize} = require('../../config/core_db'); // adjust the path as needed

const Employee = sequelize.define('Employee', {
  SAP_ID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  LEG_ID: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  NAME: {
    type: DataTypes.STRING(60),
    allowNull: true,
  },
  DOJ: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  DOB: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  DOR: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  DIVISION: {
    type: DataTypes.CHAR(2),
    allowNull: true,
  },
  GRADE: {
    type: DataTypes.CHAR(5),
    allowNull: true,
  },
  UNIT: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Employee',
  tableName: 'Employee',
  timestamps: false,
});

module.exports = Employee;


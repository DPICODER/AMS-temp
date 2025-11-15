const { DataTypes } = require('sequelize');
const {sequelize} = require('../config/database');

// Define User model
const User = sequelize.define('User', {
  sap_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    primaryKey: true
  },
  leg_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  division: {
    type: DataTypes.STRING,
    allowNull: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Retired', 'Transfered', 'Working'),
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  theme: {
    type: DataTypes.STRING,
    allowNull: true
  },
  unit_location: {
    type: DataTypes.STRING,
    allowNull: true
  }
});



module.exports = User;

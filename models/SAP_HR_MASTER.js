const { DataTypes, Model } = require('sequelize');
const {sequelize} = require('../config/core_database'); 

const SAP_HR_MASTER = sequelize.define('sap_hr_master', {
  stno: {
    type: DataTypes.NUMBER,
    primaryKey: true,
    allowNull: false
  },
  empid: {
    type: DataTypes.STRING(8),
    allowNull: false
  },
  emp_group: {
    type: DataTypes.STRING(2),
    allowNull: false
  },
  div: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  loc: {
    type: DataTypes.STRING(4),
    allowNull: false
  },
  dept: {
    type: DataTypes.STRING(40),
    allowNull: false
  },
  ccno: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  inc_cat: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  section: {
    type: DataTypes.STRING(40),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(40),
    allowNull: false
  },
  gender: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  marital: {
    type: DataTypes.STRING(1),
    allowNull: false
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  doj: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  grade: {
    type: DataTypes.STRING(5),
    allowNull: false
  },
  grade_cd: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  desgn: {
    type: DataTypes.STRING(40),
    allowNull: false
  },
  blood_grp: {
    type: DataTypes.STRING(5),
    allowNull: false
  },
  basic: {
    type: DataTypes.NUMBER,
    allowNull: false
  },
  basic_pay: {
    type: DataTypes.NUMBER,
    allowNull: false
  },
  daperc: {
    type: DataTypes.NUMBER,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  sep_reason: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  sepa_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'sap_hr_master',
  timestamps: false  // Adjust this if your table has createdAt and updatedAt fields
});

module.exports = SAP_HR_MASTER;

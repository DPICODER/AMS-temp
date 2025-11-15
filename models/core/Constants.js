const { DataTypes, Model } = require('sequelize');
const {sequelize} = require('../../config/core_db'); // adjust the path as needed

const Constant = sequelize.define('Constant', {
  c_name: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  c_key: {
    type: DataTypes.TINYINT,
    allowNull: false
  },
  c_value_1: {
    type: DataTypes.STRING(45),
    allowNull: false
  },
  c_value_2: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  c_value_3: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  c_ts: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  c_pk: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  }
}, {
  tableName: 'Constants',
  timestamps: false, // Disable default Sequelize timestamp fields
  indexes: [
    {
      name: 'idx_c_name',
      fields: ['c_name']
    }
  ]
});

module.exports = Constant;

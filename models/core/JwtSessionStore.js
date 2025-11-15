const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/core_db'); // adjust the path as needed

const JwtSessionStore = sequelize.define('JwtSessionStore', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  session_unique: {
    type: DataTypes.STRING,
    allowNull: false,
  }
});

module.exports = JwtSessionStore;

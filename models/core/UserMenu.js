const { DataTypes, Model } = require('sequelize');
const {sequelize} = require('../../config/core_db'); // adjust the path as needed

const UserMenu = sequelize.define('UserMenu', {
  um_u_id: {
    type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
    allowNull: false,
    defaultValue: '00000000',
  },
  um_app_name: {
    type: DataTypes.STRING(30),
    allowNull: false,
    charset: 'latin1',
  },
  um_menu_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  um_ts: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  }
}, {
  indexes: [
    {
      unique: false,
      fields: ['um_u_id', 'um_app_name', 'um_menu_id']
    }
  ],
  tableName: 'User_Menu',
  timestamps: false,
  charset: 'latin1',
  collate: 'latin1_general_ci',
});

module.exports = UserMenu;

const { DataTypes, Model } = require('sequelize');
const {sequelize} = require('../../config/database'); // adjust the path as needed

class Login_Log extends Model {}

Login_Log.init({
  ll_pk: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  ll_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ll_client: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  ll_attempt: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  ll_msg: {
    type: DataTypes.STRING(256),
    allowNull: true,
  },
  ll_login_ts: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ll_logout_ts: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Login_Log',
  tableName: 'Login_Log',
  timestamps: false, // Disable automatic createdAt and updatedAt timestamps
  indexes: [
    {
      name: 'idx_ll_cl',
      fields: ['ll_client']
    },
    {
      name: 'idx_ll_id',
      fields: ['ll_id']
    }
  ]
});

module.exports = Login_Log;

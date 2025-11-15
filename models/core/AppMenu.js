const { DataTypes, Model } = require('sequelize');
const {sequelize} = require('../../config/core_db'); 

const AppMenu = sequelize.define('AppMenu', {
    am_pk: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    am_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    am_app_name: {
        type: DataTypes.STRING(30),
        allowNull: false,
    },
    am_parent_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '0 if menu is root level or id if this is child of any menu'
    },
    am_name: {
        type: DataTypes.STRING(30),
        allowNull: false,
        comment: 'link name for display'
    },
    am_link: {
        type: DataTypes.STRING(60),
        allowNull: false,
        comment: 'link address for href'
    },
    am_status: {
        type: DataTypes.ENUM('0', '1', '2'),
        allowNull: false,
        defaultValue: '0',
        comment: '0 for disabled menu or 1 for enabled menu or 2 for inpage/ajax Menus'
    },
    am_icon: {
        type: DataTypes.STRING(60),
        allowNull: true,
        defaultValue: null
    },
    am_tooltip: {
        type: DataTypes.STRING(256),
        allowNull: true,
        defaultValue: null
    },
    am_ts: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'App_Menu',
    timestamps: false,
    indexes: [
        {
            fields: ['am_id']
        },
        {
            fields: ['am_app_name']
        }
    ],
    uniqueKeys: {
        unique_am_id_am_app_name: {
            fields: ['am_id', 'am_app_name']
        }
    }
});

module.exports = AppMenu;

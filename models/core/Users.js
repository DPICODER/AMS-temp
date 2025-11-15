const { DataTypes, Model } = require('sequelize');
const {sequelize} = require('../../config/core_db'); // adjust the path as needed

const User = sequelize.define('User', {
    u_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        // COMMENT: '',
    },
    u_name: {
        type: DataTypes.STRING(60),
        allowNull: true
    },
    u_department: {
        type: DataTypes.STRING(60),
        allowNull: true
    },
    u_project: {
        type: DataTypes.STRING(60),
        allowNull: true
    },
    u_dor: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    u_grade: {
        type: DataTypes.CHAR(5),
        allowNull: true
    },
    u_unit: {
        type: DataTypes.STRING(15),
        allowNull: true
    },
    u_password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    u_theme: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    u_extension_no: {
        type: DataTypes.STRING(15),
        allowNull: true
    },
    u_status: {
        type: DataTypes.ENUM('Retired', 'Transferred', 'Working'),
        allowNull: false
    },
    u_photo: {
        type: DataTypes.BLOB,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'Users',
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

module.exports = User;

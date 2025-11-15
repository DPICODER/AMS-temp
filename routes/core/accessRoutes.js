const express = require("express");
const router = express.Router();
const nocache = require('../../middlewares/noCache.js');

const isAuthenticated = require("../../middlewares/authenticate.js");
const sequelize = require('../../config/core_db.js'); 
const UserMenu = require('../../models/core/UserMenu.js'); 
const AppMenu = require('../../models/core/AppMenu.js'); 
const User = require("../../models/core/Users.js");
let errorMessage = null, successMessage = null;

router.get('/core/accessManage/:userId',isAuthenticated,async (req, res) => {
    const userId = req.params.userId;
    const appNames = await fetchUniqueAppNames();
    const user = await User.findOne({
        attributes: ['u_name'], // Fetch only the u_name field
        where: { u_id: userId }
    });
    const userName = user ? user.u_name : 'Unknown User'; // Handle case when user is not found
    
    res.render('core/accessManage', {
        userId,
        userName,
        appNames,
        title: 'User Access Manage',
        errorMessage: errorMessage,
        successMessage: successMessage
    });
});

router.get('/core/getPermissions',isAuthenticated,async (req, res) => {
    const { userId, appName } = req.query;

    const user_menu_array = await fetchUserMenuArray(userId, appName);
    const menuTree = await getMenuTree(0, '1', user_menu_array, appName);

    res.json({ menuTree });
});

router.post('/core/updatePermissions/:userId',isAuthenticated,async (req, res) => {
    const userId = req.params.userId;
    const { appName, permissions } = req.body;

    try {
        // Delete old permissions
        await UserMenu.destroy({ where: { um_u_id: userId, um_app_name: appName } });

        // Insert new permissions
        if (permissions && permissions.length > 0) {
            const newPermissions = permissions.map(menuId => ({
                um_u_id: userId,
                um_app_name: appName,
                um_menu_id: menuId
            }));
            await UserMenu.bulkCreate(newPermissions);
        }

        successMessage = 'Permissions updated successfully!';
        res.redirect(`/core/accessManage/${userId}`);
    } catch (error) {
        errorMessage = 'Error updating permissions. Please try again.';
        res.redirect(`/core/accessManage/${userId}`);
    }
});

async function fetchAllMenus(appName) {
    return await AppMenu.findAll({
        where: { am_app_name: appName },
        order: [['am_parent_id', 'ASC'], ['am_id', 'ASC']]
    });
}

async function fetchUserPermissions(userId, appName) {
    const permissions = await UserMenu.findAll({ where: { um_u_id: userId, um_app_name: appName } });
    return permissions.map(permission => permission.um_menu_id);
}

async function fetchUniqueAppNames() {
    return await AppMenu.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('am_app_name')), 'am_app_name']]
    });
}

function buildMenuTree(allMenus, userPermissions, parentId = 0) {
    const menuTree = [];
    const filteredMenus = allMenus.filter(menu => menu.am_parent_id === parentId);

    for (const menu of filteredMenus) {
        const children = buildMenuTree(allMenus, userPermissions, menu.am_id);
        menuTree.push({
            am_id: menu.am_id,
            am_name: menu.am_name,
            am_link: menu.am_link,
            am_tooltip: menu.am_tooltip,
            children,
            isChecked: userPermissions.includes(menu.am_id)
        });
    }
    return menuTree;
}

async function fetchUserMenuArray(u_id, u_app_name) {
    const userMenus = await UserMenu.findAll({
        where: { um_u_id: u_id, um_app_name: u_app_name }
    });

    return userMenus.map(menu => menu.um_menu_id);
}

async function getMenuTree(m_parent_id, m_status, user_menu_array, am_app_name) {
    const menus = await AppMenu.findAll({
        //where: { am_parent_id: m_parent_id, am_status: m_status, am_app_name: am_app_name }
        where: { am_parent_id: m_parent_id, am_app_name: am_app_name }
    });

    const menuTree = [];
    for (const menu of menus) {
        const children = await getMenuTree(menu.am_id, m_status, user_menu_array, am_app_name);
        menuTree.push({
            id: menu.am_id,
            parent_id: menu.am_parent_id,
            name: menu.am_name,
            link: menu.am_link,
            status: menu.am_status,
            icon: menu.am_icon,
            tooltip: menu.am_tooltip,
            children,
            isChecked: user_menu_array.includes(menu.am_id)
        });
    }

    return menuTree;
}

module.exports = router;

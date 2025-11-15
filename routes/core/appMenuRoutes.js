const express = require('express');
const router = express.Router();
const AppMenu = require('../../models/core/AppMenu.js'); // Adjust path as necessary
const nocache = require('../../middlewares/noCache.js');

const isAuthenticated = require('../../middlewares/authenticate.js'); // Ensure this path is correct
const logger = require('../../middlewares/logger');

// Route to render the edit screen
router.get('/core/appMenuManage',isAuthenticated,async (req, res) => {
    try {
        //logger.info('Rendering appMenuManage page');
        const appNames = await AppMenu.findAll({
            attributes: ['am_app_name'],
            group: ['am_app_name']
        });
        //logger.info('Fetched app names:', appNames);
        res.render('core/appMenuManage', { appNames, title: 'Edit App Menu', errorMessage: null, successMessage: "Select App Menu From Drop down to edit screens list" });
    } catch (err) {
        logger.error({err},'Error fetching app names:');
        res.render('core/appMenuManage', { appNames: [], title: 'Edit App Menu', errorMessage: 'Internal Server Error: ' + err.message, successMessage: null });
    }
});

// Route to handle add, update, and delete operations
router.post('/core/appMenuManage',isAuthenticated,async (req, res) => {
    const { query, data } = req.body;
    // logger.info('core/appMenuManage', query, data);
    try {
        switch (query) {
            case 'add':
                data.am_pk = null;
               // logger.info('Adding new menu item:', data);
                const newMenu = await AppMenu.create(data);
               // logger.info('Added new menu item:', newMenu);
                res.json(newMenu);
                break;
            case 'update':
                // logger.info('Updating menu item:', data);
                const { am_pk } = data;
                const updatedMenu = await AppMenu.update(data, { where: { am_pk } });
               // logger.info('Updated menu item:', updatedMenu);
                res.json(updatedMenu);
                break;
            case 'delete':
               // logger.info('Deleting menu item:', data.am_pk);
                await AppMenu.destroy({ where: { am_pk: data.am_pk } });
               // logger.info('Deleted menu item with PK:', data.am_pk);
                res.sendStatus(204);
                break;
            default:
                logger.error(`${query.message},Unknown query type:`);
                res.status(400).json({ error: 'Unknown query type' });
        }
    } catch (err) {
        logger.error({err},`Error handling ${query} query:`);
        res.status(500).json({ error: `Internal Server Error: ${err.message}` });
    }
});

// Route to fetch menu data based on app name
router.get('/core/appMenuFetch',isAuthenticated,async (req, res) => {
    try {
        //logger.info('Fetching menu data for app:', req.query.app_name);
        const { app_name } = req.query;
        const menuData = await AppMenu.findAll({ where: { am_app_name: app_name } });
        // logger.info('Fetched menu data:', menuData);
        res.json(menuData);
    } catch (err) {
        logger.error({err},'Error fetching menu data:');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

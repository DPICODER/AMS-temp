const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const fileUpload = require('express-fileupload');
const fs = require('fs');
const nocache = require('../../middlewares/noCache');

const isAuthenticated = require("../../middlewares/authenticate.js");
let successMessage = null, errorMessage = null;
const User = require("../../models/core/Users.js");
const logger = require('../../middlewares/logger');

/******************************* */
// Enable file upload using express-fileupload
router.use(fileUpload({
  useTempFiles: true, // Use temporary files
  tempFileDir: '/tmp/', // Directory for temp files
  limits: { fileSize: 50 * 1024 }, // Limit file size to 50KB
  abortOnLimit: true
}));

// Custom function to convert date to DB format
const DateToDBFormat = (data) => {
  if (!data) return '';
  const [year, month, day] = data.split('-');
  return `${year}-${month}-${day}`;
};

/***************based on id ****************** */
// Route to render the edit user form
//['/core/myProfile', '/core/myProfile/:id']
router.get('/core/myProfile',isAuthenticated,async (req, res) => {
  //const id = req.params.id || req.session.user.id; 
  const id = req.session.user.id; 
  try {
    const usr = await User.findByPk(id);
    if (!usr) {
      throw new Error('User not found');
    }
    successMessage = "Your Profile Loaded";
    res.render('core/myProfile', {
      title: 'Edit Your Profile', usr, action: `/core/myProfile/${id}`,
      buttonLabel: 'Update', successMessage: successMessage, errorMessage: errorMessage,
    });
  } catch (error) {
    logger.error({error},"ERROR :");
    errorMessage = 'Error fetching user:';
    res.render('core/myProfile', {
      title: 'Edit Your Profile', successMessage: successMessage,
      errorMessage: errorMessage, action: `/core/myProfile/${id}`, buttonLabel: 'Update'
    });
  }
});

// Edit user route with file upload
router.post('/core/myProfile',isAuthenticated,async (req, res) => {
  //const u_id = req.params.id;
  let { u_id, u_name, u_department, u_project, u_dor, u_grade, u_unit,
    u_theme, u_extension_no, u_status, u_photo_data } = req.body;
  // logger.info(u_id, u_name, u_department, u_project, u_dor, u_grade, u_unit, u_theme, u_extension_no, u_status, u_photo_data );
  try {
    let u_photo = null;

    // Check if a photo file is uploaded
    if (req.files && req.files.u_photo) {
      const photo = req.files.u_photo;
      const photoData = fs.readFileSync(photo.tempFilePath);
      u_photo = photoData.toString('base64'); // Store photo data as base64 string
    }

    // Check if a photo was captured from the camera
    if (u_photo_data) {
      const buffer = Buffer.from(u_photo_data.replace(/^data:image\/jpeg;base64,/, ""), 'base64');
      u_photo = buffer.toString('base64'); // Store as base64 string
    }

    const formatted_dor = DateToDBFormat(u_dor);
    if (u_photo == null) {
      await User.update({ //incase no photo received dont overwrite existing
        u_name, u_department, u_project, u_dor: formatted_dor, u_grade, u_unit, u_theme, u_extension_no, u_status
      }, { where: { u_id: u_id } });
    } else {
      await User.update({
        u_name, u_department, u_project, u_dor: formatted_dor, u_grade, u_unit, u_theme, u_extension_no, u_status, u_photo
      }, { where: { u_id: id } });
    }

    const successMessage = 'Edit Successful';
    const usr = await User.findByPk(u_id, {
      attributes: [
        'u_id', 'u_name', 'u_department', 'u_project', 'u_dor', 'u_grade', 'u_unit', 'u_theme',
        'u_extension_no', 'u_status', 'u_photo'
      ]
    });
    //logger.info(user);
    res.render('core/myProfile', {
      title: 'Update User',
      // user: { ...req.body, u_name: u_name, u_photo, u_id: id },
      usr,
      action: `/core/myProfile/${u_id}`,
      buttonLabel: 'Update My Profile',
      successMessage,
      errorMessage: null,
    });
  } catch (error) {
    logger.error({error},"ERROR :");
    errorMessage = 'Error: ' + error.message.split('sql:')[0];
    res.render('core/myProfile', {
      title: 'Edit User',
      usr: req.body,
      action: `/core/myProfile/${u_id}`,
      buttonLabel: 'Update My Profile',
      successMessage: null,
      errorMessage,
    });
  }
});

router.get('/core/pswdChange', (req, res) => {
  res.render('core/pswdChange', { title: 'Password Change', successMessage: successMessage, errorMessage: errorMessage });
});

router.post('/core/pswdChange', async (req, res) => {
  //let u_id = req.params.id;
  const { oldPassword, newPassword, u_id } = req.body;
  try {
    // Find the user by u_id
    const usr = await User.findByPk(u_id);

    if (!usr) {
      return res.render('core/pswdChange',
        { title: 'Password Change', successMessage: null, errorMessage: 'User not found' });
    }

    // Compare old password with stored hashed password
    const match = await bcrypt.compare(oldPassword, usr.u_password);

    if (!match) {
      return res.render('core/pswdChange',
        { title: 'Password Change', successMessage: null, errorMessage: 'Old password is incorrect' });
    }

    // Hash the new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update the password in the database
    usr.u_password = hashedPassword;
    await usr.save();

    res.render('core/pswdChange',
      { title: 'Password Change', errorMessage: null, successMessage: 'Password updated successfully' });
  } catch (error) {
    res.render('core/pswdChange',
      { title: 'Password Change', successMessage: null, errorMessage: 'An error occurred' });
  }
});
/******************** */

module.exports = router;

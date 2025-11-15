const express = require("express");
const router = express.Router();
// const {Tag,AcquisitionLineItems,Acquisition} = require('../../models/AQ_C.js')
const logger = require("../../middlewares/logger");
const { Op } = require("sequelize");
const nocache = require("../../middlewares/noCache.js");
const isAuthenticated = require("../../middlewares/authenticate");
const {sequelize} = require("../../config/database");
let successMessage = null,
  errorMessage = null;

//Render to view all tags generated in Search assets view
router.get(
  "/ams/asset/generatetags",
  nocache,
  isAuthenticated,
  async (req, res) => {
    try {
      const poNum = req.query.poNum;
      const matCode = req.query.matCode;
      
      if (!poNum || !matCode) {
        logger.error(`Error : Invalid Input`);
      }

      const tagData = await Tag.findAll({
        where: {
          [Op.and]: [{ li_id: poNum }, { material_description: matCode }],
        },
        include: {
          model: AcquisitionLineItems,
          required: true,
          attributes: ["li_asset_specs"],
        },
      });
      //console.log("TagData : ",tagData);
      if (!tagData) {
        logger.error("No Data found!!");
      }
      successMessage = `Tag Data fetched successfully for ${matCode}.`;

      res.render("ams/AssetSearch", {
        type: "tags" || null,
        tableName :`Tags for Asset : [${matCode}]`||"Default",
        tagData: tagData || [],
        data:[],
        successMessage: successMessage || null,
        errorMessage: errorMessage || null,
      });
    } catch (error) {
      logger.error(`Error Rendering Tags : ${error.message}`);
    }
  }
);
// router.get('/generatetags/:id', generateController.renderTags2);

/**
 * Function that converts the Date format into required format
 *
 * -> example : if date is 28/01/2024
 *
 * -> the current modified date will be
 *
 * -> date : 28A2024
 *
 * @returns Date
 */
const DatetoDB = () => {
  //January - A, February - B..........,December = L
  const monthLetters = [
    "JA",
    "FB",
    "MR",
    "AP",
    "MA",
    "JN",
    "JL",
    "AG",
    "SP",
    "OT",
    "NV",
    "DC",
  ];
  //Date Function
  const currentDate = new Date();
  //gets the current Month
  const monthIndex = currentDate.getMonth();
  //mapping letters to month idx
  const monthLetter = monthLetters[monthIndex];
  // const formattedData = currentDate.toISOString().split('T')[0];
  const Dates = `${currentDate.getDate()}${monthLetter}${currentDate
    .getFullYear()
    .toString()
    .slice(-2)}`;

  return Dates;
};

//Post route to handle tag generation for acquisition line items
router.post(
  "/ams/asset/generatetags",
  nocache,
  isAuthenticated,
  async (req, res) => {
    try {
      logger.info("-> generate tags {Post}");
      const id = req.query.id;

      const makeTag = await AcquisitionLineItems.findOne({
        where: {
          li_id: id,
        },
      });
      if(makeTag){
        
      const tags = [];
      const departmentId_short = req.session.user.department;
      // logger.info(departmentId_short);
      const {
        li_material_description,
        li_id,
        li_material_code,
        li_qty,
        createdAt,
        aq_po_no,
        li_asset_specs,
        li_po_value,
      } = makeTag;

      const shortDate = DatetoDB(); // calls function to modifiy date structure

      async function getNextAutoIncrement() {
        try {
          const [result, metadata] = await sequelize.query(
            "SHOW TABLE STATUS LIKE 'Tag'"
          );
          const NextAutoIncrement = result[0].Auto_increment;
          return NextAutoIncrement;
        } catch (error) {
          logger.error(`error : ${error}`);
        }
      }

      const eachAssetValue = li_po_value / li_qty;
      const lastid = await getNextAutoIncrement();
      if (lastid) {
        // //console.log("LastID :",lastid);
      for (let i = 1, newId = lastid; i <= li_qty; i++) {
        //GETTING LAST PRIMARY KEY INSERTED
        const baseTag = `${departmentId_short}:${shortDate}::${newId++}`;
        const tagValue = `${baseTag}`;
        //
        const existingTag = await Tag.findOne({ where: { tag: tagValue } });
        if (existingTag) {
          logger.info(`[:] Tag already Exist's:${tagValue}`);
          continue;
        }
        const tagData = {
          li_id: li_id,
          tag: baseTag,
          // specs:li_asset_specs,
          material_description: li_material_description,
          // value: eachAssetValue,
          department_q: departmentId_short,
          // assetcreation: createdAt,
        };
        //
        const tag = await Tag.create(tagData);
        tags.push(tag);
        if (makeTag) {
          await makeTag.update({ li_isTagged: 1 });
        } else {
          logger.error("Error updating is Tagged");
        }
      }
      logger.info("-> Redirecting Ajax ");
      //Redirects with a query containing the current data
      ////console.log("mat des : ", li_material_description);
      //
      res.redirect(
        `/ams/asset/generatetags?poNum=${aq_po_no}&matCode=${li_material_description}`
      );
    }
  }else{
    res.status(500).send(`No data found for :${id}`)
  }
    } catch (error) {
      logger.error(`Error Gen tags :${error.message}`);
      if (!res.headerSent) {
        return res.status(500).send("Error generating tags" + error.message);
      }
    }
  }
);

module.exports = router;

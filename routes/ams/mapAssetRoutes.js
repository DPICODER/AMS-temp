const express = require("express");
const router = express.Router();
const { Op, Transaction } = require('sequelize');
const logger = require('../../middlewares/logger');
const isAuthenticated = require("../../middlewares/authenticate.js");
const { err } = require("pino-std-serializers");
// const { Tag, Asset } = require('../../models/AQ_C.js');
const { sequelize } = require("../../config/database.js");
const time = new Date().toLocaleTimeString();

let successMessage = null, errorMessage = null;

router.get("/ams/asset/map_existing_asset", isAuthenticated, async (req, res) => {
    try {
        logger.info("-> Map Existing {GET}")

        successMessage = "Loaded Successfully"
        errorMessage = ""
        res.render("ams/map_Existing", {
            successMessage : successMessage,
            errorMessage : null
        });
    } catch (error) {
        logger.error(`Error :${error.message}`);

        res.render("ams/map_Existing", {
            successMessage : null,
            errorMessage : errorMessage
        });
        res.status(500).send("internal Server Error");
    }
});

router.post("/ams/asset/map_existing_asset", isAuthenticated, async (req, res) => {
    const { empname, phone, building, designation, Os, sapid, tag, material_description, division, queryDepartment, deptname, Status, value } = req.body;
    console.log("REQ BODY :",req.body);
    
    const t = await sequelize.transaction();
    try {
        logger.info("-> Map Existing {POST}")

        let PO;
        if (value === 0) {
            PO = 99999;
        }

        const existingTag = await Tag.findOne(
            {
                where: {
                    [Op.and]: [
                        { tag: tag },
                        {
                            material_description: {
                                [Op.like]: `%${material_description}%`
                            }
                        }
                    ]
                }
            }
        );


        if (existingTag) {
            logger.info(`Tag already Exist's:${tag}`);
            const message = {
                msg: `Tag Already mapped with Tag : ${tag} - ${material_description}`,
                type: 'Asset Already Exists',
                color: 'warning'
            };
            return res.render("map_Existing", { successMessage : message.msg ,errorMessage : null });
        } else {
                  logger.info(
                    `Transaction Initiated at ${time} : Mapping existing unmapped asset.`
                  );
            const tagData = {
                po_no: 99999,
                tag: tag,
                li_id:1,
                material_description: material_description,
                value: value,
                department_q: queryDepartment,
                assetstatus: Status,
                department: deptname,

            };


            const TagCreate = await Tag.create(tagData,{transaction:t});
            // const lastId = await Tag.findOne({
            //     order: [['id', 'DESC']]
            // ,transaction:t});
            console.log("TC : ",TagCreate);
            

            const allotData = {
                id:TagCreate.dataValues.id,
                allocatedTo: empname,
                phone: phone,
                department: deptname,
                uniqueId: tag,
                sapid: sapid,
                building: building,
                value: value,
                division:division,
                status: Status,
                description: material_description,
                designation: designation,
                os: Os,
            }


            const AllotAsset = await Asset.create(allotData,{transaction:t});
            const message = {
                msg: `Asset Mapped Successfully with Tag: ${tag} - ${material_description}`,
            };
                logger.info(
                  `Transaction Success at ${time} : Map Success.`
                );
                await t.commit();
            res.render("ams/map_Existing", {successMessage : message.msg || null , errorMessage : null});
        }
    } catch (error) {
            await t.rollback();
            logger.info(
              `Transaction Failed at ${time} : Asset Mapping Failure.`
            );
            logger.error(`Error :${error}`);
            logger.error(`Error :${error.message}`);
            logger.error(`Error :${error.stack}`);
        res.render("ams/map_Existing", {successMessage : null , errorMessage : error.message});
    }
});


module.exports = router;




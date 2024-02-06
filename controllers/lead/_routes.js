const express = require("express");
const lead = require("./lead");
const auth = require("../../middelwares/auth");

const router = express.Router();

router.get("/", lead.index);
router.get("/viewallleads", auth, lead.getAllLeads);
router.get("/viewuserleads/:createBy", auth, lead.getUserLeads);
router.post("/add", auth, lead.add);
router.post("/createlead", auth, lead.createLead);
router.get("/view/:id", lead.view);
router.patch("/edit/:id", auth, lead.edit);
router.delete("/delete/:id", auth, lead.deleteData);
router.post("/deleteMany", auth, lead.deleteMany);
router.get("/exportLead", lead.exportLead);

module.exports = router;

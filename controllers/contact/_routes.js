const express = require("express");
const contact = require("./contact");
const auth = require("../../middelwares/auth");

const router = express.Router();

router.get("/", auth, contact.index);
router.post("/add", auth, contact.add);
router.post("/addMany", auth, contact.addMany);
router.get("/viewallcontacts", auth, contact.viewAllContacts);
router.get("/viewusercontacts/:createBy", auth, contact.getUserContacts);
router.post("/add-property-interest/:id", auth, contact.addPropertyInterest);
router.get("/view/:id", auth, contact.view);
router.patch("/edit/:id", auth, contact.edit);
router.patch(
  "/updateinterestedproperty/:id",
  auth,
  contact.updateInterestedProperties
);
router.delete("/delete/:id", auth, contact.deleteData);
router.post("/deleteMany", auth, contact.deleteMany);

module.exports = router;

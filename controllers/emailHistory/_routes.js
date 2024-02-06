const express = require("express");
const auth = require("../../middelwares/auth");
const email = require("./email");

const router = express.Router();

router.get("/", email.index);
router.get("/view/:id", auth, email.view);
router.get("/viewallemails", auth, email.viewAllEmails);
router.get("/viewuseremails/:createBy", auth, email.viewUserEmails);
router.post("/add", auth, email.add);

module.exports = router;

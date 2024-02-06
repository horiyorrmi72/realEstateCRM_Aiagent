const express = require("express");
const auth = require("../../middelwares/auth");
const meeting = require("./meeting");

const router = express.Router();

router.get("/", auth, meeting.index);
router.get("/view/:id", auth, meeting.view);
router.get("/viewallmeetings", auth, meeting.viewAllMeetings);
router.get("/viewusermeetings/:createBy", auth, meeting.viewUserMeetings);
router.post("/add", auth, meeting.add);
router.delete("/delete/:id", auth, meeting.deleteMeeting);

module.exports = router;

const express = require("express");
const auth = require("../../middelwares/auth");
const phoneCall = require("./phonCall");

const router = express.Router();

router.get("/", auth, phoneCall.index);
router.get("/view/:id", auth, phoneCall.view);
router.get("/viewallcalls", auth, phoneCall.viewAllCalls);
router.get("/viewusercalls/:createBy", auth, phoneCall.viewUserCalls);
router.post("/add", auth, phoneCall.add);
router.post("/sigleCallUpload", phoneCall.uploadSingleCallData);
router.post("/batchupload", phoneCall.batchCallData);
router.post("/bulkImport", phoneCall.uploadWithCsv);
router.get("/viewlead/:id", phoneCall.getLeadById);
router.get("/getuploadedLead", phoneCall.getAllUploadedLeads);
router.delete("/deleteLead/:id", phoneCall.deleteLead);
router.delete("/deleteLeads", phoneCall.deleteLeads);
router.post("/updateCallIdWebhook", phoneCall.updateCallIdWebhook);
router.post("/callWebhook", phoneCall.callWebhook);
router.get("/getQualifiedLeads", phoneCall.getQualifiedLeads);
router.get("/getQualifiedLead/:id",phoneCall.getQualifiedLeadById);
router.delete("/deleteQualifiedLeads",phoneCall.deleteQualifiedLeads);
router.delete("/deleteQualifiedLeadsById",phoneCall.deleteQualifiedLeadById)
router.post("/sendsms", phoneCall.getCalEventsToSendSms);/*used for getting cal.com events to be used in sending sms*/
router.post("/messanger", phoneCall.messanger);
router.get("/outboundStats", phoneCall.outBoundCallStatistics);

module.exports = router;


const express = require("express");
const router = express.Router();
const llmcalls = require("./llmcalls");


router.get("/llmleadCalls", llmcalls.getllmLeadCalls);
router.get("/viewcallById/:callId", llmcalls.viewCall);
router.get("/inboundCallStats", llmcalls.getCallStatsInbound);
module.exports = router;

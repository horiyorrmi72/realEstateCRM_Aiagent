const Retell = require("retell-sdk")
//const analyzeCall = require("./analyzer");

const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY,
});


const analyzer = async (transcript) => {
  try {
    const customAnalysis = await analyzeCall(transcript);
    return customAnalysis;
  } catch (error) {
    console.log(error.message);
  }
};


const analyzeQuery = async (transcript) => {
  const myanalysis = await analyzer(transcript);
  if (!myanalysis) {
    throw new Error("Failed to analyze the transcript.");
  }

  return myanalysis;
};


function parseTranscriptToArray(transcript) {
  //console.log("Transcript:", transcript); // Log the transcript
  if (!transcript || typeof transcript !== "string") {
    return [];
  }

  const messages = transcript.split("\n");
  const transcriptArray = [];
  let currentSpeaker = null;
  let currentMessage = "";

  for (const msg of messages) {
    if (msg.startsWith("Agent:")) {
      if (currentSpeaker === "User") {
        transcriptArray.push({
          speaker: "User",
          message: currentMessage.trim(),
        });
        currentMessage = "";
      }
      currentSpeaker = "Agent";
      currentMessage += msg.substring(7).trim();
    } else if (msg.startsWith("User:")) {
      if (currentSpeaker === "Agent") {
        transcriptArray.push({
          speaker: "Agent",
          message: currentMessage.trim(),
        });
        currentMessage = "";
      }
      currentSpeaker = "User";
      currentMessage += msg.substring(6).trim();
    }
  }
  // Add the last message to the transcript array
  if (currentSpeaker === "Agent") {
    transcriptArray.push({ speaker: "Agent", message: currentMessage.trim() });
  } else if (currentSpeaker === "User") {
    transcriptArray.push({ speaker: "User", message: currentMessage.trim() });
  }

  return transcriptArray;
}

const getllmLeadCalls = async (req, res) => {
  try {
    const filterCriteria = {
      agent_id: ["f3957e5a6cc141258ea1f5653d949aed"],
    };

    const callList = await retellClient.call.list(filterCriteria);

    const filteredCallList = await Promise.all(callList.map(async (call) => {
      const isLead = call.call_analysis && call.call_analysis.agent_sentiment === "Positive";
     // const myanalysis = await analyzeQuery(call.call_analysis.call_summary);

      return {
        call_id: call.call_id,
        agent_id: call.agent_id,
        caller_number: call.from_number,
        call_status: call.call_status,
        start_time: new Date(call.start_timestamp),
        end_time: new Date(call.end_timestamp),
        transcript: parseTranscriptToArray(call.transcript),
        recordingUrl: call.recording_url,
        disconnectionReason: call.disconnection_reason,
        call_summary: call.call_summary,
        call_analysis: call.call_analysis,
        isLead: isLead,
       // caller_name: myanalysis.name
      };
    }));

    const total = filteredCallList.length;
    return res.status(200).json({
      msg: "Call history fetched successfully",
      total,
      result: filteredCallList,
    });
  } catch (error) {
    return res.status(500).json({ msg: "Error fetching call history", error: error.message });
  }
};



const viewCall = async (req, res) => {
  try {
    const callId = req.params.callId;
    if (!callId) {
      return res.status(400).json({ msg: "Invalid call id" });
    }
    const callDetails = await retellClient.call.retrieve(callId);
   // const myanalysis = await analyzeQuery(callDetails.summary);


    if (!callDetails) {
      return res.status(404).json({ msg: "Call details not found" });
    }

    const filteredCallList = {
      call_id: callDetails.call_id,
      agent_id: callDetails.agent_id,
      caller_number: callDetails.from_number,
      call_status: callDetails.call_status,
      start_time: new Date(callDetails.start_timestamp),
      end_time: new Date(callDetails.end_timestamp),
      transcript: parseTranscriptToArray(callDetails.transcript),
      recordingUrl: callDetails.recording_url,
      disconnectionReason: callDetails.disconnection_reason,
      call_analysis: callDetails.call_analysis,
      call_summary: callDetails.call_summary,
     // caller_name: myanalysis.name,

    };

    return res.status(200).json({
      msg: "Call details fetched successfully",
      result: filteredCallList,
    });
  } catch (err) {
   // console.error(err);
    return res
      .status(500)
      .json({ msg: "Unable to fetch call data", error: err.message });
  }
};

const getCallStatsInbound = async (req, res) => {
  try {
       const filterCriteria = {
      agent_id: "f3957e5a6cc141258ea1f5653d949aed",
    };

    // Fetch call list from the client based on filter criteria
    const callList = await retellClient.call.list(filterCriteria);

    // Calculate the total number of calls received
    const totalCallsReceived = callList.length;

    // Calculate the total call duration in minutes
    const totalCallDuration = callList.reduce((acc, call) => {
      const startTime = new Date(call.start_timestamp);
      const endTime = new Date(call.end_timestamp);
      const durationInMinutes = (endTime - startTime) / (1000 * 60); 
      return acc + durationInMinutes;
    }, 0);

    
    const totalCallDurationFormatted = parseFloat(totalCallDuration.toFixed(2))
    
    const totalInboundCallLead = callList.filter(call => {
      return call.call_analysis.agent_sentiment === "Positive"; 
    }).length;
    return res.status(200).json({
      msg: "Inbound call statistics fetched successfully",
      data: {
        totalCallsReceived,
        totalCallDuration: totalCallDurationFormatted,
	totalInboundCallLead
      },
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "Unable to fetch call statistics", error: err.message });
  }
};

module.exports = {
  getllmLeadCalls,
  viewCall,
  getCallStatsInbound 
}

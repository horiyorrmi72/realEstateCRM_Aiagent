const mongoose = require('mongoose');
const axios = require("axios");
const callOut = require("../model/schema/outboundcalls");


const BATCH_SIZE = 5;
const INTERVAL_BETWEEN_BATCHES = 2 * 60 * 1000;
const CALL_END_TIME = { hour: 22, minute: 30 };
const CALL_START_TIME = { hour: 11, minute: 0 };
const INTERVAL_TO_FETCH_CALL_DETAILS = 5 * 60 * 1000;




/*formatter*/
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
    if (msg.startsWith("assistant:")) {
      if (currentSpeaker === "user") {
        transcriptArray.push({
          speaker: "user",
          message: currentMessage.trim(),
        });
        currentMessage = "";
      }
      currentSpeaker = "assistant";
      currentMessage += msg.substring(10).trim();
    } else if (msg.startsWith("user:")) {
      if (currentSpeaker === "assistant") {
        transcriptArray.push({
          speaker: "assistant",
          message: currentMessage.trim(),
        });
        currentMessage = "";
      }
      currentSpeaker = "user";
      currentMessage += msg.substring(6).trim();
    }
  }
  // Add the last message to the transcript array
  if (currentSpeaker === "assistant") {
    transcriptArray.push({
      speaker: "assistant",
      message: currentMessage.trim(),
    });
  } else if (currentSpeaker === "user") {
    transcriptArray.push({ speaker: "user", message: currentMessage.trim() });
  }

  return transcriptArray;
}



/*const bookingNotifierBySms = async()=>{
try{}
catch(err)
{
console.log(error.message);
}
}
*/
const processBatches = async (req, res) => {
    try
    {
        // getting the contacts from db
        const contacts = await callOut
            .find({ call_status: { $nin: ["completed", "in progress"]} })
            .exec();
        // looping through the contacts to create a new batch
        for (let i = 0; i < contacts.length; i += BATCH_SIZE)
        {
            const batch = contacts.slice(i, i + BATCH_SIZE);
            await processBatch(batch);

            // time manager for each bach calling
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            if (
                currentHour > CALL_END_TIME.hour ||
                (currentHour === CALL_END_TIME.hour &&
                    currentMinute === CALL_END_TIME.minute)
            )
            {
                console.log(
                    `Calls on hold for the rest of the day, resumes calling from ${CALL_START_TIME} tomorrow`
                );
                await waitTillNextDay();
            } else
            {
                console.log(
                    `Waiting for ${INTERVAL_BETWEEN_BATCHES / 6000
                    } minutes before next batch is intitiated`
                );
           await new Promise(resolve => setTimeout(resolve, INTERVAL_BETWEEN_BATCHES));
            }
        }
    }
    catch (err)
    {
      console.log(err);
      return res.status(500).json({msg:"Internal Server Error", error: err});

    }
}
const processBatch = async (batch) => {
  const mapCalls = batch.map((contact) => makeCall(contact));
  await Promise.all(mapCalls);
};

const callServerUrl = "https://lead-qualifier-i0r3.onrender.com/make-call";

const makeCall = async (contact) => {
  try {
    const { name, phoneNumber, email } = contact;
    const response = await axios.post(callServerUrl, {
      name,
      phoneNumber,
      email,
    });
    if (response.status === 200) {
      await callOut.updateOne(
        { _id: contact.id },
        { $set: { call_status: "in progress" } }
      );
      console.log(`Updated status for ${phoneNumber}`);
    } else {
      console.log(`Error calling ${phoneNumber}`);
    }
  } catch (err) {
    console.log("error: " + err.message);
  }
};

const waitTillNextDay = async () => {
  const now = new Date();
  const nextDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    CALL_START_TIME.hour,
    CALL_START_TIME.minute
  );
  const delay = nextDay - now;
  await new Promise((resolve) => setTimeout(resolve, delay));
};



module.exports ={
 processBatches,
 makeCall
};


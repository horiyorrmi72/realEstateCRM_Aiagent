const PhoneCall = require("../../model/schema/phoneCall");
const User = require("../../model/schema/user");
const QualifiedLead =  require("../../model/schema/qualifiedLead");
const badLead =  require("../../model/schema/badLead");
const noAnsweredCall =  require("../../model/schema/noAnswer");
const OutCalls = require("../../model/schema/outboundcalls");
const { analyzeCall } = require("./openaiAnalyzer");
const mongoose = require("mongoose");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const upload = multer({ dest: "uploads/" });
const { processBatches, makeCall } = require('../../utilities/callManager');
const twilio = require("twilio");
const axios = require("axios");
const { parse, format } = require('date-fns');


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const retrialTimeFrame = 120000;

//deleting qualified leads
const deleteQualifiedLeads = async (req, res) => {
  // get leads id's from the body
  const { id } = req.body;
  if (!id || !Array.isArray(id) || id.length === 0) {
    return res.status(404).json({
      msg: "Could not find any leads to delete 🤞",
      data: {
        success: false,
        error: true,
        hint: "Ensure you are selecting a valid lead to be deleted & ID parameter is required and should be an array 👉",
      },
    });
  }
  try {
    // find all leads in the body provided
    const qualifiedLeadsToDeleteArray = await QualifiedLead.find({
      _id: { $in: id },
    });
    if (qualifiedLeadsToDeleteArray.length === 0) {
      return res
        .status(404)
        .json({ msg: "no qualified lead found to be deleted" });
    }

    await QualifiedLead.deleteMany({
      _id: { $in: qualifiedLeadsToDeleteArray },
    });
    return res.status(204).json({
      msg: "qualified lead deleted successfully",
    });
  } catch (error) {
    console.log("Error with deleting qualified leads 😠 :" , error.message);
    return res
      .status(500)
      .json({ msg: "Error deleting qualified leads 😠", Error: error.message });
  }
};

//delete qualified lead by id
const deleteQualifiedLeadById = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ msg: "Missing parameter: id" });
    }

    const lead = await QualifiedLead.deleteOne({ _id: id });

    if (lead.deletedCount === 0) {
      return res.status(404).json({
        msg: "No bad lead found to be deleted",
        data: {
          success: false,
          error: false,
          status: 404,
        },
      });
    }

    return res.status(200).json({
      msg: "Lead deleted successfully",
      data: {
        success: true,
        error: false,
        deletedCount: lead.deletedCount,
      },
    });
  } catch (err) {
    console.error("Error deleting lead:", err.message);
    return res.status(500).json({
      msg: "Error deleting lead",
      data: {
        success: false,
        error: true,
        errorMessage: err.message,
      },
    });
  }
};





//call statistics
const outBoundCallStatistics = async (req, res) => {
  try {
    // number of contacts uploaded to the CRM
    const totalContactsUploaded = await OutCalls.find().countDocuments();
    // get number of calls made
    const dialedCalls = await OutCalls
      .find({ call_status: { $ne: "in-active" } })
      .countDocuments();
    // number of calls answered
    const answeredCalls = await OutCalls
      .find({ call_status: "completed" })
      .countDocuments();

    // Sum of all call durations
     const totalCallDurationResult = await OutCalls.aggregate([
      { $match: { call_status: { $ne: "in-active" } } },
      { 
        $group: { 
          _id: null, 
          totalDuration: { $sum: "$call_duration" } 
        } 
      }
    ]);

    const totalCallDuration = totalCallDurationResult[0]
      ?parseFloat(totalCallDurationResult[0].totalDuration.toFixed(2))
      : 0.00;


    const qualifiedLeads = await QualifiedLead.find();
    const totalQualifiedOutboundLeads = await QualifiedLead.find().countDocuments();

    // number of qualified leads that are off-plan
    const totalOffPlan = qualifiedLeads.filter(
      (lead) => lead.property_market_type === "off-plan"
    ).length;

    // number of qualified leads that are secondary market
    const totalSecondaryMarket = qualifiedLeads.filter(
      (lead) => lead.property_market_type === "secondary market"
    ).length;

      const totalBadleads = await badLead.find().countDocuments();

    return res.status(200).json({
      msg: "outbound stats data fetched",
      data: {
        totalContactsUploaded,
        dialedCalls,
        answeredCalls,
        totalOffPlan,
        totalSecondaryMarket,
	totalCallDuration,
	totalQualifiedOutboundLeads
      },
    });
  } catch (err) {
    console.error(err.message);
    return res
      .status(500)
      .json({ msg: "error fetching outbound calls statistics", Error: err.message });
  }
};



/**const deleteQualifiedLeads = async (req, res) =>{
const { id } = req.body;
  if (!id || !Array.isArray(id) || id.length === 0)
  {
    return res
      .status(400)
      .json({ error: "ID parameter is required and should be an array" });
  }
  try
  {
    const leads = await QualifiedLead.find({ _id: { $in: id } })

    if (leads.length === 0)
    {
      return res.status(400).json({ error: "leads not found" });
    }

    await QualifiedLead.deleteMany({ _id: { $in: leads } });
    return res
      .status(204)
      .json({ success: true, msg: "Leads deleted successfully" });
  }
  catch (err)
  {
    return res.status(500).json({ error: err.message });
  }
}
*/

const getQualifiedLeadById = async (req, res) => {
  try
  { 
    const id = req.params.id;
    const selectedQualifiedLead = await QualifiedLead.findById(id).exec();
    if (!selectedQualifiedLead)
    {
      return res.status(404).json({ msg:"not found"});
    }
    return res.status(200).json({msg:"qualified lead found!", data: selectedQualifiedLead});
  }
  catch (err)
  {
    console.error(err);
    return res.status(500).json({msg:"internal error", Error: err.message});
  }
}

const getCalEventsToSendSms = async (req, res) => {
  console.log(req.body);

  try {
    const { triggerEvent, createdAt, payload } = req.body;

    if (!triggerEvent || payload.status !== "ACCEPTED") {
      return res.status(404).json({
        success: false,
        message: "Couldn't get necessary data from the event to be used in sending SMS notifications to the lead.",
      });
    }

    if (triggerEvent === "BOOKING_CREATED" && createdAt && payload) {
      const leadName = payload.responses.name.value;  //since we will be having one attendee at a time for the 15mins meeting.
      const leadNumber = payload.smsReminderNumber || null;
      const meetingTime = format(payload.startTime, 'yyyy-MM-dd HH:mm');
      const meetingLink = payload.metadata.videoCallUrl;

      if (!leadName || !leadNumber || !meetingTime || !meetingLink) {
        return res.status(400).json({
          success: false,
          message: "Missing required lead information",
        });
      }

      try {
        await axios.post("https://queenevaagentai.com/api/phoneCall/messanger", {
          leadsName: leadName,
          to: leadNumber,
          meetingTimes: meetingTime,
          meetingLinks: meetingLink,
        });

        return res.status(200).json({
          success: true,
          message: "Successfully sent booking appointment notification to the lead",
        });
      } catch (err) {
        console.error(err.message);
        return res.status(400).json({
          message: "Error sending message to the lead",
          error: err.message,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid booking details provided",
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

const messanger = async (req, res) => {
  const { leadsName, to, meetingTimes, meetingLinks } = req.body;

  if (!leadsName || !to || !meetingTimes || !meetingLinks) {
    console.log("Parameters missing in messanger section");
    return res.status(404).json({
      msg: "Invalid parameters or parameters missing",
    });
  }

  try {
    const message = await client.messages.create({
      from: process.env.EVA_SMS_NUMBER,
      to: to,
      body: `Hello ${leadsName},\nThis is to notify you that your appointment with Eva Real Estate Agency for ${meetingTimes} has been booked successfully. Please join using the following link: ${meetingLinks}`,
    });

    console.log(message.body);
    return res.status(200).json({
      success: true,
      msg: "Booking Notification Successfully Sent to lead!",
      msgSid: message.sid,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      msg: "Internal server error",
      Error: err.message,
    });
  }
};


const deleteLeads = async (req, res) =>{
const { id } = req.body;
  if (!id || !Array.isArray(id) || id.length === 0)
  {
    return res
      .status(400)
      .json({ error: "ID parameter is required and should be an array" });
  }
  try
  {
    const leads = await OutCalls.find({ _id: { $in: id } })

    if (leads.length === 0)
    {
      return res.status(400).json({ error: "leads not found" });
    }

    await OutCalls.deleteMany({ _id: { $in: leads } });
    return res
      .status(204)
      .json({ success: true, msg: "Leads deleted successfully" });
  }
  catch (err)
  {
    return res.status(500).json({ error: err.message });
  }
}

const deleteLead = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Bad request: ID parameter is required' });
  }

  try {
    const lead = await OutCalls.findOne({ _id:id });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await OutCalls.deleteOne({_id:lead });
    return res.status(200).json({ success: true, msg: 'Lead deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};


const add = async (req, res) => {
  try {
    const {
      sender,
      recipient,
      category,
      callDuration,
      startDate,
      endDate,
      callNotes,
      createBy,
      createByLead,
    } = req.body;

    if (createBy && !mongoose.Types.ObjectId.isValid(createBy)) {
      res.status(400).json({ error: "Invalid createBy value" });
    }
    if (createByLead && !mongoose.Types.ObjectId.isValid(createByLead)) {
      res.status(400).json({ error: "Invalid createByLead value" });
    }
    const phoneCall = {
      sender,
      category,
      recipient,
      callDuration,
      startDate,
      endDate,
      callNotes,
    };

    if (createBy) {
      phoneCall.createBy = createBy;
    }

    if (createByLead) {
      phoneCall.createByLead = createByLead;
    }

    const user = await User.findById({ _id: phoneCall.sender });
    user.outboundcall = user.outboundcall + 1;
    await user.save();

    const result = new PhoneCall(phoneCall);
    await result.save();
    res.status(200).json({ result });
  } catch (err) {
    console.error("Failed to create :", err);
    res.status(400).json({ err, error: "Failed to create" });
  }
};

const index = async (req, res) => {
  try {
    const query = req.query;
    if (query.sender) {
      query.sender = new mongoose.Types.ObjectId(query.sender);
    }
    let result = await PhoneCall.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "leads", // Assuming this is the collection name for 'leads'
          localField: "createByLead",
          foreignField: "_id",
          as: "createByrefLead",
        },
      },
      {
        $lookup: {
          from: "contacts",
          localField: "createBy",
          foreignField: "_id",
          as: "contact",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "users",
        },
      },
      { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$contact", preserveNullAndEmptyArrays: true } },
      {
        $unwind: { path: "$createByrefLead", preserveNullAndEmptyArrays: true },
      },
      { $match: { "users.deleted": false } },
      {
        $addFields: {
          senderName: { $concat: ["$users.firstName", " ", "$users.lastName"] },
          deleted: {
            $cond: [
              { $eq: ["$contact.deleted", false] },
              "$contact.deleted",
              { $ifNull: ["$createByrefLead.deleted", false] },
            ],
          },
          createByName: {
            $cond: {
              if: "$contact",
              then: {
                $concat: [
                  "$contact.title",
                  " ",
                  "$contact.firstName",
                  " ",
                  "$contact.lastName",
                ],
              },
              else: { $concat: ["$createByrefLead.leadName"] },
            },
          },
        },
      },
      { $project: { contact: 0, createByrefLead: 0, users: 0 } },
    ]);

    res.status(200).json(result);
  } catch (err) {
    console.error("Failed :", err);
    res.status(400).json({ err, error: "Failed " });
  }
};

const view = async (req, res) => {
  try {
    let result = await PhoneCall.findOne({ _id: req.params.id });

    if (!result) return res.status(404).json({ message: "no Data Found." });

    let response = await PhoneCall.aggregate([
      { $match: { _id: result._id } },
      {
        $lookup: {
          from: "contacts",
          localField: "createBy",
          foreignField: "_id",
          as: "contact",
        },
      },
      {
        $lookup: {
          from: "leads", // Assuming this is the collection name for 'leads'
          localField: "createByLead",
          foreignField: "_id",
          as: "createByrefLead",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "users",
        },
      },
      { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$contact", preserveNullAndEmptyArrays: true } },
      {
        $unwind: { path: "$createByrefLead", preserveNullAndEmptyArrays: true },
      },
      { $match: { "users.deleted": false } },
      {
        $addFields: {
          senderName: { $concat: ["$users.firstName", " ", "$users.lastName"] },

          deleted: {
            $cond: [
              { $eq: ["$contact.deleted", false] },
              "$contact.deleted",
              { $ifNull: ["$createByrefLead.deleted", false] },
            ],
          },
          createByName: {
            $cond: {
              if: "$contact",
              then: {
                $concat: [
                  "$contact.title",
                  " ",
                  "$contact.firstName",
                  " ",
                  "$contact.lastName",
                ],
              },
              else: { $concat: ["$createByrefLead.leadName"] },
            },
          },
        },
      },
      { $project: { contact: 0, createByrefLead: 0, users: 0 } },
    ]);

    res.status(200).json(response[0]);
  } catch (err) {
    console.error("Failed :", err);
    res.status(400).json({ err, error: "Failed " });
  }
};

//view all calls api-------------------------
const viewAllCalls = async (req, res) => {
  try {
    let calls = await PhoneCall.find();

    if (!calls || calls.length === 0) {
      return res.status(404).json({ message: "No data found." });
    }

    let response = await PhoneCall.aggregate([
      {
        $lookup: {
          from: "contacts",
          localField: "createBy",
          foreignField: "_id",
          as: "contact",
        },
      },
      {
        $lookup: {
          from: "leads", // Assuming this is the collection name for 'leads'
          localField: "createByLead",
          foreignField: "_id",
          as: "createByrefLead",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "users",
        },
      },
      {
        $addFields: {
          senderName: {
            $concat: [
              { $arrayElemAt: ["$users.firstName", 0] },
              " ",
              { $arrayElemAt: ["$users.lastName", 0] },
            ],
          },
          recipientName: {
            $cond: {
              if: { $gt: [{ $size: "$contact" }, 0] },
              then: {
                $concat: [
                  { $arrayElemAt: ["$contact.firstName", 0] },
                  " ",
                  { $arrayElemAt: ["$contact.lastName", 0] },
                ],
              },
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$createByrefLead" }, 0] },
                  then: { $arrayElemAt: ["$createByrefLead.leadName", 0] },
                  else: "",
                },
              },
            },
          },
        },
      },
      {
        $project: {
          users: 0,
          contact: 0,
          createByrefLead: 0,
        },
      },
    ]);

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
//view specific user's calls api-------------------------
const viewUserCalls = async (req, res) => {
  const sender = req.params.createBy;
  try {
    let calls = await PhoneCall.find();

    if (!calls || calls.length === 0) {
      return res.status(404).json({ message: "No data found." });
    }

    let response = await PhoneCall.aggregate([
      {
        $match: {
          sender: new mongoose.Types.ObjectId(sender),
        },
      },
      {
        $lookup: {
          from: "contacts",
          localField: "createBy",
          foreignField: "_id",
          as: "contact",
        },
      },
      {
        $lookup: {
          from: "leads", // Assuming this is the collection name for 'leads'
          localField: "createByLead",
          foreignField: "_id",
          as: "createByrefLead",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "users",
        },
      },
      {
        $addFields: {
          senderName: {
            $concat: [
              { $arrayElemAt: ["$users.firstName", 0] },
              " ",
              { $arrayElemAt: ["$users.lastName", 0] },
            ],
          },
          recipientName: {
            $cond: {
              if: { $gt: [{ $size: "$contact" }, 0] },
              then: {
                $concat: [
                  { $arrayElemAt: ["$contact.firstName", 0] },
                  " ",
                  { $arrayElemAt: ["$contact.lastName", 0] },
                ],
              },
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$createByrefLead" }, 0] },
                  then: { $arrayElemAt: ["$createByrefLead.leadName", 0] },
                  else: "",
                },
              },
            },
          },
        },
      },
      {
        $project: {
          users: 0,
          contact: 0,
          createByrefLead: 0,
        },
      },
    ]);

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const uploadSingleCallData = async (req, res) => {
  try {
    const data = req.body;
	const existingEmail = await OutCalls.findOne({email: data.email});
if(existingEmail){
        return res.status(409).json({msg:"Data with similar details already exist"});
}

    const existingDetails = await OutCalls.findOne({ phoneNumber: data.phoneNumber });
    if (existingDetails) {
      return res.status(409).json({ msg: "Data with these details already exists" });
    }

    const leadDetails = new OutCalls({
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber
    });

    await leadDetails.save();
    await processBatches();
    return res.status(200).json({ msg: 'Lead data updated to the CRM database.' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Internal server error', error: error.message });
  }
};

const batchCallData = async (req, res) => {
  try {
    const data = req.body;

    const phoneNumbers = data.map(item => item.phoneNumber);
    const emails = data.map(item => item.email);
    // checking for  existing entries with these phone numbers
    const existingDetails = await OutCalls.find({
      phoneNumber: { $in: phoneNumbers }
    });
const existingEmail = await OutCalls.find({email:{$in: emails}});
if(existingEmail){
	return res.status(409).json({msg:"Data with similar details already exist"});
}

    if (existingDetails.length > 0) {
      return res.status(409).json({
        msg: "Data with similar details already exists.",
        existing_data: existingDetails,
      });
    }

    const datasToUpload = await OutCalls.insertMany(data);
    //await callManager();
    return res.status(200).json({ msg: "Leads data updated.", datasToUpload });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Internal server error", error: error.message });
  }
};

const uploadWithCsv = (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ msg: err.message });
    }

    try {
     
      if (!req.file) {
        return res.status(400).json({ msg: "No file uploaded." });
      }

      const results = [];

     
      const parseCsv = () => {
        return new Promise((resolve, reject) => {
          fs.createReadStream(req.file.path)
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => resolve(results))
            .on("error", (error) => reject(error));
        });
      };

      await parseCsv();

      // map the data from the uploaded CSV file
      const mappedData = results.map((result) => ({
        name: result.NAME,
        email: result.EMAIL.trim(),
        phoneNumber: result.PHONENUMBER
      }));

      // extract phone numbers to check for existing entries in bulk
      const phoneNumbers = mappedData.map((item) => item.phoneNumber);
      const emails = mappedData.map((item)=> item.email);
      const existingDetails = await OutCalls.find({
  $or: [
    { phoneNumber: { $in: phoneNumbers } },
    { email: { $in: emails } }
  ]
});


      if (existingDetails.length > 0) {
console.log(existingDetails);
        return res.status(409).json({
          msg: "Data with similar details already exists.",
          existing_data: existingDetails,
        });
      }

      await OutCalls.insertMany(mappedData);
      await processBatches();
      res.status(200).json({ msg: "Contacts details uploaded successfully." });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: error.message });
    } finally {
      
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.log(err);
        }
      });
    }
  });
};


const getLeadById = async (req, res) => {
  try
  {
    const id  = req.params.id;
    const selectedLead = await OutCalls.findById(id).exec();
    if (!selectedLead)
    {
      return res.status(404).json({ msg: "invalid lead id provided" });
    } 
    return res.status(200).json({ msg: "lead found", data: selectedLead });
  }
  catch (err)
  {
    console.error(err);
    return res.status(500).json({msg:"internal server error", error: err.message})
  }
}



const getAllUploadedLeads = async (req, res) => {
  try {
    const leads = await OutCalls.find().exec();
    const totalLeads = await OutCalls.countDocuments();
    if (!leads) {
      return res.status(404).json({ msg: "No lead found" });
    }
    return res
      .status(200)
      .json({
        msg: "leads fetched successfully",
        total: totalLeads,
        leads: leads,
      });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ msg: "An internal server error occurred while trying to fetch leads", error: err.message });
  }
}

const updateCallIdWebhook = async (req, res) => {
 // console.log(req.body);
  try {
    const {
      call_id,
      phoneNumber } = req.body;
    const updatecontactCallId = await OutCalls.updateOne({ phoneNumber: phoneNumber }, { $set: { call_id: call_id}});
    return res.status(200).json({ msg: `Call id for ${phoneNumber} was updated successfully` });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ msg: "Internal Server Error", Error: err.message });
  }
};

/*transcript formatter*/
function parseTranscriptToArray(transcript) {
  if (!transcript || typeof transcript !== "string") {
    return [];
  }

  const messages = transcript.split(/(assistant:|user:)/);
  const transcriptArray = [];
  let currentSpeaker = null;
  let currentMessage = "";

  for (let i = 1; i < messages.length; i += 2) {
    const speaker = messages[i].trim().replace(":", "");
    const message = messages[i + 1].trim();

    if (currentSpeaker && currentSpeaker !== speaker) {
      transcriptArray.push({
        speaker: currentSpeaker,
        message: currentMessage.trim(),
      });
      currentMessage = "";
    }

    currentSpeaker = speaker;
    currentMessage += " " + message;
  }

  // Add the last message to the transcript array
  if (currentSpeaker) {
    transcriptArray.push({
      speaker: currentSpeaker,
      message: currentMessage.trim(),
    });
  }

  return transcriptArray;
}

function parseTranscriptToString(transcriptArray) {
  if (!Array.isArray(transcriptArray)) {
    return "";
  }

  return transcriptArray.map(item => `${item.speaker}: ${item.message}`).join("\n");
}

//booking section
const parseToISO8601 = (dateStr) => {
  const ordinalSuffixRegex = /(\d+)(st|nd|rd|th)/;
  const cleanedDateString = dateStr.replace(ordinalSuffixRegex, "$1");
  const parsedDate = parse(cleanedDateString, "EEE d at ha", new Date());
  return format(parsedDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
};

//this booker is used if the agent misses the appointment email but was able to gather the appointment time

const booker = async ({ start, name, email, smsReminderNumber }) => {
  const apiKey = process.env.CAL_API_KEY;
  const eventTypeId = process.env.CAL_EVENT_ID;
  const timeZone = "Asia/Dubai";
  const language = "en";
  const metadata = {};
  const username = process.env.CAL_USER_NAME;

  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
  let formattedStart = start;

  // Checking if the date is in the "Wed 11..." format and convert it
  if (!iso8601Regex.test(start)) {
    try {
      formattedStart = parseToISO8601(start);
    } catch (error) {
      throw new Error(`Invalid datetime format for 'start'. Could not parse date. ${error.message}`);
    }
  }

  const data = {
    eventTypeId: parseInt(eventTypeId),
    start: formattedStart,
    responses: {
      name,
      email,
      smsReminderNumber: smsReminderNumber,
    },
    timeZone: timeZone,
    language,
    metadata,
    username,
  };

  try {
    const response = await axios.post(
      `https://api.cal.com/v1/bookings?apiKey=${apiKey}`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error booking appointment:",
      error.response ? error.response.data : error.message
    );
    throw new Error(error.response ? error.response.data : error.message);
  }
};


//call retrial
const retrial = async (contact, maxRetries = 3, retrialTimeFrame = 120000) => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`Attempting to call ${contact.phoneNumber}...`);
      await makeCall(contact);
      console.log(`Call to ${contact.phoneNumber} was successful.`);
      break; // Break the loop if the call is successful
    } catch (err) {
      retries += 1;
      console.log(`Retrying call to ${contact.phoneNumber} (${retries} time(s)) - Error: ${err.message}`);
      if (retries >= maxRetries) {
        console.log(`Attempted to call ${contact.phoneNumber} ${retries} times but no response was received.`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, retrialTimeFrame));
    }
  }
};

const getEmailFromOutCalls = async (call_id) => {
  const result = await OutCalls.findOne({ call_id: call_id });
  return result ? result.email : null;
};

//custom analyzer
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


const callWebhook = async (req, res) => {
  console.log(req.body);
  try {
    const {
      call_id,
      to,
      call_length,
      status,
      summary,
      started_at,
      end_at,
      concatenated_transcript,
      recording_url,
      analysis
    } = req.body;
console.log(req.body);

    const transcriptArray = parseTranscriptToArray(concatenated_transcript);
    const myanalysis = await analyzeQuery(summary);
//console.log(myanalysis);

    // Update OutCalls collection with call details
    await OutCalls.updateOne(
      { phoneNumber: to, call_id },
      {
        $set: {
          call_id,
          call_duration: call_length.toFixed(2),
          call_status: status,
          call_summary: summary,
          lead_confirmed:myanalysis.isLead,
          start_date: started_at,
          property_type: myanalysis.propertyMarketType,
          end_date: end_at,
          transcript: transcriptArray,
          call_recording: recording_url,
          call_back_later: myanalysis.callBack,
          analyzed: true
        }
      }
    );

    // Fetch updated call details
    const updatedCall = await OutCalls.findOne({ phoneNumber: to, call_id });

    // Handle no-answer scenario
    if (status === "no-answer") {
      setTimeout(async () => {
        await retrial({ name: updatedCall.name, phoneNumber: to, email: updatedCall.email, call_id });

        // Check final call status and handle bad leads
        const finalUpdatedCall = await OutCalls.findOne({ phoneNumber: to, call_id });
        if (finalUpdatedCall.call_status === "no-answer") {
          const existingContact = await noAnsweredCall.findOne({ email: updatedCall.email });
          if (!existingContact) {
            const noAnswerContact = new noAnsweredCall({
              phoneNumber: to,
              email: updatedCall.email,
              name: updatedCall.name,
	      created_at: new Date()
            });
            await noAnswerContact.save();
          } else {
            console.log(`Contact with email ${updatedCall.email} already exists`);
          }
          await OutCalls.deleteOne({ phoneNumber: to, call_id });
        }
      }, 120000); // 2 minutes
    }

    // handling state base on analysis
    if (!myanalysis.isLead || myanalysis.leadQualityScore <= 2 || !myanalysis.userHasBookedAppointment) {
      // Handle non-qualified leads
      const badleads = new badLead({
        name: updatedCall.name,
        email: updatedCall.email,
        phoneNumber: to,
        call_id,
        call_duration: call_length,
        call_summary: summary,
        start_date: started_at,
        call_recording: recording_url,
	created_at : new Date()
      });
      await badleads.save();
     // await OutCalls.deleteOne({ phoneNumber: to, call_id });

      return res.status(200).json({ msg: `Call data for ${to} was updated successfully`, success: true, error: false });
    } else if(myanalysis.isLead || myanalysis.leadQualityScore > 2) {
      // Handle qualified leads
      const email = myanalysis.email || updatedCall.email;
      
      const qualifiedLead = new QualifiedLead({
        name: myanalysis.name,
        phoneNumber: myanalysis.phoneNumber,
        email_address: email,
        budget: myanalysis.budget,
        property_market_type: myanalysis.propertyMarketType,
        property_description: myanalysis.propertyDescription,
        property_location: myanalysis.propertyLocation,
        property_purpose: myanalysis.propertyPurpose,
        property_sizes: myanalysis.propertySizes,
        isLead: myanalysis.isLead,
        lead_quality_score: myanalysis.leadQualityScore,
        user_has_booked_appointment: myanalysis.userHasBookedAppointment,
        appointment_time: myanalysis.appointmentTime,
        user_wants_to_sell_property: myanalysis.userWantsToSellProperty,
        user_wants_to_buy_property:  myanalysis.userWantsToBuyProperty,
        other_requirements: myanalysis.otherRequirements,
        user_nationality: myanalysis.userNationality,
        call_back: myanalysis.callBack|| false,
	created_at: new Date()
      });

      await qualifiedLead.save();
    }

    return res.status(200).json({ msg: `Call data for ${to} was updated successfully`, success: true, error: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Internal Server Error", error: err.message });
  }
};

const getQualifiedLeads = async (req, res) =>{
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const leads = await QualifiedLead.find().skip(offset).limit(limit).exec();
    const totalQualifiedLeads = await QualifiedLead.countDocuments();

    if (!leads || totalQualifiedLeads === 0) {
      return res.status(404).json({ msg: "No Leads for now" });
    }

    return res.status(200).json({
      status: 'success',
      msg: 'Leads fetched successfully',
      total: totalQualifiedLeads,
      Leads: leads,
      nextOffset: offset + limit 
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ msg: "Internal Server Error", Error: err.message });
  }
}


module.exports = { add, index, view, viewAllCalls, viewUserCalls,batchCallData,uploadSingleCallData, uploadWithCsv, getLeadById,getAllUploadedLeads, deleteLead, updateCallIdWebhook, callWebhook, deleteLeads,getQualifiedLeads, getCalEventsToSendSms,messanger,
 getQualifiedLeadById, deleteQualifiedLeads, outBoundCallStatistics, deleteQualifiedLeadById };

require("dotenv").config();
const express = require("express");
const db = require("./db/config");
const route = require("./controllers/route");
const bodyParser = require("body-parser");
const cors = require("cors");
const port = 5001;
const fs = require("fs");
const path = require("path");
const Retell = require("retell-sdk");
const callOut = require("./model/schema/outboundcalls");
const twilio = require("twilio");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
//Setup Express App
const app = express();
// Middleware
app.use(bodyParser.json());
app.use(express.json());
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Bad JSON');
        return res.status(400).send({ error: 'Bad JSON' });
    }
    next();
});

// Set up CORS
app.use(cors());

app.use(function (req, res, next) {
  const allowedOrigins = ["*", "http://157.245.98.50:5001"];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});
//API Routes
app.use("/api", route);

app.get("/", async (req, res) => {
  res.send("Welcome to my world...");

  //! for Delete folder ./uploads
  // const folderPath = './uploads'; // Use the appropriate path here
  // try {
  //     function removeFolderRecursive(folderPath) {
  //         if (fs.existsSync(folderPath)) {
  //             fs.readdirSync(folderPath).forEach(file => {
  //                 const curPath = path.join(folderPath, file);

  //                 if (fs.lstatSync(curPath).isDirectory()) {
  //                     removeFolderRecursive(curPath); // Recursive call for subdirectories
  //                 } else {
  //                     fs.unlinkSync(curPath); // Delete file
  //                 }
  //             });

  //             fs.rmdirSync(folderPath); // Remove empty directory
  //             console.log(`Folder ${folderPath} and its contents have been removed.`);
  //         }
  //     }
  //     removeFolderRecursive(folderPath);
  //     res.send({ message: `Folder ${folderPath} and its contents have been removed.` });
  // } catch (err) {
  //     console.error(`Error removing folder: ${err.message}`);
  //     res.status(500).send({ message: `Error removing folder: ${err.message}` });
  // }
});




app.post("/caleventsForSms", async (req, res) => {
  console.log(req.body);
  try {
    const { triggerEvent, createdAt, payload } = req.body;
    if (!triggerEvent || payload.status !== "ACCEPTED") {
      return res.status(404).json({
        success: false,
        message:
          "Couldn't get necessary data from the event to be used in sending SMS notifications to the lead.",
      });
    }

    if (triggerEvent === "BOOKING_CREATED" && createdAt && payload) {
      try {
        const leadName = payload.responses.name;
        const leadNumber = payload.responses.smsReminderNumber;
        const meetingTime = payload.startTime;
        const meetingLink = payload.metadata.videoCallUrl;

        const message = await client.messages.create({
          from: process.env.EVA_SMS_NUMBER,
          to: leadNumber,
          body: `Hi ${leadName},\nThis is to notify you that your appointment with Eva Real Estate Agency for ${meetingTime} has been booked successfully.\nFind the meeting link below.\nMeeting link: ${meetingLink}`,
        });

        console.log(message.body);
        return res
          .status(200)
          .json({
            success: true,
            message:
              "Successfully sent booking appointment notification to the lead",
          });
      } catch (err) {
        console.error(err.message);
        return res.status(400).json({
          message: "Error sending message to the lead",
          error: err.message,
        }); 
      }
    } else {
      return res
        .status(400)
        .json({ message: "Invalid booking details provided" });
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
});

// Get port from environment and store in Express.

const server = app.listen(port, () => {
  const protocol =
    process.env.HTTPS === "true" || process.env.NODE_ENV === "production"
      ? "https"
      : "http";
  const { address, port } = server.address();
  const host = address === "::" ? "127.0.0.1" : address;
  console.log(`1Server listening at ${protocol}://${host}:${port}`);
});

// Connect to MongoDB
const DATABASE_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017";
// const DATABASE_URL = 'mongodb://127.0.0.1:27017'
const DATABASE = process.env.DB || "Prolink";

db(DATABASE_URL, DATABASE);

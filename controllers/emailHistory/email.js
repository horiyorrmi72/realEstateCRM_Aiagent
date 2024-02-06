const { sendEmail } = require("../../middelwares/mail");
const EmailHistory = require("../../model/schema/email");
const User = require("../../model/schema/user");
const mongoose = require("mongoose");

const add = async (req, res) => {
  try {
    const {
      sender,
      recipient,
      subject,
      message,
      startDate,
      category,
      endDate,
      createBy,
      createByLead,
    } = req.body;

    if (createBy && !mongoose.Types.ObjectId.isValid(createBy)) {
      res.status(400).json({ error: "Invalid createBy value" });
    }
    if (createByLead && !mongoose.Types.ObjectId.isValid(createByLead)) {
      res.status(400).json({ error: "Invalid createByLead value" });
    }

    const email = {
      sender,
      recipient,
      subject,
      message,
      startDate,
      endDate,
      category,
    };

    if (createBy) {
      email.createBy = createBy;
    }
    if (createByLead) {
      email.createByLead = createByLead;
    }

    const user = await User.findById({ _id: email.sender });
    user.emailsent = user.emailsent + 1;
    await user.save();
    // sendEmail(email.recipient, email.subject, email.message)

    const result = new EmailHistory(email);
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

    let result = await EmailHistory.aggregate([
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
          from: "contacts", // Assuming this is the collection name for 'contacts'
          localField: "createBy",
          foreignField: "_id",
          as: "createByRef",
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
      { $unwind: { path: "$createByRef", preserveNullAndEmptyArrays: true } },
      {
        $unwind: { path: "$createByrefLead", preserveNullAndEmptyArrays: true },
      },
      { $match: { "users.deleted": false } },
      {
        $addFields: {
          senderName: { $concat: ["$users.firstName", " ", "$users.lastName"] },
          deleted: {
            $cond: [
              { $eq: ["$createByRef.deleted", false] },
              "$createByRef.deleted",
              { $ifNull: ["$createByrefLead.deleted", false] },
            ],
          },
          createByName: {
            $cond: {
              if: "$createByRef",
              then: {
                $concat: [
                  "$createByRef.title",
                  " ",
                  "$createByRef.firstName",
                  " ",
                  "$createByRef.lastName",
                ],
              },
              else: { $concat: ["$createByrefLead.leadName"] },
            },
          },
        },
      },
      {
        $project: {
          createByRef: 0,
          createByrefLead: 0,
          users: 0,
        },
      },
    ]);

    res.status(200).json(result);
  } catch (err) {
    console.error("Failed :", err);
    res.status(400).json({ err, error: "Failed " });
  }
};

const view = async (req, res) => {
  try {
    let result = await EmailHistory.findOne({ _id: req.params.id });

    if (!result) return res.status(404).json({ message: "no Data Found." });

    let response = await EmailHistory.aggregate([
      { $match: { _id: result._id } },
      {
        $lookup: {
          from: "leads",
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
          as: "createByRef",
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
      { $unwind: { path: "$createByRef", preserveNullAndEmptyArrays: true } },
      {
        $unwind: { path: "$createByrefLead", preserveNullAndEmptyArrays: true },
      },
      { $match: { "users.deleted": false } },
      {
        $addFields: {
          senderEmail: "$users.username",
          deleted: {
            $cond: [
              { $eq: ["$createByRef.deleted", false] },
              "$createByRef.deleted",
              { $ifNull: ["$createByrefLead.deleted", false] },
            ],
          },
          recipientEmail: {
            $cond: {
              if: "$createByRef",
              then: {
                $concat: ["$createByRef.email"],
              },
              else: { $concat: ["$createByrefLead.leadEmail"] },
            },
          },

          createByName: {
            $cond: {
              if: "$createByRef",
              then: {
                $concat: [
                  "$createByRef.firstName",
                  " ",
                  "$createByRef.lastName",
                ],
              },
              else: { $concat: ["$createByrefLead.leadName"] },
            },
          },
        },
      },
      {
        $project: {
          createByRef: 0,
          createByrefLead: 0,
          users: 0,
        },
      },
    ]);

    res.status(200).json(response[0]);
  } catch (err) {
    console.error("Failed :", err);
    res.status(400).json({ err, error: "Failed " });
  }
};

//view all emails api-------------------------
const viewAllEmails = async (req, res) => {
  try {
    let emails = await EmailHistory.find();

    if (!emails || emails.length === 0) {
      return res.status(404).json({ message: "No data found." });
    }

    let response = await EmailHistory.aggregate([
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
//view specific user's emails api-------------------------
const viewUserEmails = async (req, res) => {
  try {
    const sender = req.params.createBy;

    let emails = await EmailHistory.find();

    if (!emails || emails.length === 0) {
      return res.status(404).json({ message: "No data found." });
    }

    let response = await EmailHistory.aggregate([
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
          from: "leads",
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

module.exports = { add, index, view, viewAllEmails, viewUserEmails };

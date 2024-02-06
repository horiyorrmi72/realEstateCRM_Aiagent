const Contact = require("../../model/schema/contact");
const emailHistory = require("../../model/schema/email");
const MeetingHistory = require("../../model/schema/meeting");
const phoneCall = require("../../model/schema/phoneCall");
const Task = require("../../model/schema/task");
const TextMsg = require("../../model/schema/textMsg");
const DocumentSchema = require("../../model/schema/document");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const index = async (req, res) => {
  const query = req.query;
  query.deleted = false;

  let allData = await Contact.find(query)
    .populate({
      path: "createBy",
      match: { deleted: false }, // Populate only if createBy.deleted is false
    })
    .exec();

  const result = allData.filter((item) => item.createBy !== null);

  try {
    res.send(result);
  } catch (error) {
    res.send(error);
  }
};

const add = async (req, res) => {
  try {
    req.body.createdDate = new Date();
    const user = new Contact(req.body);
    await user.save();
    res.status(200).json(user);
  } catch (err) {
    console.error("Failed to create Contact:", err);
    res.status(400).json({ error: "Failed to create Contact" });
  }
};

const addMany = async (req, res) => {
  try {
    const data = req.body;
    const isContactExist = await Contact.findOne({
      email: req.body.email,
    });
    if (!isContactExist) {
      const insertedContact = await Contact.insertMany(data);
      res.status(200).json(insertedContact);
    } else {
      res.status(400).json({ error: "Contact already exists" });
    }
  } catch (err) {
    console.error("Failed to create Contact :", err);
    res.status(400).json({ error: "Failed to create Contact" });
  }
};

const addPropertyInterest = async (req, res) => {
  try {
    const { id } = req.params;
    await Contact.updateOne(
      { _id: id },
      { $set: { interestProperty: req.body } }
    );
    res.send(" uploaded successfully.");
  } catch (err) {
    console.error("Failed to create Contact:", err);
    res.status(400).json({ error: "Failed to create Contact" });
  }
};

const edit = async (req, res) => {
  console.log(req.body, "body+++");
  try {
    let result = await Contact.updateOne(
      { _id: req.params.id },
      { $set: req.body }
    );
    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to Update Contact:", err);
    res.status(400).json({ error: "Failed to Update Contact" });
  }
};
const updateInterestedProperties = async (req, res) => {
  try {
    const newInterestProperties = req.body.interestProperty.map(
      (item) => new ObjectId(item)
    );

    let isInterestedPropertyExist = await Contact.findOne({
      _id: req.params.id,
      interestProperty: { $in: newInterestProperties },
    });

    if (!isInterestedPropertyExist) {
      let result = await Contact.updateOne(
        { _id: req.params.id },
        { $addToSet: { interestProperty: { $each: newInterestProperties } } }
      );

      if (result) {
        res
          .status(200)
          .json({ message: "Interest property added successfully." });
      }
    } else {
      res.status(400).json({ error: "Interested Property Already Existed" });
    }
  } catch (err) {
    console.error("Failed to Add Property:", err);
    res.status(400).json({ error: "Failed to Add Property" });
  }
};

const view = async (req, res) => {
  try {
    let contact = await Contact.findOne({ _id: req.params.id });
    console.log(contact);
    let interestProperty = await Contact.findOne({
      _id: req.params.id,
    }).populate("interestProperty");

    if (!contact) return res.status(404).json({ message: "No data found." });
    let EmailHistory = await emailHistory.aggregate([
      { $match: { createBy: contact._id } },
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
        $addFields: {
          senderName: { $concat: ["$users.firstName", " ", "$users.lastName"] },

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
              else: "",
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

    //--------------------------------------------------------
    let phoneCallHistory = await phoneCall.aggregate([
      { $match: { createBy: contact._id } },
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
      { $unwind: "$contact" },
      { $match: { "contact.deleted": false } },
      {
        $addFields: {
          senderName: { $concat: ["$users.firstName", " ", "$users.lastName"] },
          deleted: "$contact.deleted",
          createByName: {
            $concat: [
              "$contact.title",
              " ",
              "$contact.firstName",
              " ",
              "$contact.lastName",
            ],
          },
        },
      },
      {
        $project: { contact: 0, users: 0 },
      },
    ]);
    let meetingHistory = await MeetingHistory.aggregate([
      {
        $match: {
          $expr: {
            $and: [{ $in: [contact._id, "$attendes"] }],
          },
        },
      },
      {
        $lookup: {
          from: "contacts",
          localField: "attendes",
          foreignField: "_id",
          as: "contact",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "users",
        },
      },
      { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          attendesArray: "$contact.email",
          createdByName: "$users.username",
        },
      },
      {
        $project: {
          contact: 0,
          users: 0,
        },
      },
    ]);
    let textMsg = await TextMsg.aggregate([
      { $match: { createFor: contact._id } },
      {
        $lookup: {
          from: "contacts",
          localField: "createFor",
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
      { $unwind: "$contact" },
      { $match: { "contact.deleted": false } },
      {
        $addFields: {
          sender: "$users.username",
          deleted: "$contact.deleted",
          createByName: {
            $concat: [
              "$contact.title",
              " ",
              "$contact.firstName",
              " ",
              "$contact.lastName",
            ],
          },
        },
      },
      {
        $project: { contact: 0, users: 0 },
      },
    ]);

    let task = await Task.aggregate([
      { $match: { assignmentTo: contact._id } },
      {
        $lookup: {
          from: "contacts",
          localField: "assignmentTo",
          foreignField: "_id",
          as: "contact",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createBy",
          foreignField: "_id",
          as: "users",
        },
      },
      { $unwind: { path: "$contact", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          assignmentToName: "$contact.email",
          createByName: "$users.username",
        },
      },
      { $project: { contact: 0, users: 0 } },
    ]);

    const Document = await DocumentSchema.aggregate([
      { $unwind: "$file" },
      { $match: { "file.deleted": false, "file.linkContact": contact._id } },
      {
        $lookup: {
          from: "users", // Replace 'users' with the actual name of your users collection
          localField: "createBy",
          foreignField: "_id", // Assuming the 'createBy' field in DocumentSchema corresponds to '_id' in the 'users' collection
          as: "creatorInfo",
        },
      },
      { $unwind: { path: "$creatorInfo", preserveNullAndEmptyArrays: true } },
      { $match: { "creatorInfo.deleted": false } },
      {
        $group: {
          _id: "$_id", // Group by the document _id (folder's _id)
          folderName: { $first: "$folderName" }, // Get the folderName (assuming it's the same for all files in the folder)
          createByName: {
            $first: {
              $concat: ["$creatorInfo.firstName", " ", "$creatorInfo.lastName"],
            },
          },
          files: { $push: "$file" }, // Push the matching files back into an array
        },
      },
      { $project: { creatorInfo: 0 } },
    ]);

    res.status(200).json({
      interestProperty,
      contact,
      EmailHistory,
      phoneCallHistory,
      meetingHistory,
      textMsg,
      task,
      Document,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error, err: "An error occurred." });
  }
};

const deleteData = async (req, res) => {
  console.log(req.params.id);
  try {
    const contact = await Contact.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: "done", contact });
  } catch (err) {
    res.status(404).json({ message: "error", err });
  }
};

const deleteMany = async (req, res) => {
  try {
    const contact = await Contact.updateMany(
      { _id: { $in: req.body } },
      { $set: { deleted: true } }
    );
    res.status(200).json({ message: "done", contact });
  } catch (err) {
    res.status(404).json({ message: "error", err });
  }
};

const viewAllContacts = async (req, res) => {
  try {
    let contactDetails = await Contact.find();
    res
      .status(200)
      .json({ message: "Details fetched Successfully", contactDetails });
  } catch (error) {
    res.status(404).json({ message: "error", error });
  }
};

//Api for fetching specific user contacts--------------------------
const getUserContacts = async (req, res) => {
  const createBy = req.params;
  try {
    const contactDetails = await Contact.find(createBy);

    res.status(200).json(contactDetails);
  } catch (err) {
    console.error("Failed to Fetch Contacts :", err);
    res.status(400).json({ error: "Failed to Fetch Contacts " });
  }
};

module.exports = {
  index,
  add,
  updateInterestedProperties,
  addPropertyInterest,
  view,
  edit,
  deleteData,
  viewAllContacts,
  deleteMany,
  getUserContacts,
  addMany,
};

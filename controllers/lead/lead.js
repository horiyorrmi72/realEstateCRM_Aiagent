const Lead = require("../../model/schema/lead");
const EmailHistory = require("../../model/schema/email");
const PhoneCall = require("../../model/schema/phoneCall");
const Task = require("../../model/schema/task");
const MeetingHistory = require("../../model/schema/meeting");
const DocumentSchema = require("../../model/schema/document");
const badLeads =  require("../../model/schema/badLead");

//delete bad leads
const deleteMultipleBadleads = async (req, res) => {
  try {
    const { ids } = req.body; 
   if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        msg: "Invalid input, array of IDs is required",
        data: {
          success: false,
          error: true,
          status: 400
        }
      });
    }

    const result = await badLeads.deleteMany({ _id: { $in: ids } }).exec();

    if (result.deletedCount === 0) {
      return res.status(404).json({
        msg: "No bad leads found to delete",
        data: {
          success: false,
          error: false,
          status: 404
        }
      });
    }

    return res.status(204).json({
      msg: "Bad leads deleted successfully",
      data: {
        success: true,
        error: false,
        deletedCount: result.deletedCount
      }
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Error deleting bad leads",
      error: err.message
    });
  }
};

//delete  badlead by id
const deleteBadLeadsById = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ msg: "Missing parameter: id" });
    }

    const lead = await badLeads.deleteOne({ _id: id });

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
      msg: "Bad lead deleted successfully",
      data: {
        success: true,
        error: false,
        deletedCount: lead.deletedCount,
      },
    });
  } catch (err) {
    console.error("Error deleting bad lead:", err);
    return res.status(500).json({
      msg: "Error deleting bad lead",
      data: {
        success: false,
        error: true,
        errorMessage: err.message,
      },
    });
  }
};


//get bad lead by id
const getBadleadById = async (req, res) => {
  try {
    const { id } = req.params;
    const badlead = await badLeads.findById(id).exec();

    if (!badlead) {
      return res.status(404).json({
        msg: "Bad lead not found",
        data: {
          success: false,
          error: false,
          status: 404
        }
      });
    }

    return res.json({
      msg: "Fetched bad lead",
      data: {
        success: true,
        error: false,
        leadData: badlead
      }
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Error fetching bad lead data",
      error: err.message
    });
  }
};

//geting bad leads from agent bad lead page
const getBadleads = async (req, res) => {
  try {
    const badleads = await badLeads.find().exec();

    if (badleads.length === 0) {
      return res.status(404).json({
        msg: "No bad leads at the moment 😊",
        data: {
          success: false,
          error: false,
          status: 404,
        },
      });
    }

    return res.json({
      msg: "Fetched bad leads",
      data: {
        success: true,
        error: false,
        leadsData: badleads,
      },
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Error fetching bad leads data",
      error: err.message,
    });
  }
};


const index = async (req, res) => {
  const query = req.query;
  query.deleted = false;

  // let result = await Lead.find(query);

  let allData = await Lead.find(query)
    .populate({
      path: "createBy",
      match: { deleted: false }, // Populate only if createBy.deleted is false
    })
    .exec();

  const result = allData.filter((item) => item.createBy !== null);
  res.send(result);
};

//Api for creating lead--------------------------
const createLead = async (req, res) => {
  try {
    const data = req.body;
    console.log(data);
    const insertedLead = await Lead.insertMany(data);

    res.status(200).json(insertedLead);
  } catch (err) {
    console.error("Failed to create Lead :", err);
    res.status(400).json({ error: "Failed to create Lead" });
  }
};

//Api for fetching all leads--------------------------
const getAllLeads = async (req, res) => {
  try {
    const allleads = await Lead.find();

    res.status(200).json(allleads);
  } catch (err) {
    console.error("Failed to Fetch Lead :", err);
    res.status(400).json({ error: "Failed to Fetch Lead " });
  }
};
//Api for fetching specific user leads--------------------------
const getUserLeads = async (req, res) => {
  const createBy = req.params;
  try {
    const allleads = await Lead.find(createBy);

    res.status(200).json(allleads);
  } catch (err) {
    console.error("Failed to Fetch Lead :", err);
    res.status(400).json({ error: "Failed to Fetch Lead " });
  }
};

const add = async (req, res) => {
  try {
    req.body.createdDate = new Date();
    const user = new Lead(req.body);
    await user.save();
    res.status(200).json(user);
  } catch (err) {
    console.error("Failed to create Lead:", err);
    res.status(400).json({ error: "Failed to create Lead" });
  }
};

const edit = async (req, res) => {
  try {
    let result = await Lead.updateOne(
      { _id: req.params.id },
      { $set: req.body }
    );
    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to Update Lead:", err);
    res.status(400).json({ error: "Failed to Update Lead" });
  }
};

const view = async (req, res) => {
  let lead = await Lead.findOne({ _id: req.params.id });
  if (!lead) return res.status(404).json({ message: "no Data Found." });

  // let query = req.query;
  // console.log(req.query, "query+++++");
  // if (query.sender) {
  //   query.sender = new mongoose.Types.ObjectId(query.sender);
  // }
  // query.createByLead = req.params.id;
  console.log(lead._id, "lead id +++");
  // view email for lead
  let Email = await EmailHistory.aggregate([
    { $match: { createByLead: lead._id } },
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
    { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createByRef", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createByrefLead", preserveNullAndEmptyArrays: true } },
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

  let phoneCall = await PhoneCall.aggregate([
    { $match: { createByLead: lead._id } },
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
    { $unwind: { path: "$createByrefLead", preserveNullAndEmptyArrays: true } },
    { $match: { "users.deleted": false } },
    {
      $addFields: {
        senderName: { $concat: ["$users.firstName", " ", "$users.lastName"] },
        deleted: "$createByrefLead.deleted",
        createByName: "$createByrefLead.leadName",
      },
    },
    { $project: { createByrefLead: 0, users: 0 } },
  ]);

  let task = await Task.aggregate([
    { $match: { assignmentToLead: lead._id } },
    {
      $lookup: {
        from: "lead",
        localField: "assignmentToLead",
        foreignField: "_id",
        as: "lead",
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
    { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        assignmentToName: lead.leadName,
        createByName: "$users.username",
      },
    },
    { $project: { lead: 0, users: 0 } },
  ]);

  let meeting = await MeetingHistory.aggregate([
    {
      $match: {
        $expr: {
          $and: [{ $in: [lead._id, "$attendesLead"] }],
        },
      },
    },
    {
      $lookup: {
        from: "lead",
        localField: "assignmentToLead",
        foreignField: "_id",
        as: "lead",
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
        attendesArray: "$lead.leadEmail",
        createdByName: "$users.username",
      },
    },
    {
      $project: {
        users: 0,
      },
    },
  ]);

  const Document = await DocumentSchema.aggregate([
    { $unwind: "$file" },
    { $match: { "file.deleted": false, "file.linkLead": lead._id } },
    {
      $lookup: {
        from: "users", 
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

  res.status(200).json({ lead, Email, phoneCall, task, meeting, Document });
};

const deleteData = async (req, res) => {
  try {
    const lead = await Lead.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: "done", lead });
  } catch (err) {
    res.status(404).json({ message: "error", err });
    console.log(err);
  }
};

const deleteMany = async (req, res) => {
  try {
    const lead = await Lead.updateMany(
      { _id: { $in: req.body } },
      { $set: { deleted: true } }
    );
    res.status(200).json({ message: "done", lead });
  } catch (err) {
    res.status(404).json({ message: "error", err });
  }
};

const exportLead = async (req, res) => {};

module.exports = {
  index,
  add,
  getUserLeads,
  createLead,
  getAllLeads,
  view,
  edit,
  deleteData,
  deleteMany,
  exportLead,
  getBadleads,
  getBadleadById,
  deleteMultipleBadleads,
  deleteBadLeadsById
};

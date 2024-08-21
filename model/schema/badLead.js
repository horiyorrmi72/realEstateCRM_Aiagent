const mongoose = require('mongoose');
const { Schema } = mongoose;

const badLeadsSchema = new Schema({
  name: {
    type: String,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    trim: true,
  },
  call_id: {
    type: String,
    default: "",
    trim: true,
  },
  call_status: {
    type: String,
    default: "",
    trim: true,
  },
  start_date: {
      type: Date,
      trim: true,
  },
  end_date: {
      type: Date,
      trim: true,
  },
  call_duration: {
    type: String,
    trim: true,
  },
  call_summary: {
    type: String,
    trim: true,
  },
  created_at: {
    type: Date,
  },
  lead_type: {
    type: String,
    default: "Bad Lead",
  },
  call_back_later: {
    type: Boolean,
    default: false,
  },
created_at:{
type: Date
}
});

const badLeads = mongoose.model("BadLeads", badLeadsSchema);
module.exports = badLeads;

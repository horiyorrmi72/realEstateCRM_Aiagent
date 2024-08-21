const mongoose = require("mongoose");
const { Schema } = mongoose;

const transcriptSchema = new Schema({
  speaker: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  agent_action: {
    type: String,
  },
});

const outboundCallSchema = new Schema({
  name: {
    type: String,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  email: {
    type: String,
    unique: true,
    trim: true,
    match: [/.+@.+\..+/, 'Please fill a valid email address'],
  },
  call_id: {
    type: String,
    default: "",
    trim: true,
    index: true,
  },
  call_status: {
    type: String,
    default: "in-active",
    trim: true,
  },
  start_date: {
    type: Date,
    
  },
  end_date: {
    type: String,
  },
  call_duration: {
    type: Number,
    default: 0.00,
    trim: true,
  },
  call_summary: {
    type: String,
    default: 'not concluded yet',
    trim: true,
  },
  property_type: {
    type: String,
    default: 'undefined',
    trim: true,
  },
  property_purpose: {
    type: String,
    default: 'undefined',
    trim:true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  lead_confirmed: {
    type: Boolean,
    default: false,
  },
  lead_type: {
    type: String,
    default: 'Not determined yet',
  },
  call_back_later: {
    type: Boolean,
    default: false,
  },
  requirements_and_budget: [
    {
      budget: {
        type: String,
        default: "$0.00",
      },
      specific_requirements: {
        type: String,
        default: "none",
      },
    },
  ],
  transcript: [transcriptSchema],
messaged:{
type: Boolean,
default: false
},
  analyzed: {
    type: Boolean,
    default: false,
  },
  call_recording: {
    type: String,
  },
});

const OutCalls = mongoose.model("outboundCalls", outboundCallSchema);
module.exports = OutCalls;

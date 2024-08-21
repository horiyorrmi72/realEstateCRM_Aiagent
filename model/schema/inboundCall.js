const mongoose = require("mongoose");
const { Schema } = mongoose;

const inboundCallSchema = new Schema({
  call_id: { type: String, unique: true, trim: true },
  caller_number: { type: String, trim: true },
  call_status: { type: String, trim: true },
  start_time: { type: String, trim: true },
  end_time: { type: String, trim: true },
  leadName: { type: String },
  leadEmail: { type: String},
  call_completion_rating: { type: String, trim: true },
  recording_url: { type: String, trim: true },
  call_summary: { type: String, trim: true },
  transcript: { type: String, trim: true },
  isLead: { type: Boolean },
  appointment_date_and_time: { type: String },
  property_Data: {
    property_ref_number: { type: String, trim: true },
    propertyDescription: { type: String, trim: true },
    propertyLocation: { type: String, trim: true },
    propertyType: { type: String, trim: true },
    pricing: { type: String, trim: true },
    isLead: { type: Boolean },
    leadQualityScore: { type: Number },
    userHasBookedAppointment: { type: Boolean },
    clientPreferences: { type: String, trim: true },
    otherRequirements: { type: String, trim: true },
  },
});

const inboundCalls = mongoose.model("inboundCalls", inboundCallSchema);
module.exports = inboundCalls;

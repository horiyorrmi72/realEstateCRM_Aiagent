const mongoose = require("mongoose");
const { Schema } = mongoose;
const outboundCalls =  require("./outboundcalls");
const qualifiedLeadSchema = new Schema({
  outBoundLeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: outboundCalls,
  },
  name: {
    type: String,
    required: true,
  },
  email_address: {
    type: String,
    unique: true,
    trim: true,
    match: [/.+@.+\..+/, "Please fill a valid email address"],
  },
  property_market_type: {
    type: String,
    default: "undefined",
    trim: true,
  },
  property_description: {
    type: String,
    trim: true,
  },
  property_location: {
    type: String,
    trim: true,
  },
  property_purpose: {
    type: String,
    default: "undefined",
  },
  property_sizes: {
    type: String,
    trim: true,
  },
  budget: {
    type: String,
    trim: true,
  },
  isLead: {
    type: Boolean,
    default: false,
  },
  lead_quality_score: {
    type: Number,
    default: 0,
  },
  user_has_booked_appointment: {
    type: Boolean,
    default: false,
  },
  user_wants_to_buy_property: {
    type: Boolean,
    default: false,
  },
  user_wants_to_sell_property: {
    type: Boolean,
    default: false,
  },
  user_nationality: {
    type: String,
    trim: true,
  },
  appointment_time: {
    type: String,
    trim: true,
  },
  other_requirements: {
    type: Array,
  
  },
call_back:{
type: Boolean,
default : false
},
  created_at: {
    type: Date,
  
  },
});


const QualifiedLead = mongoose.model("QualifiedLead", qualifiedLeadSchema);
module.exports  = QualifiedLead;

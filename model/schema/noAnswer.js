const mongoose = require('mongoose');
const { Schema } = mongoose;

const noAnswerSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address']
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
   
  },
created_at:{
type:Date
},
}, { timestamps: true });

const noAnsweredCall = mongoose.model('noAnsweredCalls', noAnswerSchema);

module.exports = noAnsweredCall;

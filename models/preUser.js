const mongoose = require("mongoose");
const preUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: String,
  otpExpires: Date,
  isVerified: { type: Boolean, default: false },
  dob: Date,
});
module.exports = mongoose.model("preUser", preUserSchema);

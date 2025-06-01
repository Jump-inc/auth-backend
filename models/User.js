const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  otp: { type: String, default: null },
  dob: Date,
  otpExpiry: { type: Date, default: null },
  resetPasswordOTP: String,
  resetPasswordExpires: Date,
});

module.exports = mongoose.model("User", userSchema);

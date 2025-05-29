const User = require("../models/User");
const preUser = require("../models/preUser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const preRegister = async (req, res) => {
  const { email } = req.body;
  try {
    let user = await preUser.findOne({ email });
    if (user && user.isVerified)
      return res
        .status(400)
        .json({ message: "User exists already, kindly log in" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    if (!user) {
      user = await preUser.create({ email, otp, otpExpires });
    } else {
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
    }
    const otpMsg = {
      to: email,
      from: { name: "jump", email: "no-reply@streamjump.info" },
      subject: "Your One-Time Password (OTP)",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome!</h2>
          <p>Your one-time password is:</p>
          <h1 style="font-size: 32px;">${otp}</h1>
          <p>This OTP will expire in 10 minutes.</p>
        </div>
      `,
    };
    try {
      await sgMail.send(otpMsg);
      console.log("OTP sent");
      res.status(200).json({ message: "successfully sent otp" });
    } catch (error) {
      console.log("otp not sent");
      return res.status(400).json({ message: "unable to send OTP", error });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "error sending otp" });
  }
};

const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await preUser.findOne({ email });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "invalid or expired otp" });
    }
    user.isVerified = true;
    user.otp = undefined;
    await user.save();
    res.status(200).json({ message: "email successfully verified!" });
  } catch (error) {
    res.status(400).json({ message: "unable to verify email" });
  }
};

const saveDOB = async (req, res) => {
  const { email, dob } = req.body;
  try {
    const user = await preUser.findOne({ email });
    if (!user || !user.isVerified) {
      return res.status(400).json({ message: "Email not verified" });
    }

    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    const actualAge =
      monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

    if (actualAge < 13)
      return res
        .status(400)
        .json({ message: "You must be at least 13 years old to sign up!" });
    user.dob = birthDate;
    await user.save();
    res.status(200).json({ message: "DOB saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save DOB" });
  }
};

const completeRegister = async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "passwords do not match!" });
  }
  try {
    const preuser = await preUser.findOne({ email });
    if (!preuser || !preuser.isVerified || !preuser.dob) {
      return res
        .status(400)
        .json({ message: "user not completely registered" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ message: "User exists already, please log in" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: preuser.email,
      dob: preuser.dob,
      password: hashed,
    });
    await preUser.deleteOne({ _id: preUser._id });

    const msg = {
      to: email,
      from: {
        email: "no-reply@streamjump.info",
        name: "Jump",
      },
      subject: "Thanks for Registering!",
      html: `<div style="background: #fefefe; padding: 20px; font-family: 'Segoe UI', sans-serif; color: #333;">
  <div style="max-width: 600px; margin: auto; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(to right, #ff6a00, #ee0979); color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px;">Welcome to Jump 🚀</h1>
      <p style="margin: 10px 0 0;">Your account has been successfully created!</p>
    </div>
    
    <!-- Body -->
    <div style="padding: 30px; background: white;">
      <p>Hi!,</p>
      <p>We’re thrilled to welcome you to the Jump community. Your registration is now complete, and your journey with us officially begins.</p>
      <p>Here’s what you can look forward to:</p>
      <ul style="padding-left: 20px; line-height: 1.6;">
        <li>✅ A personalized dashboard to manage your experience</li>
        <li>📬 Timely updates and feature releases</li>
        <li>🎉 Access to exclusive community events and early betas</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://streamjump.info/" style="background: #ee0979; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
      </div>

      <p>If you have any questions or feedback, feel free to reach out anytime—we’d love to hear from you.</p>
      <p>Cheers,</p>
      <p><strong>The Jump Team</strong></p>
    </div>

    <!-- Footer -->
    <div style="background: #f7f7f7; padding: 15px; text-align: center; font-size: 12px; color: #999;">
      © 2025 Jump, All rights reserved.<br>
      <a href="https://streamjump.info/unsubscribe" style="color: #999;">Unsubscribe</a>
    </div>
    
  </div>
</div>
`,
    };
    try {
      await sgMail.send(msg);
      console.log("reg mail sent");
    } catch (error) {
      console.error("unable to send mail");
      error.response?.body || error.message;
    }

    return res.status(200).json({ message: "User sucessfully created", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(500)
        .json({ message: "user not found/invalid credentials" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(500).json({ message: "Password incorrect" });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    return res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.log("unable to log in");
    return res.status(400).json({ message: error });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User does not exist" });
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHashed = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordToken = resetTokenHashed;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const msg = {
      to: email,
      from: { email: "no-reply@streamjump.info", name: "Jump" },
      subject: "Password Reset Request",
      html: `
        <p>You requested a password reset.</p>
        <p>Click this link to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
      `,
    };
    await sgMail.send(msg);
    res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "internal server error" });
  }
};
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: "cannot find user" });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    res.status(200).json({ message: "password sucessfully changed" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "internal server error" });
  }
};

module.exports = {
  verifyEmail,
  preRegister,
  saveDOB,
  completeRegister,
  login,
  forgotPassword,
  resetPassword,
};

/**
 * @swagger
 * /auth/pre-register:
 *   post:
 *     summary: Send OTP to email
 *     tags: [Auth]
 *     requestBody:
 *       description: Email to receive OTP
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Unable to send OTP
 */

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify user's email with OTP
 *     tags: [Auth]
 *     requestBody:
 *       description: Email and OTP for verification
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email successfully verified
 *       400:
 *         description: Invalid or expired OTP
 */

/**
 * @swagger
 * /auth/complete-register:
 *   post:
 *     summary: Complete registration by setting password
 *     tags: [Auth]
 *     requestBody:
 *       description: Email, password, and confirmPassword to finish signup
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - confirmPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: User successfully created
 *       400:
 *         description: Passwords do not match or incomplete registration
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 *  /auth/login:
 *   post:
 *     summary: User login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       description: User credentials
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful and JWT token returned
 *       400:
 *         description: Unable to log in
 *       500:
 *         description: User not found or invalid credentials
 */

/**
 * @swagger
 *  /auth/forgot-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [Auth]
 *     requestBody:
 *       description: Email to send password reset link
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User does not exist
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 *  /auth/reset-password:
 *   post:
 *     summary: Reset user password with token
 *     tags: [Auth]
 *     requestBody:
 *       description: Token from email and new password
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: abc123def456
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password successfully changed
 *       400:
 *         description: Invalid token or internal server error
 */

const User = require("../models/User");
const preUser = require("../models/preUser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");

const { v4: uuidv4 } = require("uuid");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const preRegister = async (req, res) => {
  const { email } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User exists already, kindly log in" });
    }
    let user = await preUser.findOne({ email });
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

    const referenceId = uuidv4();
    user.referenceId = referenceId;

    await user.save();
    res
      .status(200)
      .json({ message: "email successfully verified!", referenceId });
  } catch (error) {
    res.status(400).json({ message: "unable to verify email" });
  }
};

const completeRegister = async (req, res) => {
  const { email, password, birthday, referenceId } = req.body;

  try {
    const preuser = await preUser.findOne({ email });
    if (
      !preuser ||
      !preuser.isVerified ||
      !preuser.referenceId ||
      preuser.referenceId !== referenceId
    ) {
      return res
        .status(400)
        .json({ message: "Email is not verified", referenceId });
    }
    if (!birthday) {
      return res
        .status(400)
        .json({ message: "Birthday is required!", referenceId });
    }
    const birthDate = new Date(birthday);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    const actualAge =
      monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    if (actualAge < 13) {
      return res
        .status(400)
        .json({ message: "You're not old enough", referenceId });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists", referenceId });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: preuser.email,
      birthDate: preuser.dob,
      password: hashed,
    });
    await preUser.deleteOne({ _id: preuser._id });

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

    return res
      .status(200)
      .json({ message: "User sucessfully created", user, referenceId });
  } catch (error) {
    return res.status(500).json({ message: error, referenceId });
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
  completeRegister,
  login,
  forgotPassword,
  resetPassword,
};

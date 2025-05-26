const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const register = async (req, res) => {
  const { firstname, lastname, email, password } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists)
      return res
        .status(400)
        .json({ message: "User exists already, please log in" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstname,
      lastname,
      email,
      password: hashed,
    });

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
      <p>Hi ${firstname}!,</p>
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();
    console.log(otp);
    console.log(otpExpiry);

    const otpMsg = {
      to: email,
      from: { name: "jump", email: "no-reply@streamjump.info" },
      subject: "Your One-Time Password (OTP)",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome back!</h2>
          <p>Your one-time password is:</p>
          <h1 style="font-size: 32px;">${otp}</h1>
          <p>This OTP will expire in 10 minutes.</p>
        </div>
      `,
    };
    try {
      await sgMail.send(otpMsg);
      console.log("OTP sent");
    } catch (error) {
      console.log("otp not sent");
      return res.status(400).json({ message: "unable to send OTP", error });
    }
  } catch (error) {
    console.log("unable to log in");
    return res.status(400).json({ message: error });
  }
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Invalid user" });

    if (user.otp !== String(otp) || user.otpExpiry < Date.now())
      return res.status(400).json({ message: "Invalid or expired OTP" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    return res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = { register, login, verifyOtp };

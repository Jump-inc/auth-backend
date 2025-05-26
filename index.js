const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const {
  register,
  login,
  verifyOtp,
  forgotPassword,
  resetPassword,
} = require("./controllers/authController");
const { protect } = require("./middleware/authMiddleware");

const app = express();
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("connected to the DB");
    app.listen(process.env.PORT, () => {
      console.log(`server running on ${process.env.PORT}`);
    });
  })
  .catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("API IS RUNNING");
});

app.post("/api/register", register);
app.post("/api/login", login);
app.post("/api/otp", verifyOtp);
app.post("/api/forgot-password", forgotPassword);
app.post("/api/reset-password", resetPassword);

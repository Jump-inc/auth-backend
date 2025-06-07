const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const {
  login,
  forgotPassword,
  resetPassword,
  preRegister,
  verifyEmail,
  completeRegister,
  returnUserInfo,
} = require("./controllers/authController");
const { protect } = require("./middleware/authMiddleware");

const app = express();
app.use(express.json());
const { swaggerUi, specs } = require("./swagger");

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://streamjump.info",
      "https://auth.streamjump.info",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
app.post("/api/auth/pre-register", preRegister);
app.post("/api/auth/verify-email", verifyEmail);
app.post("/api/auth/complete-registration", completeRegister);
app.post("/api/auth/login", login);
app.post("/api/auth/forgot-password", forgotPassword);
app.post("/api/auth/reset-password", resetPassword);
app.post("/api/me", returnUserInfo);

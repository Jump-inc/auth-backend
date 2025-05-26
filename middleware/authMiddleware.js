const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check if Authorization header is present and valid
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // 2. Extract token
  const token = authHeader.split(" ")[1];

  try {
    // 3. Verify token and attach user data to request
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // now accessible in routes as req.user

    // 4. Proceed to the next middleware or route
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { protect };

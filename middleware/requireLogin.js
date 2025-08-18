const jwt = require("jsonwebtoken");

function requireLogin(req, res, next) {
  const token = req.cookies.token; // Get token from cookies

  if (!token) {
    console.log("No token found in cookies"); // Debugging log
    return res.status(401).json({ error: "Token required for access" });
  }

  console.log("Token found in cookies:", token); // Debugging log

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("JWT verification failed:", err); // Debugging log
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    console.log("Decoded token:", decoded); // Debugging log
    req.user = decoded; // Attach the decoded user data to the request object
    next(); // Proceed to the next route handler
  });
}

module.exports = requireLogin;

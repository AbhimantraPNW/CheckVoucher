const jwt = require("jsonwebtoken");

function requireLogin(req, res, next) {
  const token = req.cookies.token; // Assuming you're storing the token in a cookie

  if (!token) {
    return res.status(401).json({ error: "Token required for access" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = decoded; // Attach the decoded user data to the request object
    next(); // Proceed to the next route handler
  });
}

module.exports = requireLogin;

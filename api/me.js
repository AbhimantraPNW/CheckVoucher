const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();

app.use(cookieParser()); // Parse cookies

// Example of protected route
const requireLogin = require("./middleware/requireLogin"); // Your JWT verification middleware

app.get("/api/me", requireLogin, async (req, res) => {
  const { id } = req.user || {};

  if (!id) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const r = await db.execute({
      sql: "SELECT id, username, total_buy, created_at FROM users WHERE id = ?",
      args: [id],
    });

    if (!r.rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(r.rows[0]); // Return user data
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

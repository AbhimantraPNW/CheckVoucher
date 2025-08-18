const express = require("express");
const { db } = require("../db");
const requireLogin = require("../middleware/requireLogin");

const router = express.Router(); // Create an Express Router

// Apply the requireLogin middleware directly to the route
router.get("/me", requireLogin, async (req, res) => {
  const { id } = req.user || {}; // Access the session data (JWT decoded)

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

    res.json(r.rows[0]); // Send user data as JSON
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router; // Export the router

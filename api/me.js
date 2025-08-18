const { db } = require("../db"); // Import your database connection
module.exports = async (req, res) => {
  const { id } = req.session?.user || {}; // Access the session data

  if (!id) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Query database to fetch user data
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
};

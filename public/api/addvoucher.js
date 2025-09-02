const express = require("express");
const { db } = require("../../db");
const requireLogin = require("../middleware/requireLogin");
const router = express.Router();

router.post("/:id/increment", requireLogin, async (req, res) => {
  const { id } = req.params;
  await db.execute({
    sql: "UPDATE users SET total_buy = (COALESCE(total_buy,0)+1) % 10 WHERE id = ?",
    args: [id],
  });

  const r = await db.execute({
    sql: "SELECT id, username, total_buy, created_at FROM users WHERE id = ?",
    args: [id],
  });
  if (!r.rows[0]) return res.status(404).json({ error: "User not found" });
  res.json(r.rows[0]);
});

module.exports = router;

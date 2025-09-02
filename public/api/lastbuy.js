const express = require("express");
const { db } = require("../../db");
const requireLogin = require("../middleware/requireLogin");
const router = express.Router();

router.post("/:id/lastbuy", requireLogin, async (req, res) => {
  const { id } = req.params;
  const { last_buy } = req.body;
  await db.execute({
    sql: "UPDATE users SET last_buy = ? WHERE id = ?",
    args: [last_buy, id],
  });
  const r = await db.execute({
    sql: "SELECT id, username, total_buy, created_at, last_buy FROM users WHERE id = ?",
    args: [id],
  });
  if (!r.rows[0]) return res.status(404).json({ error: "User not found" });
  res.json(r.rows[0]);
});

module.exports = router;

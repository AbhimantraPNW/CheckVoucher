const express = require("express");
const { db } = require("../../db");
const requireLogin = require("../middleware/requireLogin");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.get("/", requireLogin, requireAdmin, async (req, res) => {
  const r = await db.execute(
    "SELECT id, username, total_buy, created_at, last_buy FROM users ORDER BY id ASC",
  );
  res.json(r.rows);
});

module.exports = router;

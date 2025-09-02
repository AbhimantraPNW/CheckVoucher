const express = require("express");
const { db } = require("../../db");
const authLimiter = require("../middleware/authLimiter");
const bcrypt = require("bcryptjs");
const router = express.Router();

router.post("/", authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).send("Username & password wajib");
  try {
    const hash = await bcrypt.hash(password, 12);
    await db.execute({
      sql: "INSERT INTO users (username, password, total_buy, created_at, last_buy) VALUES (?, ?, 0, datetime('now','localtime'), '')",
      args: [username, hash],
    });
    res.redirect("../login.html");
  } catch (e) {
    if (String(e.message).includes("UNIQUE"))
      return res.status(409).send("Username sudah dipakai");
    res.status(500).send("Gagal daftar");
  }
});

module.exports = router;

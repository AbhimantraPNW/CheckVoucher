const express = require("express");
const { db } = require("../../db");
const authLimiter = require("../middleware/authLimiter");
const bcrypt = require("bcryptjs");
const router = express.Router();
const jwt = require("jsonwebtoken");

router.post("/", authLimiter, async (req, res) => {
  const { username, password } = req.body;

  const r = await db.execute({
    sql: "SELECT id, username, password FROM users WHERE username = ?",
    args: [username],
  });
  const row = r.rows[0];
  if (!row) return res.status(401).send("Login gagal");

  const ok = await bcrypt.compare(password, row.password);
  if (!ok) return res.status(401).send("Login gagal");

  const role = row.username === "adminbos" ? "admin" : "user";
  const token = jwt.sign(
    {
      username: row.username,
      id: row.id,
      role: row.username === "adminbos" ? "admin" : "user",
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }, // Set expiration for the JWT
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "None",
  });

  res.redirect(role === "admin" ? "/admin.html" : "/user.html");
});

module.exports = router;

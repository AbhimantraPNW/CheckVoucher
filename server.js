const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieSession = require("cookie-session");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { db, init } = require("./db");
const app = express();
const cookieParser = require("cookie-parser");
app.use(cookieParser());
app.set("trust proxy", 1); // Trust first proxy

let readyPromise = null;
async function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await init();
      const ADMIN_USER = process.env.ADMIN_USER || "adminbos";
      const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";
      const r = await db.execute({
        sql: "SELECT 1 FROM users WHERE username = ?",
        args: [ADMIN_USER],
      });
      if (!r.rows[0]) {
        const hash = await require("bcryptjs").hash(ADMIN_PASS, 12);
        await db.execute({
          sql: "INSERT INTO users (username, password, total_buy, created_at) VALUES (?, ?, 0, datetime('now','localtime'))",
          args: [ADMIN_USER, hash],
        });
        console.log("Seed admin created:", ADMIN_USER);
      }
    })().catch((e) => {
      readyPromise = null;
      throw e;
    });
  }
  return readyPromise;
}

// pastikan DB siap sebelum route lain
app.use(async (req, res, next) => {
  try {
    await ensureReady();
    next();
  } catch (e) {
    console.error("INIT FAIL:", e);
    res.status(500).json({ error: "DB init failed" });
  }
});

if (process.env.VERCEL && !process.env.SESSION_SECRET) {
  throw new Error("Missing env SESSION_SECRET");
}

app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// app.use(
//   cookieSession({
//     name: "sid",
//     keys: [process.env.SESSION_SECRET || ""],
//     maxAge: 1000 * 60 * 60 * 8, // 8 jam
//     sameSite: "lax",
//     secure: process.env.NODE_ENV === "production",
//   }),
// );
//

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Only enable secure cookies in production
    cookie: {
      secure: process.env.NODE_ENV === "production", // Same for cookies
      httpOnly: true, // Cookie can't be accessed via JavaScript
      sameSite: "None", // Allow cookies to be sent with cross-origin requests
    },
    maxAge: 1000 * 60 * 60 * 8, // Optional: Set a custom max age for the session cookie
  }),
);

// limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/login", authLimiter);
app.use("/register", authLimiter);

// helper auth
function requireLogin(req, res, next) {
  const token = req.cookies.token;

  if (!token) return res.status(401).send("Harus login");

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send("Invalid or expired token");
    }

    req.user = decoded;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.session?.user?.role !== "admin")
    return res.status(403).send("Forbidden");
  next();
}

// pages
app.get("/", (req, res) => res.send("Halo Lur")); // optional
app.get("/register", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "register.html")),
);
app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "login.html")),
);

// REGISTER
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).send("Username & password wajib");
  try {
    const hash = await bcrypt.hash(password, 12);
    await db.execute({
      sql: "INSERT INTO users (username, password, total_buy, created_at) VALUES (?, ?, 0, datetime('now','localtime'))",
      args: [username, hash],
    });
    res.redirect("/login.html");
  } catch (e) {
    if (String(e.message).includes("UNIQUE"))
      return res.status(409).send("Username sudah dipakai");
    res.status(500).send("Gagal daftar");
  }
});

// LOGIN
app.post("/login", async (req, res) => {
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
  console.log("Session after login:", token);

  res.redirect(role === "admin" ? "/admin.html" : "/user.html");
});

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed Log Out");
    }
    res.clearCookie("token");
    res.redirect("/login.html");
  });
});

// ME
app.get("/api/me", requireLogin, async (req, res) => {
  console.log("ini loh", req);
  const { id } = req.user;
  const r = await db.execute({
    sql: "SELECT id, username, total_buy, created_at FROM users WHERE id = ?",
    args: [id],
  });
  if (!r.rows[0]) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(r.rows[0]); // Return JSON data
});

// USERS (admin)
app.get("/api/users", requireLogin, requireAdmin, async (req, res) => {
  const r = await db.execute(
    "SELECT id, username, total_buy, created_at FROM users ORDER BY id ASC",
  );
  res.json(r.rows);
});

// INCREMENT
app.post("/api/users/:id/increment", requireLogin, async (req, res) => {
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

// // init + seed admin
(async () => {
  await init();
  const ADMIN_USER = process.env.ADMIN_USER || "adminbos";
  const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";
  const exist = await db.execute({
    sql: "SELECT 1 FROM users WHERE username = ?",
    args: [ADMIN_USER],
  });
  if (!exist.rows[0]) {
    const hash = await bcrypt.hash(ADMIN_PASS, 12);
    await db.execute({
      sql: "INSERT INTO users (username, password, total_buy, created_at) VALUES (?, ?, 0, datetime('now','localtime'))",
      args: [ADMIN_USER, hash],
    });
    console.log("Seed admin created:", ADMIN_USER);
  }
})();

// local dev only
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Local: http://localhost:${port}`));
}
module.exports = app; // buat Vercel

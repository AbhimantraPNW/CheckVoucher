const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// --- path DB & session store: /tmp saat Vercel (ephemeral)
const isVercel = !!process.env.VERCEL;
const DATA_DIR = isVercel ? "/tmp" : __dirname;
const DB_PATH = path.join(DATA_DIR, "database.db");
const SESSIONS_DIR = DATA_DIR; // connect-sqlite3 butuh folder yang writeable

// init sqlite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error("SQLite open error:", err);
});

app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    store: new SQLiteStore({ db: "sessions.db", dir: SESSIONS_DIR }), // <- penting
    secret: process.env.SESSION_SECRET || "ganti-ini-ya",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

// rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
});
app.use("/login", authLimiter);
app.use("/register", authLimiter);

// schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      total_buy INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// helpers
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).send("Harus login");
  next();
}
function requireAdmin(req, res, next) {
  if (req.session?.user?.role !== "admin")
    return res.status(403).send("Forbidden");
  next();
}

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).send("Username & password wajib");
  try {
    const hash = await bcrypt.hash(password, 12);
    db.run(
      "INSERT INTO users (username, password, total_buy, created_at) VALUES (?, ?, 0, datetime('now', 'localtime'))",
      [username, hash],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE"))
            return res.status(409).send("Username sudah dipakai");
          return res.status(500).send("Gagal daftar");
        }
        res.redirect("/login.html");
      },
    );
  } catch {
    res.status(500).send("Gagal hash password");
  }
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get(
    "SELECT id, username, password FROM users WHERE username = ?",
    [username],
    async (err, row) => {
      if (err) return res.status(500).send("Error DB");
      if (!row) return res.status(401).send("Login gagal");

      const ok = await bcrypt.compare(password, row.password);
      if (!ok) return res.status(401).send("Login gagal");

      const role = row.username === "adminbos" ? "admin" : "user";
      req.session.user = { id: row.id, username: row.username, role };

      return res.redirect(role === "admin" ? "/admin.html" : "/user.html");
    },
  );
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});

app.get("/api/me", requireLogin, (req, res) => {
  const { id } = req.session.user;
  db.get(
    "SELECT id, username, total_buy, created_at FROM users WHERE id = ?",
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    },
  );
});

app.get("/api/users", requireLogin, requireAdmin, (req, res) => {
  db.all(
    "SELECT id, username, total_buy, created_at FROM users ORDER BY id ASC",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

app.post("/api/users/:id/increment", (req, res) => {
  const { id } = req.params;
  db.run(
    "UPDATE users SET total_buy = (COALESCE(total_buy, 0) + 1) % 10 WHERE id = ?",
    [id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "User not found" });

      db.get(
        "SELECT id, username, total_buy, created_at FROM users WHERE id = ?",
        [id],
        (e, row) => {
          if (e) return res.status(500).json({ error: e.message });
          res.json(row);
        },
      );
    },
  );
});

// --- HANYA LISTEN SAAT LOKAL
if (!isVercel) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Local dev: http://localhost:${port}`));
}

// --- untuk Vercel: export handler
module.exports = app;

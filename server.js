// NOTE: hapus yg tidak terpakai
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
const favicon = require("serve-favicon");
const cookieParser = require("cookie-parser");
app.use(cookieParser());
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "None",
    },
    maxAge: 1000 * 60 * 60 * 8,
  }),
);

// -- API --
const getRoutes = require("./public/api/getRoutes");
const usersRoutes = require("./public/api/users");
const userRoutes = require("./public/api/user");
const loginRoutes = require("./public/api/login");
const registerRoutes = require("./public/api/register");
const logoutRoutes = require("./public/api/logout");
const addVoucherRoutes = require("./public/api/addvoucher");
const lastBuyRoutes = require("./public/api/lastbuy");
app.use("/", getRoutes);
app.use("/users", usersRoutes);
app.use("/users", addVoucherRoutes);
app.use("/users", lastBuyRoutes);
app.use("/user", userRoutes);
app.use("/login", loginRoutes);
app.use("/register", registerRoutes);
app.use("/logout", logoutRoutes);

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Local: http://localhost:${port}`));
}
module.exports = app; // buat Vercel

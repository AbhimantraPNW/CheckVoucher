const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed Log Out");
    }
    res.clearCookie("token");
    res.redirect("../login.html");
  });
});

module.exports = router;

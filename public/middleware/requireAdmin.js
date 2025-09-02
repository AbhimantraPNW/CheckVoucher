function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).send("Forbidden");
  next();
}

module.exports = requireAdmin;

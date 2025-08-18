// api/ping.js
module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    node: process.version,
    vercel: !!process.env.VERCEL,
    hasDbUrl: !!process.env.DATABASE_URL,
    hasDbToken: !!process.env.DATABASE_AUTH_TOKEN,
    hasSessionSecret: !!process.env.SESSION_SECRET,
  });
};

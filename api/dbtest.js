// api/dbtest.js
const { createClient } = require("@libsql/client");

let client;
function getDb() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error("Missing env DATABASE_URL");
    if (!process.env.DATABASE_AUTH_TOKEN)
      throw new Error("Missing env DATABASE_AUTH_TOKEN");
    client = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  }
  return client;
}

module.exports = async (req, res) => {
  try {
    const db = getDb();
    const r = await db.execute("SELECT 1 AS ok");
    res.status(200).json({ ok: true, result: r.rows });
  } catch (e) {
    console.error("DBTEST ERR:", e);
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
};

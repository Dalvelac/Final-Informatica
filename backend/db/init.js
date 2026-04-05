const fs = require("fs");
const path = require("path");
const db = require("./database");
const { ensureFleetData } = require("./fleet-seed");

async function initDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const seed = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");

  await db.exec(schema);

  const users = await db.get("SELECT COUNT(*) as total FROM usuarios");
  if (!users || users.total === 0) {
    await db.exec(seed);
  }

  await ensureFleetData();
}

module.exports = { initDatabase };


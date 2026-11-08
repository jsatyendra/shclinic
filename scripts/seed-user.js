const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const crypto = require("crypto");

const [firstName, lastName, gender, loginId, password] = process.argv.slice(2);

if (!firstName || !lastName || !gender || !loginId || !password) {
    console.error(
        "Usage: npm run seed:user -- <firstName> <lastName> <Male|Female> <loginId> <password>",
    );
    process.exit(1);
}

if (!['Male', 'Female'].includes(gender)) {
    console.error("Gender must be Male or Female.");
    process.exit(1);
}

if (password.length < 8 || password.length > 14) {
    console.error("Password must be between 8 and 14 characters.");
    process.exit(1);
}

const dbDirectory = path.join(process.cwd(), "src", "db");
fs.mkdirSync(dbDirectory, { recursive: true });
const db = new Database(path.join(dbDirectory, "clinic.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female')),
    login_id TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    password_changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const existingUser = db
    .prepare("SELECT 1 FROM users WHERE login_id = ? COLLATE NOCASE LIMIT 1")
    .get(loginId.trim());

if (existingUser) {
    console.error("A user with this login ID already exists. No changes were made.");
    db.close();
    process.exit(1);
}

const now = new Date().toISOString();
db.prepare(
    `INSERT INTO users
    (id, first_name, last_name, gender, login_id, password_hash,
     is_active, created_at, updated_at, password_changed_at)
   VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
).run(
    crypto.randomUUID(),
    firstName.trim(),
    lastName.trim(),
    gender,
    loginId.trim(),
    bcrypt.hashSync(password, 12),
    now,
    now,
    now,
);

db.close();
console.log(`User ${loginId.trim()} created successfully.`);
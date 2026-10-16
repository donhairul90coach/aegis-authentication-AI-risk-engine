import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Menetapkan __dirname secara manual untuk ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cipta atau buka fail pangkalan data SQLite tempatan
const dbPath = path.resolve(__dirname, 'aegis_auth.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Gagal menyambung ke pangkalan data SQLite:', err.message);
    } else {
        console.log('✅ Berjaya menyambung ke pangkalan data SQLite (aegis_auth.db)');
    }
});

db.serialize(() => {
  // 1. Jadual Pengguna
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Jadual Log Audit Keselamatan AI
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      event_type TEXT NOT NULL,
      risk_score INTEGER,
      risk_reason TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Jadual Baharu: Tokens Reset Kata Laluan (OTP)
  db.run(`
    CREATE TABLE IF NOT EXISTS reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0
    )
  `);
});

export default db;
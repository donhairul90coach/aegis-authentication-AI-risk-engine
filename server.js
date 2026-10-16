import 'dotenv/config';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import Groq from 'groq-sdk';
import db from './database.js';

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_sementara';

// Sila pastikan GROQ_API_KEY anda diletakkan di sini atau dalam fail .env
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 🤖 Helper Function: Enjin Analisis Risiko Groq AI
async function analyzeRiskWithGroq(email, ip, userAgent, actionType = 'LOGIN') {
  try {
    const prompt = `Anda adalah enjin keselamatan AI AegisAuth. Nilaikan risiko tindakan '${actionType}' berikut:
- Email: ${email}
- IP Address: ${ip}
- User Agent / Device: ${userAgent}

Kembalikan respon JSON dalam format ini SAHAJA tanpa sebarang teks tambahan:
{
  "score": <nombor 0 hingga 100>,
  "reason": "<sebab ringkas dalam Bahasa Melayu>"
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b',
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Ralat Groq AI:', error.message);
    return { score: 10, reason: 'Pengesahan laluan standard (Fallback Mode).' };
  }
}


// 1. API REGISTER (Pendaftaran Akaun Baharu)
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Sila lengkapkan semua ruangan.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
      [username, email, hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'E-mel atau nama pengguna telah wujud.' });
          }
          return res.status(500).json({ error: 'Ralat pangkalan data.' });
        }
        res.json({ message: 'Pendaftaran berjaya!', userId: this.lastID });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Ralat pelayan.' });
  }
});


// 2. API LOGIN (Log Masuk + AI Risk Assessment)

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'AegisMobileApp';

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mel dan kata laluan diperlukan.' });
  }

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'E-mel atau kata laluan tidak sah.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'E-mel atau kata laluan tidak sah.' });
    }

    const risk = await analyzeRiskWithGroq(email, ip, userAgent, 'LOGIN');

    // had sekatan login AI
    if (risk.score >70) {
      return res.status(403).json({
        error: `Log masuk disekat oleh AI AegisAuth (Skor Risiko: ${risk.score}/100). Sebab: ${risk.reason}`
      });
    }

    // Simpan Rekod Audit Log
    db.run(
      `INSERT INTO audit_logs (user_id, event_type, risk_score, risk_reason, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, 'LOGIN_ATTEMPT', risk.score, risk.reason, ip, userAgent]
    );


    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: 'Log masuk berjaya!',
      token,
      user: { id: user.id, username: user.username, email: user.email },
      riskAnalysis: risk
    });
  });
});


// 3. API FORGOT PASSWORD (Minta OTP + Groq AI Risk Check)

app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;
  const ip = req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'AegisMobileApp';

  if (!email) return res.status(400).json({ error: 'Sila masukkan e-mel anda.' });

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'E-mel tidak ditemui dalam sistem.' });
    }

    // AI Risk Check khas untuk tindakan Reset Password
    const risk = await analyzeRiskWithGroq(email, ip, userAgent, 'PASSWORD_RESET_REQUEST');

    // Jika AI kesan risiko sangat tinggi (contoh > 85), sekat permintaan ini
    if (risk.score > 85) {
      return res.status(403).json({
        error: `Permintaan ditolak oleh AI AegisAuth (Skor Risiko: ${risk.score}/100). Sebab: ${risk.reason}`
      });
    }

    // generate OTP 6-angka & Tetapkan Luput dalam 10 minit
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.run(
      `INSERT INTO reset_tokens (email, otp, expires_at) VALUES (?, ?, ?)`,
      [email, otp, expiresAt],
      (err) => {
        if (err) return res.status(500).json({ error: 'Gagal menjana OTP.' });

        console.log(`\n🔑 [AEGIS OTP SYSTEM] OTP untuk ${email} ialah: ${otp} (Skor AI Risk: ${risk.score})\n`);

        res.json({
          message: 'OTP telah dijana!',
          otpDemo: otp, // Pulangkan OTP ke client khas untuk senang demo 
          riskScore: risk.score,
          riskReason: risk.reason
        });
      }
    );
  });
});


// 4. API RESET PASSWORD (Verifikasi OTP + Hash Password Baharu)

app.post('/api/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Sila lengkapkan semua maklumat OTP dan kata laluan baharu.' });
  }

  const now = new Date().toISOString();

  // Semak OTP yang sah, sepadan dengan e-mel, belum diguna, dan belum luput
  db.get(
    `SELECT * FROM reset_tokens WHERE email = ? AND otp = ? AND used = 0 AND expires_at > ? ORDER BY id DESC LIMIT 1`,
    [email, otp, now],
    async (err, record) => {
      if (err || !record) {
        return res.status(400).json({ error: 'Kod OTP tidak sah atau telah luput.' });
      }

      // Encrypt password baharu guna bcrypt
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Kemaskini rekod dalam pangkalan data
      db.run(`UPDATE users SET password_hash = ? WHERE email = ?`, [hashedPassword, email], (err) => {
        if (err) return res.status(500).json({ error: 'Gagal mengemaskini kata laluan.' });

        // Tandakan OTP ini telah digunakan (used = 1)
        db.run(`UPDATE reset_tokens SET used = 1 WHERE id = ?`, [record.id]);

        res.json({ message: 'Kata laluan berjaya dikemaskini! Sila log masuk semula.' });
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`🚀 Pelayan AegisAuth berjalan di http://localhost:${PORT}`);
});
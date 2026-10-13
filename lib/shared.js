const { createClient } = require('@libsql/client');
const crypto = require('crypto');

const isProd = !!process.env.VERCEL;

// Defaults exist for local development only; on Vercel they must come from env vars.
const ADMIN_USER = process.env.ADMIN_USER || (isProd ? null : 'Sofre');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (isProd ? null : '23052001&Duki');
const SECRET = process.env.AUTH_SECRET || crypto.createHash('sha256').update('dev|' + ADMIN_PASSWORD).digest('hex');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:leaderboard.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let ready;
const init = () => (ready ||= db.execute(`CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  firstName TEXT NOT NULL DEFAULT '',
  surname TEXT NOT NULL DEFAULT '',
  nickname TEXT NOT NULL,
  score REAL NOT NULL
)`).catch((e) => { ready = null; throw e; }));

const hash = (v) => crypto.createHash('sha256').update(String(v)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(hash(a), hash(b));
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

function checkLogin(username, password) {
  if (!ADMIN_USER || !ADMIN_PASSWORD) return false;
  const userOk = safeEqual(username, ADMIN_USER);
  const passOk = safeEqual(password, ADMIN_PASSWORD);
  return userOk && passOk;
}

// Stateless signed token (12h) so it works across serverless instances
function createToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 12 * 3600 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function isAdmin(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}

function clean(b = {}) {
  const str = (v) => String(v ?? '').trim().slice(0, 50);
  const score = Number(b.score);
  if (!str(b.nickname) || b.score === '' || b.score === null || !Number.isFinite(score)) return null;
  return { firstName: str(b.firstName), surname: str(b.surname), nickname: str(b.nickname), score };
}

module.exports = { db, init, checkLogin, createToken, isAdmin, clean };

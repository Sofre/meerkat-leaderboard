const { checkLogin, createToken } = require('../lib/shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body || {};
  if (checkLogin(b.username, b.password)) return res.status(200).json({ token: createToken() });
  res.status(401).json({ error: 'Invalid credentials' });
};

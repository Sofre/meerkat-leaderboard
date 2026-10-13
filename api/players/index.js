const crypto = require('crypto');
const { db, init, isAdmin, clean } = require('../../lib/shared');

module.exports = async (req, res) => {
  try {
    await init();
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      const r = await db.execute('SELECT * FROM players ORDER BY score DESC');
      return res.status(200).json(r.rows.map((x) => ({ ...x })));
    }
    if (req.method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const d = clean(req.body);
      if (!d) return res.status(400).json({ error: 'Nickname and numeric score required' });
      const player = { id: crypto.randomUUID(), ...d };
      await db.execute({
        sql: 'INSERT INTO players (id, firstName, surname, nickname, score) VALUES (?, ?, ?, ?, ?)',
        args: [player.id, d.firstName, d.surname, d.nickname, d.score],
      });
      return res.status(201).json(player);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
};

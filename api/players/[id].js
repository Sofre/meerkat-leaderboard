const { db, init, isAdmin, clean } = require('../../lib/shared');

module.exports = async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    await init();
    const id = String(req.query.id);
    const found = await db.execute({ sql: 'SELECT * FROM players WHERE id = ?', args: [id] });
    if (!found.rows.length) return res.status(404).json({ error: 'Not found' });

    if (req.method === 'PUT') {
      const d = clean(req.body);
      if (!d) return res.status(400).json({ error: 'Nickname and numeric score required' });
      await db.execute({
        sql: 'UPDATE players SET firstName = ?, surname = ?, nickname = ?, score = ? WHERE id = ?',
        args: [d.firstName, d.surname, d.nickname, d.score, id],
      });
      return res.status(200).json({ id, ...d });
    }
    if (req.method === 'DELETE') {
      await db.execute({ sql: 'DELETE FROM players WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
};

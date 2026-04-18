const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/leaderboard', async (req, res) => {
    try {
        const r = await pool.query('SELECT phone, name, points FROM users ORDER BY points DESC LIMIT 100');
        res.json(r.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/leaderboard', async (req, res) => {
    const { phone, name, points } = req.body;
    try {
        await pool.query('INSERT INTO users (phone, name, points) VALUES ($1, $2, $3)', [phone, name, points]);
        res.json({ message: "Đã thêm thành công!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/leaderboard/:phone', async (req, res) => {
    const { name, points } = req.body;
    try {
        await pool.query('UPDATE users SET name = $1, points = $2 WHERE phone = $3', [name, points, req.params.phone]);
        res.json({ message: "Đã cập nhật!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/leaderboard/:phone', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE phone = $1', [req.params.phone]);
        res.json({ message: "Đã xóa!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
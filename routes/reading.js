const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reading ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    const { name, image, link } = req.body;
    try {
        await pool.query('INSERT INTO reading (name, image, link) VALUES ($1, $2, $3)', [name, image, link]);
        res.json({ message: "Thêm thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reading WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xóa" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
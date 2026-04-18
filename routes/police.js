const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Lấy danh sách liên kết Công an
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM police ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Thêm mới liên kết Công an
router.post('/', async (req, res) => {
    const { name, image, link } = req.body;
    try {
        await pool.query(
            'INSERT INTO police (name, image, link) VALUES ($1, $2, $3)',
            [name, image, link]
        );
        res.json({ message: "Đã thêm thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Xóa liên kết
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM police WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xóa" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
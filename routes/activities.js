const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Lấy danh sách hoạt động
router.get('/', async (req, res) => {
    const r = await pool.query('SELECT * FROM activities ORDER BY id DESC');
    res.json(r.rows);
});

// Thêm hoạt động mới
router.post('/', async (req, res) => {
    const { title, content, image, points_reward } = req.body;
    await pool.query('INSERT INTO activities (title, content, image, points_reward) VALUES ($1, $2, $3, $4)', [title, content, image, points_reward]);
    res.json({ message: "OK" });
});

// Xóa hoạt động (Lưu ý: đường dẫn cũ là /api/activities/:id, giờ chỉ còn /:id)
router.delete('/:id', async (req, res) => {
    await pool.query('DELETE FROM activities WHERE id = $1', [req.params.id]);
    res.json({ message: "OK" });
});

module.exports = router;
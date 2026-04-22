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

// THÊM MỚI: Cập nhật hoạt động
router.put('/:id', async (req, res) => {
    const { title, content, image, points_reward } = req.body;
    await pool.query(
        'UPDATE activities SET title = $1, content = $2, image = $3, points_reward = $4 WHERE id = $5',
        [title, content, image, points_reward, req.params.id]
    );
    res.json({ message: "Updated" });
});

// Xóa hoạt động
router.delete('/:id', async (req, res) => {
    await pool.query('DELETE FROM activities WHERE id = $1', [req.params.id]);
    res.json({ message: "OK" });
});

module.exports = router;
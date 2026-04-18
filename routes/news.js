const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Gọi database vào đây

// 1. Lấy danh sách tin tức
router.get('/', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM news ORDER BY id DESC');
        res.json(r.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Thêm tin tức mới
router.post('/', async (req, res) => {
    const { title, content, image } = req.body;
    try {
        await pool.query(
            'INSERT INTO news (title, content, image) VALUES ($1, $2, $3)',
            [title, content, image || ""]
        );
        res.json({ message: "Đã thêm tin tức thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Cập nhật (Sửa) tin tức - MỚI THÊM
router.put('/:id', async (req, res) => {
    const { title, content, image } = req.body;
    try {
        await pool.query(
            'UPDATE news SET title = $1, content = $2, image = $3 WHERE id = $4',
            [title, content, image || "", req.params.id]
        );
        res.json({ message: "Đã cập nhật thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Xóa tin tức
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM news WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xóa tin tức" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
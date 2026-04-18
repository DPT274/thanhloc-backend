const express = require('express');
const router = express.Router();

// Đã chèn đúng đường dẫn file DB của bạn
const pool = require('../config/db');

// ==========================================
// 1. API LẤY DANH SÁCH (GET)
// ==========================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM connections ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 2. API THÊM MỤC MỚI (POST)
// ==========================================
router.post('/', async (req, res) => {
    const { title, image, link } = req.body;
    try {
        await pool.query(
            'INSERT INTO connections (title, image, link) VALUES ($1, $2, $3)',
            [title, image, link || ""]
        );
        res.json({ message: "Đã thêm thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 3. API SỬA/CẬP NHẬT MỤC (PUT) - MỚI THÊM
// ==========================================
router.put('/:id', async (req, res) => {
    const { title, image, link } = req.body;
    try {
        await pool.query(
            'UPDATE connections SET title = $1, image = $2, link = $3 WHERE id = $4',
            [title, image, link || "", req.params.id]
        );
        res.json({ message: "Đã cập nhật thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 4. API XOÁ MỤC (DELETE)
// ==========================================
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM connections WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xoá" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
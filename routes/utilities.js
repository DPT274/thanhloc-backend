// routes/utilities.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// 1. Lấy danh sách tiện ích (Dành cho Zalo Mini App và Admin)
router.get('/', async (req, res) => {
    try {
        // Sắp xếp theo order_index để Admin có thể tùy chỉnh thứ tự
        const result = await pool.query('SELECT * FROM utilities ORDER BY order_index ASC, id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

// 2. Thêm tiện ích mới (Dành cho Admin)
router.post('/', async (req, res) => {
    const { name, image, action_path, order_index } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO utilities (name, image, action_path, order_index) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, image, action_path, order_index || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi thêm tiện ích' });
    }
});

// 3. Cập nhật tiện ích (Dành cho Admin)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, image, action_path, order_index } = req.body;
    try {
        const result = await pool.query(
            'UPDATE utilities SET name = $1, image = $2, action_path = $3, order_index = $4 WHERE id = $5 RETURNING *',
            [name, image, action_path, order_index, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi cập nhật tiện ích' });
    }
});

// 4. Xóa tiện ích (Dành cho Admin)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM utilities WHERE id = $1', [id]);
        res.json({ message: 'Đã xóa thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi xóa tiện ích' });
    }
});

module.exports = router;
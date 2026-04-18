const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// ==========================================
// PHẦN 1: QUẢN LÝ KHO QUÀ
// ==========================================

// Lấy danh sách quà
router.get('/', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM gifts ORDER BY id DESC');
        res.json(r.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Thêm quà mới
router.post('/', async (req, res) => {
    const { name, image, points_required } = req.body;
    try {
        await pool.query(
            'INSERT INTO gifts (name, image, points_required) VALUES ($1, $2, $3)',
            [name, image, points_required]
        );
        res.json({ message: "Đã thêm quà thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cập nhật quà (Sửa)
router.put('/:id', async (req, res) => {
    const { name, image, points_required } = req.body;
    try {
        await pool.query(
            'UPDATE gifts SET name = $1, image = $2, points_required = $3 WHERE id = $4',
            [name, image, points_required, req.params.id]
        );
        res.json({ message: "Đã cập nhật quà thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Xóa quà
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM gifts WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xóa quà" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==========================================
// PHẦN 2: QUẢN LÝ LỊCH SỬ ĐỔI QUÀ
// ==========================================

// Lấy danh sách lịch sử đổi quà
router.get('/history/all', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM gift_redemptions ORDER BY redeemed_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ THÊM MỚI: API Cán bộ xác nhận ĐÃ TRAO QUÀ TẬN TAY
router.put('/history/:id/status', async (req, res) => {
    try {
        await pool.query("UPDATE gift_redemptions SET status = 'Đã nhận quà' WHERE id = $1", [req.params.id]);
        res.json({ message: "Đã xác nhận trao quà thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Xóa 1 dòng lịch sử đổi quà
router.delete('/history/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM gift_redemptions WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xóa lịch sử" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==========================================
// API: Lấy lịch sử đổi quà CỦA 1 NGƯỜI DÂN CỤ THỂ
// ==========================================
router.get('/history/user/:phone', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM gift_redemptions WHERE user_phone = $1 ORDER BY redeemed_at DESC',
            [req.params.phone]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
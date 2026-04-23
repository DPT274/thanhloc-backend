const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const { uploadImageToSupabase } = require('../services/storageService'); // Import service upload

// Dùng memoryStorage để xử lý file trên RAM
const upload = multer({ storage: multer.memoryStorage() });

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

// Thêm quà mới (CÓ UPLOAD SUPABASE)
router.post('/', upload.single('image'), async (req, res) => {
    const { name, points_required } = req.body;
    try {
        let imageUrl = '';

        // Nếu có file upload, đưa vào thư mục 'gift_images'
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'gift_images'
            );
        } else {
            return res.status(400).json({ error: "Vui lòng chọn hình ảnh món quà!" });
        }

        await pool.query(
            'INSERT INTO gifts (name, image, points_required) VALUES ($1, $2, $3)',
            [name, imageUrl, points_required]
        );
        res.json({ message: "Đã thêm quà thành công" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Cập nhật quà (CÓ UPLOAD SUPABASE)
router.put('/:id', upload.single('image'), async (req, res) => {
    const { name, points_required } = req.body;
    try {
        // Lấy link ảnh cũ từ database
        const oldData = await pool.query('SELECT image FROM gifts WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0].image;

        // Nếu có ảnh mới -> upload và lấy link mới
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'gift_images'
            );
        }

        await pool.query(
            'UPDATE gifts SET name = $1, image = $2, points_required = $3 WHERE id = $4',
            [name, imageUrl, points_required, req.params.id]
        );
        res.json({ message: "Đã cập nhật quà thành công" });
    } catch (error) {
        console.error(error);
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
// PHẦN 2: QUẢN LÝ LỊCH SỬ ĐỔI QUÀ (Giữ nguyên)
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

// Cán bộ xác nhận ĐÃ TRAO QUÀ TẬN TAY
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

// Lấy lịch sử đổi quà CỦA 1 NGƯỜI DÂN CỤ THỂ
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
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const { uploadImageToSupabase } = require('../services/storageService'); // Import service upload

// Dùng memoryStorage để xử lý file trên RAM
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (req, res) => {
    try {
        const banners = await pool.query('SELECT image_url FROM banners WHERE is_active = true ORDER BY created_at DESC');
        const duration = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'banner_duration'");
        res.json({
            images: banners.rows.map(b => b.image_url),
            duration: duration.rows[0] ? parseInt(duration.rows[0].setting_value) : 2500
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/admin', async (req, res) => {
    try {
        const banners = await pool.query('SELECT * FROM banners ORDER BY created_at DESC');
        const duration = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'banner_duration'");
        res.json({
            banners: banners.rows,
            duration: duration.rows[0] ? parseInt(duration.rows[0].setting_value) : 2500
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// THÊM BANNER MỚI (CÓ UPLOAD SUPABASE)
// ==========================================
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Vui lòng đính kèm file ảnh!" });
        }

        // Đẩy ảnh lên thư mục 'banners' trên Supabase Storage
        const imageUrl = await uploadImageToSupabase(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'banners'
        );

        // Lưu Public URL vào Database
        await pool.query('INSERT INTO banners (image_url, is_active) VALUES ($1, true)', [imageUrl]);
        res.json({ message: "Thêm banner thành công" });
    } catch (err) {
        console.error("Lỗi upload Banner:", err);
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { is_active } = req.body;
        await pool.query('UPDATE banners SET is_active = $1 WHERE id = $2', [is_active, req.params.id]);
        res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM banners WHERE id = $1', [req.params.id]);
        res.json({ message: "Xóa banner thành công" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/duration', async (req, res) => {
    try {
        const { duration } = req.body;
        const check = await pool.query("SELECT * FROM settings WHERE setting_key = 'banner_duration'");
        if (check.rows.length === 0) {
            await pool.query("INSERT INTO settings (setting_key, setting_value) VALUES ('banner_duration', $1)", [duration.toString()]);
        } else {
            await pool.query("UPDATE settings SET setting_value = $1 WHERE setting_key = 'banner_duration'", [duration.toString()]);
        }
        res.json({ message: "Cập nhật thời gian thành công" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
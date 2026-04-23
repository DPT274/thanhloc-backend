const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
// ✅ ĐÃ SỬA: Import thêm hàm deleteImageFromSupabase
const { uploadImageToSupabase, deleteImageFromSupabase } = require('../services/storageService');

// Cấu hình lưu tạm file trên RAM
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// Lấy danh sách hoạt động (GET)
// ==========================================
router.get('/', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM activities ORDER BY id DESC');
        res.json(r.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Thêm hoạt động mới (POST)
// ==========================================
router.post('/', upload.single('image'), async (req, res) => {
    const { title, content, points_reward } = req.body;
    try {
        let imageUrl = '';

        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'activity_images'
            );
        }

        await pool.query(
            'INSERT INTO activities (title, content, image, points_reward) VALUES ($1, $2, $3, $4)',
            [title, content, imageUrl, points_reward || 0]
        );
        res.json({ message: "OK" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Cập nhật hoạt động (PUT) - ✅ CÓ TÍCH HỢP XÓA ẢNH CŨ
// ==========================================
router.put('/:id', upload.single('image'), async (req, res) => {
    const { title, content, points_reward } = req.body;
    try {
        // Lấy link ảnh cũ
        const oldData = await pool.query('SELECT image FROM activities WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0]?.image;

        // Nếu admin upload file ảnh MỚI -> Xóa ảnh cũ đi, sau đó đẩy ảnh mới lên
        if (req.file) {
            // 1. Dọn rác: Xóa ảnh cũ trên Supabase
            if (imageUrl) {
                await deleteImageFromSupabase(imageUrl);
            }

            // 2. Tải ảnh mới lên
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'activity_images'
            );
        }

        await pool.query(
            'UPDATE activities SET title = $1, content = $2, image = $3, points_reward = $4 WHERE id = $5',
            [title, content, imageUrl, points_reward || 0, req.params.id]
        );
        res.json({ message: "Updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Xóa hoạt động (DELETE) - ✅ CÓ TÍCH HỢP XÓA ẢNH TRONG KHO
// ==========================================
router.delete('/:id', async (req, res) => {
    try {
        // 1. Lấy link ảnh cũ trước khi xóa dòng dữ liệu
        const data = await pool.query('SELECT image FROM activities WHERE id = $1', [req.params.id]);
        const oldImageUrl = data.rows[0]?.image;

        // 2. Xóa dòng dữ liệu trong Database
        await pool.query('DELETE FROM activities WHERE id = $1', [req.params.id]);

        // 3. Dọn rác: Xóa file ảnh thật trên Storage
        if (oldImageUrl) {
            await deleteImageFromSupabase(oldImageUrl);
        }

        res.json({ message: "OK" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
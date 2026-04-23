const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
// ✅ ĐÃ SỬA: Import thêm hàm deleteImageFromSupabase
const { uploadImageToSupabase, deleteImageFromSupabase } = require('../services/storageService');

// Dùng memoryStorage để xử lý file trên RAM
const upload = multer({ storage: multer.memoryStorage() });

// 1. Lấy danh sách tin tức
router.get('/', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM news ORDER BY id DESC');
        res.json(r.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Thêm tin tức mới (CÓ UPLOAD SUPABASE)
router.post('/', upload.single('image'), async (req, res) => {
    const { title, content } = req.body;
    try {
        let imageUrl = '';

        // Nếu admin có tải ảnh bìa lên
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'news_covers' // Lưu vào thư mục news_covers trên Supabase
            );
        }

        await pool.query(
            'INSERT INTO news (title, content, image) VALUES ($1, $2, $3)',
            [title, content, imageUrl]
        );
        res.json({ message: "Đã thêm tin tức thành công" });
    } catch (error) {
        console.error("Lỗi upload tin tức:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Cập nhật (Sửa) tin tức (CÓ UPLOAD SUPABASE & DỌN RÁC)
router.put('/:id', upload.single('image'), async (req, res) => {
    const { title, content } = req.body;
    try {
        // Lấy link ảnh cũ từ DB
        const oldData = await pool.query('SELECT image FROM news WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0]?.image;

        // Nếu admin upload ảnh bìa mới -> đẩy lên Supabase và lấy link mới
        if (req.file) {
            // ✅ DỌN RÁC: Xóa ảnh bìa cũ trên Supabase trước
            if (imageUrl) {
                await deleteImageFromSupabase(imageUrl);
            }

            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'news_covers'
            );
        }

        await pool.query(
            'UPDATE news SET title = $1, content = $2, image = $3 WHERE id = $4',
            [title, content, imageUrl, req.params.id]
        );
        res.json({ message: "Đã cập nhật thành công" });
    } catch (error) {
        console.error("Lỗi cập nhật tin tức:", error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Xóa tin tức (CÓ DỌN RÁC TRONG KHO)
router.delete('/:id', async (req, res) => {
    try {
        // ✅ DỌN RÁC: 1. Lấy link ảnh cũ trước khi xóa dữ liệu
        const data = await pool.query('SELECT image FROM news WHERE id = $1', [req.params.id]);
        const oldImageUrl = data.rows[0]?.image;

        // 2. Xóa dòng trong Database
        await pool.query('DELETE FROM news WHERE id = $1', [req.params.id]);

        // 3. Tiêu hủy file ảnh thật trên Supabase
        if (oldImageUrl) {
            await deleteImageFromSupabase(oldImageUrl);
        }

        res.json({ message: "Đã xóa tin tức" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
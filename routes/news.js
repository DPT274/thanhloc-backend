// File: routes/news.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const { uploadImageToSupabase, deleteImageFromSupabase } = require('../services/storageService');

// ✅ ĐÃ SỬA: Nới lỏng giới hạn fieldSize lên 25MB để chứa ảnh Base64 từ ReactQuill
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fieldSize: 25 * 1024 * 1024 } // Cho phép text dài tối đa 25MB
});

// 🛡️ HÀM DỌN DẸP LINK SIÊU CẤP (Xóa thẻ <a> giữ lại chữ, hỗ trợ cả xuống dòng)
const cleanHtmlLinks = (htmlString) => {
    if (!htmlString) return '';
    return htmlString.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1');
};

// 1. Lấy danh sách tin tức
router.get('/', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM news ORDER BY id DESC');
        res.json(r.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Thêm tin tức mới (CÓ UPLOAD SUPABASE & CHẶN LINK)
router.post('/', upload.single('image'), async (req, res) => {
    let { title, content } = req.body;

    // ✅ Dọn sạch link rác trước khi lưu vào Database
    content = cleanHtmlLinks(content);

    try {
        let imageUrl = '';

        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'news_covers'
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

// 3. Cập nhật (Sửa) tin tức (CÓ UPLOAD SUPABASE, DỌN RÁC & CHẶN LINK)
router.put('/:id', upload.single('image'), async (req, res) => {
    let { title, content } = req.body;

    // ✅ Dọn sạch link rác trước khi cập nhật vào Database
    content = cleanHtmlLinks(content);

    try {
        const oldData = await pool.query('SELECT image FROM news WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0]?.image;

        if (req.file) {
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
        const data = await pool.query('SELECT image FROM news WHERE id = $1', [req.params.id]);
        const oldImageUrl = data.rows[0]?.image;

        await pool.query('DELETE FROM news WHERE id = $1', [req.params.id]);

        if (oldImageUrl) {
            await deleteImageFromSupabase(oldImageUrl);
        }

        res.json({ message: "Đã xóa tin tức" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
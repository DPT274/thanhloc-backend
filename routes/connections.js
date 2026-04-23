const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const { uploadImageToSupabase } = require('../services/storageService'); // Import service upload

// Dùng memoryStorage để xử lý file trên RAM trước khi đẩy lên Supabase
const upload = multer({ storage: multer.memoryStorage() });

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
// 2. API THÊM MỤC MỚI (POST) - CÓ UPLOAD SUPABASE
// ==========================================
router.post('/', upload.single('image'), async (req, res) => {
    const { title, link } = req.body;
    try {
        let imageUrl = '';

        // Nếu có gửi file, đẩy thẳng lên Supabase thư mục 'connections'
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'connections'
            );
        }

        await pool.query(
            'INSERT INTO connections (title, image, link) VALUES ($1, $2, $3)',
            [title, imageUrl, link || ""]
        );
        res.json({ message: "Đã thêm thành công" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 3. API SỬA/CẬP NHẬT MỤC (PUT) - CÓ UPLOAD SUPABASE
// ==========================================
router.put('/:id', upload.single('image'), async (req, res) => {
    const { title, link } = req.body;
    try {
        // Lấy link ảnh cũ trong DB để giữ nguyên nếu user không chọn ảnh mới
        const oldData = await pool.query('SELECT image FROM connections WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0].image;

        // Nếu admin có chọn file ảnh MỚI -> Upload lên Supabase và lấy link mới
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'connections'
            );
        }

        await pool.query(
            'UPDATE connections SET title = $1, image = $2, link = $3 WHERE id = $4',
            [title, imageUrl, link || "", req.params.id]
        );
        res.json({ message: "Đã cập nhật thành công" });
    } catch (error) {
        console.error(error);
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
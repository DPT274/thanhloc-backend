const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const { uploadImageToSupabase } = require('../services/storageService'); // Import hàm upload

// Dùng memoryStorage để xử lý file trên RAM
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reading ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Thêm nguồn đọc mới (CÓ UPLOAD SUPABASE)
router.post('/', upload.single('image'), async (req, res) => {
    const { name, link } = req.body;
    try {
        let imageUrl = '';

        // Đẩy file lên thư mục 'reading_covers' trên Supabase
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'reading_covers'
            );
        } else {
            return res.status(400).json({ error: "Vui lòng chọn ảnh bìa/logo!" });
        }

        await pool.query('INSERT INTO reading (name, image, link) VALUES ($1, $2, $3)', [name, imageUrl, link || ""]);
        res.json({ message: "Thêm thành công" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Cập nhật thông tin (CÓ UPLOAD SUPABASE)
router.put('/:id', upload.single('image'), async (req, res) => {
    const { name, link } = req.body;
    try {
        // Lấy link ảnh cũ
        const oldData = await pool.query('SELECT image FROM reading WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0].image;

        // Nếu admin upload file ảnh MỚI -> đẩy lên Supabase và lấy link mới
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'reading_covers'
            );
        }

        await pool.query(
            'UPDATE reading SET name = $1, image = $2, link = $3 WHERE id = $4',
            [name, imageUrl, link || "", req.params.id]
        );
        res.json({ message: "Đã cập nhật thành công" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reading WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xóa" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
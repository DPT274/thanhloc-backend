const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const { uploadImageToSupabase } = require('../services/storageService'); // Import hàm upload

// Dùng memoryStorage để xử lý file trên RAM
const upload = multer({ storage: multer.memoryStorage() });

// Lấy danh sách liên kết Công an
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM police ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Thêm mới liên kết Công an (CÓ UPLOAD SUPABASE)
router.post('/', upload.single('image'), async (req, res) => {
    const { name, link } = req.body;
    try {
        let imageUrl = '';

        // Nếu có file được gửi lên, upload lên Supabase thư mục 'police_icons'
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'police_icons'
            );
        } else {
            return res.status(400).json({ error: "Vui lòng chọn ảnh!" });
        }

        await pool.query(
            'INSERT INTO police (name, image, link) VALUES ($1, $2, $3)',
            [name, imageUrl, link || ""]
        );
        res.json({ message: "Đã thêm thành công" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Cập nhật liên kết Công an (CÓ UPLOAD SUPABASE)
router.put('/:id', upload.single('image'), async (req, res) => {
    const { name, link } = req.body;
    try {
        // Lấy thông tin ảnh cũ để dùng lại nếu admin không upload ảnh mới
        const oldData = await pool.query('SELECT image FROM police WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0].image;

        // Nếu admin chọn file ảnh MỚI -> Upload lên Supabase và lấy link mới
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'police_icons'
            );
        }

        await pool.query(
            'UPDATE police SET name = $1, image = $2, link = $3 WHERE id = $4',
            [name, imageUrl, link || "", req.params.id]
        );
        res.json({ message: "Đã cập nhật thành công" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Xóa liên kết
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM police WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xóa" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
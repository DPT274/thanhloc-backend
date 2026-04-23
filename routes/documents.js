const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
// ✅ ĐÃ SỬA: Import thêm hàm deleteImageFromSupabase
const { uploadImageToSupabase, deleteImageFromSupabase } = require('../services/storageService');

// Dùng memoryStorage để xử lý file trên RAM
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM documents ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// THÊM MỤC TRA CỨU MỚI
// ==========================================
router.post('/', upload.single('image'), async (req, res) => {
    const { name, link } = req.body;
    try {
        let imageUrl = '';

        // Nếu có gửi file, upload lên thư mục 'document_icons'
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'document_icons'
            );
        } else {
            return res.status(400).json({ error: "Vui lòng chọn ảnh logo!" });
        }

        await pool.query('INSERT INTO documents (name, image, link) VALUES ($1, $2, $3)', [name, imageUrl, link || ""]);
        res.json({ message: "OK" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// CẬP NHẬT (SỬA) - CÓ DỌN RÁC ẢNH CŨ
// ==========================================
router.put('/:id', upload.single('image'), async (req, res) => {
    const { name, link } = req.body;
    try {
        // Lấy link cũ từ DB
        const oldData = await pool.query('SELECT image FROM documents WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0]?.image;

        // Nếu admin upload file ảnh MỚI
        if (req.file) {
            // ✅ DỌN RÁC: Xóa logo cũ trên Supabase trước
            if (imageUrl) {
                await deleteImageFromSupabase(imageUrl);
            }

            // Tải logo mới lên và lấy link mới
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'document_icons'
            );
        }

        await pool.query(
            'UPDATE documents SET name = $1, image = $2, link = $3 WHERE id = $4',
            [name, imageUrl, link || "", req.params.id]
        );
        res.json({ message: "Cập nhật thành công" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// XÓA (DELETE) - CÓ DỌN RÁC TRONG KHO
// ==========================================
router.delete('/:id', async (req, res) => {
    try {
        // ✅ DỌN RÁC: 1. Lấy link ảnh từ DB trước
        const data = await pool.query('SELECT image FROM documents WHERE id = $1', [req.params.id]);
        const oldImageUrl = data.rows[0]?.image;

        // 2. Xóa dữ liệu trong Database
        await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);

        // 3. Tiêu hủy file logo thật trên Supabase
        if (oldImageUrl) {
            await deleteImageFromSupabase(oldImageUrl);
        }

        res.json({ message: "Xóa thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
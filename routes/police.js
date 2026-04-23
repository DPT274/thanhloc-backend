const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
// ✅ ĐÃ SỬA: Import thêm hàm deleteImageFromSupabase
const { uploadImageToSupabase, deleteImageFromSupabase } = require('../services/storageService');

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

// Cập nhật liên kết Công an (CÓ UPLOAD SUPABASE & DỌN RÁC)
router.put('/:id', upload.single('image'), async (req, res) => {
    const { name, link } = req.body;
    try {
        // Lấy thông tin ảnh cũ để dùng lại nếu admin không upload ảnh mới
        const oldData = await pool.query('SELECT image FROM police WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0]?.image;

        // Nếu admin chọn file ảnh MỚI
        if (req.file) {
            // ✅ DỌN RÁC: Xóa icon cũ trên Supabase trước
            if (imageUrl) {
                await deleteImageFromSupabase(imageUrl);
            }

            // Upload lên Supabase và lấy link mới
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

// Xóa liên kết (CÓ DỌN RÁC TRONG KHO)
router.delete('/:id', async (req, res) => {
    try {
        // ✅ DỌN RÁC: 1. Lấy link ảnh cũ trước khi xóa dữ liệu
        const data = await pool.query('SELECT image FROM police WHERE id = $1', [req.params.id]);
        const oldImageUrl = data.rows[0]?.image;

        // 2. Xóa dòng trong Database
        await pool.query('DELETE FROM police WHERE id = $1', [req.params.id]);

        // 3. Tiêu hủy file vật lý trên Supabase
        if (oldImageUrl) {
            await deleteImageFromSupabase(oldImageUrl);
        }

        res.json({ message: "Đã xóa" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
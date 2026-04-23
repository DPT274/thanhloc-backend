const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
// ✅ ĐÃ SỬA: Import thêm hàm deleteImageFromSupabase
const { uploadImageToSupabase, deleteImageFromSupabase } = require('../services/storageService');

// Dùng memoryStorage để xử lý file trên RAM
const upload = multer({ storage: multer.memoryStorage() });

// Lấy danh sách báo
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM press ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Thêm báo mới (CÓ UPLOAD SUPABASE)
router.post('/', upload.single('image'), async (req, res) => {
    const { name, link } = req.body;
    try {
        let imageUrl = '';

        // Nếu có file upload, đưa vào thư mục 'press_icons'
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'press_icons'
            );
        } else {
            return res.status(400).json({ error: "Vui lòng chọn ảnh logo báo!" });
        }

        await pool.query('INSERT INTO press (name, image, link) VALUES ($1, $2, $3)', [name, imageUrl, link || ""]);
        res.json({ message: "Đã thêm báo thành công" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Cập nhật báo (CÓ UPLOAD SUPABASE & DỌN RÁC)
router.put('/:id', upload.single('image'), async (req, res) => {
    const { name, link } = req.body;
    try {
        // Lấy link cũ từ database
        const oldData = await pool.query('SELECT image FROM press WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0]?.image;

        // Nếu có ảnh mới -> Dọn rác ảnh cũ, rồi upload lấy link mới
        if (req.file) {
            // ✅ DỌN RÁC: Xóa logo cũ trên Supabase trước
            if (imageUrl) {
                await deleteImageFromSupabase(imageUrl);
            }

            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'press_icons'
            );
        }

        await pool.query(
            'UPDATE press SET name = $1, image = $2, link = $3 WHERE id = $4',
            [name, imageUrl, link || "", req.params.id]
        );
        res.json({ message: "Đã cập nhật thành công" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Xóa báo (CÓ DỌN RÁC TRONG KHO)
router.delete('/:id', async (req, res) => {
    try {
        // ✅ DỌN RÁC: 1. Lấy link ảnh cũ trước khi xóa dữ liệu
        const data = await pool.query('SELECT image FROM press WHERE id = $1', [req.params.id]);
        const oldImageUrl = data.rows[0]?.image;

        // 2. Xóa dòng trong Database
        await pool.query('DELETE FROM press WHERE id = $1', [req.params.id]);

        // 3. Tiêu hủy file logo thật trên Supabase
        if (oldImageUrl) {
            await deleteImageFromSupabase(oldImageUrl);
        }

        res.json({ message: "Đã xóa" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
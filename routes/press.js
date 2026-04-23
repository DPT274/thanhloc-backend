const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const { uploadImageToSupabase } = require('../services/storageService'); // Import hàm upload

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

// Cập nhật báo (CÓ UPLOAD SUPABASE)
router.put('/:id', upload.single('image'), async (req, res) => {
    const { name, link } = req.body;
    try {
        // Lấy link cũ từ database
        const oldData = await pool.query('SELECT image FROM press WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0].image;

        // Nếu có ảnh mới -> upload và lấy link mới
        if (req.file) {
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

// Xóa báo
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM press WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xóa" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
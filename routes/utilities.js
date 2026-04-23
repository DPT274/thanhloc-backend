// routes/utilities.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
// ✅ ĐÃ SỬA: Import thêm hàm deleteImageFromSupabase
const { uploadImageToSupabase, deleteImageFromSupabase } = require('../services/storageService');

// Dùng memoryStorage để không lưu file rác lên ổ cứng của Render
const upload = multer({ storage: multer.memoryStorage() });

// 1. Lấy danh sách tiện ích
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM utilities ORDER BY order_index ASC, id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

// 2. Thêm tiện ích mới (Sử dụng upload.single('image'))
router.post('/', upload.single('image'), async (req, res) => {
    const { name, action_path, order_index } = req.body;
    try {
        let imageUrl = null;

        // Nếu có file được gửi lên, upload lên Supabase
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'utilities_icons' // Lưu vào thư mục này trong Bucket
            );
        }

        const result = await pool.query(
            'INSERT INTO utilities (name, image, action_path, order_index) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, imageUrl, action_path, order_index || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi thêm tiện ích' });
    }
});

// 3. Cập nhật tiện ích (CÓ DỌN RÁC ẢNH CŨ)
router.put('/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, action_path, order_index } = req.body;
    try {
        // Lấy thông tin cũ để giữ lại ảnh nếu không cập nhật ảnh mới
        const oldUtility = await pool.query('SELECT image FROM utilities WHERE id = $1', [id]);
        let imageUrl = oldUtility.rows[0]?.image;

        // Nếu có file ảnh mới
        if (req.file) {
            // ✅ DỌN RÁC: Xoá icon cũ trên Supabase trước
            if (imageUrl) {
                await deleteImageFromSupabase(imageUrl);
            }

            // Tải icon mới lên
            imageUrl = await uploadImageToSupabase(
                req.file.buffer, req.file.originalname, req.file.mimetype, 'utilities_icons'
            );
        }

        const result = await pool.query(
            'UPDATE utilities SET name = $1, image = $2, action_path = $3, order_index = $4 WHERE id = $5 RETURNING *',
            [name, imageUrl, action_path, order_index, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi cập nhật tiện ích' });
    }
});

// 4. Xóa tiện ích (CÓ DỌN RÁC TRONG KHO)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // ✅ DỌN RÁC: 1. Lấy link ảnh cũ trước khi xóa dữ liệu
        const data = await pool.query('SELECT image FROM utilities WHERE id = $1', [id]);
        const oldImageUrl = data.rows[0]?.image;

        // 2. Xóa dữ liệu trong Database
        await pool.query('DELETE FROM utilities WHERE id = $1', [id]);

        // 3. Tiêu hủy file vật lý trên Supabase
        if (oldImageUrl) {
            await deleteImageFromSupabase(oldImageUrl);
        }

        res.json({ message: 'Đã xóa thành công' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi xóa tiện ích' });
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const { uploadImageToSupabase, deleteImageFromSupabase } = require('../services/storageService');

const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. QUẢN LÝ DANH MỤC
// ==========================================

router.get('/categories/all', async (req, res) => {
    try {
        const r = await pool.query('SELECT category, image FROM tourism_icons');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/categories', upload.single('image'), async (req, res) => {
    try {
        const { category } = req.body;
        let imageUrl = '';
        if (req.file) {
            imageUrl = await uploadImageToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'tourism_categories');
        }
        await pool.query('INSERT INTO tourism_icons (category, image) VALUES ($1, $2)', [category, imageUrl]);
        res.json({ message: "Thêm danh mục thành công!" });
    } catch (e) { res.status(500).json({ error: "Danh mục đã tồn tại!" }); }
});

// ✅ ĐÃ SỬA LỖI SQL: Xử lý thông minh khi sửa tên danh mục
router.put('/categories/:oldCategory', upload.single('image'), async (req, res) => {
    try {
        const oldCat = req.params.oldCategory;
        const { newCategory } = req.body;

        const oldData = await pool.query('SELECT image FROM tourism_icons WHERE category = $1', [oldCat]);
        let imageUrl = oldData.rows[0]?.image || '';

        if (req.file) {
            if (imageUrl) await deleteImageFromSupabase(imageUrl);
            imageUrl = await uploadImageToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'tourism_categories');
        }

        // Nếu Admin đổi Tên danh mục (Khác tên cũ) -> Tránh lỗi khóa ngoại SQL
        if (oldCat !== newCategory) {
            // 1. Kiểm tra tên mới có bị trùng không
            const check = await pool.query('SELECT category FROM tourism_icons WHERE category = $1', [newCategory]);
            if (check.rows.length > 0) return res.status(400).json({ error: "Tên danh mục mới đã tồn tại!" });

            // 2. Tạo danh mục mới
            await pool.query('INSERT INTO tourism_icons (category, image) VALUES ($1, $2)', [newCategory, imageUrl]);
            // 3. Chuyển toàn bộ địa điểm từ danh mục cũ sang danh mục mới
            await pool.query('UPDATE tourism_places SET category = $1 WHERE category = $2', [newCategory, oldCat]);
            // 4. Xóa danh mục cũ
            await pool.query('DELETE FROM tourism_icons WHERE category = $1', [oldCat]);
        } else {
            // Chỉ cập nhật ảnh nếu tên giữ nguyên
            await pool.query('UPDATE tourism_icons SET image = $1 WHERE category = $2', [imageUrl, oldCat]);
        }

        res.json({ message: "Cập nhật thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ✅ ĐÃ SỬA LỖI SQL: Phải xóa bảng con trước, bảng cha sau
router.delete('/categories/:category', async (req, res) => {
    try {
        const cat = req.params.category;

        const catData = await pool.query('SELECT image FROM tourism_icons WHERE category = $1', [cat]);
        const catImageUrl = catData.rows[0]?.image;

        const placesData = await pool.query('SELECT image FROM tourism_places WHERE category = $1', [cat]);
        const placesImages = placesData.rows.map(row => row.image).filter(img => img);

        // ĐẢO THỨ TỰ: Xóa bảng chứa địa điểm (con) TRƯỚC, xóa danh mục (cha) SAU
        await pool.query('DELETE FROM tourism_places WHERE category = $1', [cat]);
        await pool.query('DELETE FROM tourism_icons WHERE category = $1', [cat]);

        if (catImageUrl) await deleteImageFromSupabase(catImageUrl);
        for (const img of placesImages) {
            await deleteImageFromSupabase(img);
        }

        res.json({ message: "Đã xoá danh mục và dọn dẹp sạch sẽ các địa điểm!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// ==========================================
// 2. QUẢN LÝ ĐỊA ĐIỂM
// ==========================================

router.get('/:category', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM tourism_places WHERE category = $1 ORDER BY id DESC', [req.params.category]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { category, name, address, phone, description, map_link, page_link, rating, price, open_hours } = req.body;
        let imageUrl = '';
        if (req.file) {
            imageUrl = await uploadImageToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'tourism_places');
        }
        await pool.query(
            'INSERT INTO tourism_places (category, name, address, phone, description, image, map_link, page_link, rating, price, open_hours) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [category, name, address || '', phone || '', description || '', imageUrl, map_link || '', page_link || '', rating || '5.0', price || '', open_hours || '']
        );
        res.json({ message: "Thêm thành công!" });
    } catch (e) { res.status(500).json({ error: "Lỗi hệ thống!" }); }
});

router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { category, name, address, phone, description, map_link, page_link, rating, price, open_hours } = req.body;
        const oldData = await pool.query('SELECT image FROM tourism_places WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0]?.image || '';

        if (req.file) {
            if (imageUrl) await deleteImageFromSupabase(imageUrl);
            imageUrl = await uploadImageToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'tourism_places');
        }
        await pool.query(
            'UPDATE tourism_places SET category = $1, name = $2, address = $3, phone = $4, description = $5, image = $6, map_link = $7, page_link = $8, rating = $9, price = $10, open_hours = $11 WHERE id = $12',
            [category, name, address || '', phone || '', description || '', imageUrl, map_link || '', page_link || '', rating || '5.0', price || '', open_hours || '', req.params.id]
        );
        res.json({ message: "Cập nhật thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
    try {
        const data = await pool.query('SELECT image FROM tourism_places WHERE id = $1', [req.params.id]);
        const oldImageUrl = data.rows[0]?.image;

        await pool.query('DELETE FROM tourism_places WHERE id = $1', [req.params.id]);

        if (oldImageUrl) await deleteImageFromSupabase(oldImageUrl);
        res.json({ message: "Đã xoá thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
// ✅ ĐÃ SỬA: Import thêm hàm deleteImageFromSupabase
const { uploadImageToSupabase, deleteImageFromSupabase } = require('../services/storageService');

// Cấu hình Multer để nhận file
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. QUẢN LÝ DANH MỤC (CÓ UPLOAD SUPABASE & DỌN RÁC)
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

router.put('/categories/:oldCategory', upload.single('image'), async (req, res) => {
    try {
        const oldCat = req.params.oldCategory;
        const { newCategory } = req.body;

        // Lấy ảnh cũ từ DB
        const oldData = await pool.query('SELECT image FROM tourism_icons WHERE category = $1', [oldCat]);
        let imageUrl = oldData.rows[0]?.image || '';

        if (req.file) {
            // ✅ DỌN RÁC: Xóa icon danh mục cũ trên Supabase
            if (imageUrl) {
                await deleteImageFromSupabase(imageUrl);
            }
            // Có ảnh mới -> Tải lên Supabase
            imageUrl = await uploadImageToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'tourism_categories');
        }

        await pool.query('UPDATE tourism_icons SET category = $1, image = $2 WHERE category = $3', [newCategory, imageUrl, oldCat]);
        await pool.query('UPDATE tourism_places SET category = $1 WHERE category = $2', [newCategory, oldCat]);
        res.json({ message: "Cập nhật thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/categories/:category', async (req, res) => {
    try {
        const cat = req.params.category;

        // ✅ DỌN RÁC TỔNG LỰC: Lấy cả ảnh danh mục VÀ tất cả ảnh địa điểm thuộc danh mục đó
        const catData = await pool.query('SELECT image FROM tourism_icons WHERE category = $1', [cat]);
        const catImageUrl = catData.rows[0]?.image;

        const placesData = await pool.query('SELECT image FROM tourism_places WHERE category = $1', [cat]);
        const placesImages = placesData.rows.map(row => row.image).filter(img => img); // Lọc ra các dòng có ảnh

        // 1. Xóa trong Database
        await pool.query('DELETE FROM tourism_icons WHERE category = $1', [cat]);
        await pool.query('DELETE FROM tourism_places WHERE category = $1', [cat]);

        // 2. Tiêu hủy file trên Supabase (Cả Icon danh mục lẫn các hình ảnh địa điểm bên trong)
        if (catImageUrl) await deleteImageFromSupabase(catImageUrl);
        for (const img of placesImages) {
            await deleteImageFromSupabase(img);
        }

        res.json({ message: "Đã xoá danh mục và dọn dẹp sạch sẽ các địa điểm liên quan!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// ==========================================
// 2. QUẢN LÝ ĐỊA ĐIỂM (CÓ UPLOAD SUPABASE & DỌN RÁC)
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
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Lỗi hệ thống!" });
    }
});

router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { category, name, address, phone, description, map_link, page_link, rating, price, open_hours } = req.body;

        // Lấy thông tin ảnh cũ
        const oldData = await pool.query('SELECT image FROM tourism_places WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0]?.image || '';

        if (req.file) {
            // ✅ DỌN RÁC: Xóa ảnh cũ trước khi tải ảnh mới
            if (imageUrl) {
                await deleteImageFromSupabase(imageUrl);
            }
            imageUrl = await uploadImageToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'tourism_places');
        }

        await pool.query(
            'UPDATE tourism_places SET category = $1, name = $2, address = $3, phone = $4, description = $5, image = $6, map_link = $7, page_link = $8, rating = $9, price = $10, open_hours = $11 WHERE id = $12',
            [category, name, address || '', phone || '', description || '', imageUrl, map_link || '', page_link || '', rating || '5.0', price || '', open_hours || '', req.params.id]
        );
        res.json({ message: "Cập nhật thành công!" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        // ✅ DỌN RÁC: Lấy link ảnh trước khi xóa
        const data = await pool.query('SELECT image FROM tourism_places WHERE id = $1', [req.params.id]);
        const oldImageUrl = data.rows[0]?.image;

        await pool.query('DELETE FROM tourism_places WHERE id = $1', [req.params.id]);

        // Tiêu hủy file trên Supabase
        if (oldImageUrl) {
            await deleteImageFromSupabase(oldImageUrl);
        }

        res.json({ message: "Đã xoá thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
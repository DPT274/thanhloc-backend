const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const { uploadImageToSupabase } = require('../services/storageService'); // Import service

// Cấu hình Multer để nhận file
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. QUẢN LÝ DANH MỤC (CÓ UPLOAD SUPABASE)
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
        let imageUrl = '';

        if (req.file) {
            // Có ảnh mới -> Tải lên Supabase
            imageUrl = await uploadImageToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'tourism_categories');
        } else {
            // Lấy lại ảnh cũ từ DB
            const oldData = await pool.query('SELECT image FROM tourism_icons WHERE category = $1', [oldCat]);
            imageUrl = oldData.rows[0]?.image || '';
        }

        await pool.query('UPDATE tourism_icons SET category = $1, image = $2 WHERE category = $3', [newCategory, imageUrl, oldCat]);
        await pool.query('UPDATE tourism_places SET category = $1 WHERE category = $2', [newCategory, oldCat]);
        res.json({ message: "Cập nhật thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/categories/:category', async (req, res) => {
    try {
        const cat = req.params.category;
        await pool.query('DELETE FROM tourism_icons WHERE category = $1', [cat]);
        await pool.query('DELETE FROM tourism_places WHERE category = $1', [cat]);
        res.json({ message: "Đã xoá danh mục!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// ==========================================
// 2. QUẢN LÝ ĐỊA ĐIỂM (CÓ UPLOAD SUPABASE)
// ==========================================

router.get('/:category', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM tourism_places WHERE category = $1 ORDER BY id DESC', [req.params.category]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Thêm mới địa điểm
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

// Cập nhật địa điểm
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { category, name, address, phone, description, map_link, page_link, rating, price, open_hours } = req.body;
        let imageUrl = '';

        if (req.file) {
            imageUrl = await uploadImageToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'tourism_places');
        } else {
            const oldData = await pool.query('SELECT image FROM tourism_places WHERE id = $1', [req.params.id]);
            imageUrl = oldData.rows[0]?.image || '';
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
        await pool.query('DELETE FROM tourism_places WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xoá thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
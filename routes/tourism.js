const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// ==========================================
// 1. QUẢN LÝ DANH MỤC (Tạo tab mới, Up Icon, Sửa, Xoá)
// ==========================================

router.get('/categories/all', async (req, res) => {
    try {
        const r = await pool.query('SELECT category, image FROM tourism_icons');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/categories', async (req, res) => {
    try {
        const { category, image } = req.body;
        await pool.query('INSERT INTO tourism_icons (category, image) VALUES ($1, $2)', [category, image || null]);
        res.json({ message: "Thêm danh mục thành công!" });
    } catch (e) { res.status(500).json({ error: "Danh mục đã tồn tại!" }); }
});

router.put('/categories/:oldCategory', async (req, res) => {
    try {
        const oldCat = req.params.oldCategory;
        const { newCategory, image } = req.body;
        await pool.query('UPDATE tourism_icons SET category = $1, image = $2 WHERE category = $3', [newCategory, image, oldCat]);
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
// 2. QUẢN LÝ ĐỊA ĐIỂM (Nhà hàng, Khách sạn...)
// ĐÃ THÊM MAP_LINK VÀ PAGE_LINK
// ==========================================

router.get('/:category', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM tourism_places WHERE category = $1 ORDER BY id DESC', [req.params.category]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
    try {
        const { category, name, address, phone, description, image, map_link, page_link } = req.body;
        await pool.query(
            'INSERT INTO tourism_places (category, name, address, phone, description, image, map_link, page_link) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [category, name, address, phone, description, image, map_link, page_link]
        );
        res.json({ message: "Thêm thành công!" });
    } catch (e) { res.status(500).json({ error: "Lỗi hệ thống hoặc ảnh quá lớn!" }); }
});

router.put('/:id', async (req, res) => {
    try {
        const { category, name, address, phone, description, image, map_link, page_link } = req.body;
        await pool.query(
            'UPDATE tourism_places SET category = $1, name = $2, address = $3, phone = $4, description = $5, image = $6, map_link = $7, page_link = $8 WHERE id = $9',
            [category, name, address, phone, description, image, map_link, page_link, req.params.id]
        );
        res.json({ message: "Cập nhật thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM tourism_places WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xoá thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
// ✅ ĐÃ SỬA: Import thêm hàm deleteImageFromSupabase
const { uploadImageToSupabase, deleteImageFromSupabase } = require('../services/storageService');

// Cấu hình Multer để lưu file tạm trên RAM
const upload = multer({ storage: multer.memoryStorage() });

// --- QUẢN LÝ LỚP HỌC (ADMIN) ---
router.get('/classes', async (req, res) => {
    try {
        const r = await pool.query('SELECT id, title, description, location, image, points_reward FROM education_classes ORDER BY id DESC');
        res.json(r.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// THÊM LỚP HỌC MỚI (CÓ UPLOAD SUPABASE)
router.post('/classes', upload.single('image'), async (req, res) => {
    const { title, description, location, points_reward } = req.body;
    try {
        let imageUrl = '';

        // Nếu có ảnh -> Upload lên Supabase thư mục 'education_classes'
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'education_classes'
            );
        }

        await pool.query(
            'INSERT INTO education_classes (title, description, location, image, points_reward) VALUES ($1, $2, $3, $4, $5)',
            [title, description, location, imageUrl, points_reward || 0]
        );
        res.json({ message: "Đã thêm lớp học mới!" });
    } catch (error) {
        console.error("Lỗi khi thêm lớp học:", error);
        res.status(500).json({ error: error.message });
    }
});

// CẬP NHẬT LỚP HỌC (CÓ UPLOAD SUPABASE & DỌN RÁC)
router.put('/classes/:id', upload.single('image'), async (req, res) => {
    const { title, description, location, points_reward } = req.body;
    try {
        // Lấy link ảnh cũ
        const oldData = await pool.query('SELECT image FROM education_classes WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0]?.image;

        // Nếu admin upload ảnh mới -> xóa ảnh cũ trên Supabase rồi mới lấy link mới
        if (req.file) {
            // ✅ DỌN RÁC: Xóa ảnh lớp học cũ
            if (imageUrl) {
                await deleteImageFromSupabase(imageUrl);
            }

            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'education_classes'
            );
        }

        await pool.query(
            'UPDATE education_classes SET title = $1, description = $2, location = $3, image = $4, points_reward = $5 WHERE id = $6',
            [title, description, location, imageUrl, points_reward || 0, req.params.id]
        );
        res.json({ message: "Đã cập nhật lớp học!" });
    } catch (error) {
        console.error("Lỗi khi cập nhật lớp học:", error);
        res.status(500).json({ error: error.message });
    }
});

// XOÁ LỚP HỌC (CÓ DỌN RÁC TRONG STORAGE)
router.delete('/classes/:id', async (req, res) => {
    try {
        // ✅ DỌN RÁC: 1. Lấy link ảnh cũ trước khi xóa dữ liệu
        const data = await pool.query('SELECT image FROM education_classes WHERE id = $1', [req.params.id]);
        const oldImageUrl = data.rows[0]?.image;

        // 2. Xóa dòng trong Database
        await pool.query('DELETE FROM education_classes WHERE id = $1', [req.params.id]);

        // 3. Tiêu hủy ảnh lớp học trên Supabase
        if (oldImageUrl) {
            await deleteImageFromSupabase(oldImageUrl);
        }

        res.json({ message: "Đã xóa lớp học!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- QUẢN LÝ ĐĂNG KÝ (USER & ADMIN) ---
router.post('/register', async (req, res) => {
    const { phone, name, class_id, class_title } = req.body;
    try {
        const check = await pool.query('SELECT id FROM education_registrations WHERE phone = $1 AND class_id = $2', [phone, class_id]);
        if (check.rows.length > 0) return res.status(400).json({ message: "Bạn đã đăng ký lớp này rồi!" });

        await pool.query(
            'INSERT INTO education_registrations (phone, name, class_id, class_title) VALUES ($1, $2, $3, $4)',
            [phone, name, class_id, class_title]
        );
        res.json({ message: "Đăng ký thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/my-registrations/:phone', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM education_registrations WHERE phone = $1 ORDER BY created_at DESC', [req.params.phone]);
        res.json(r.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/registrations', async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM education_registrations ORDER BY created_at DESC");
        res.json(r.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ ADMIN DUYỆT THAM GIA & CỘNG ĐIỂM
router.put('/registrations/:id/approve', async (req, res) => {
    const { phone, name, points_reward, class_title } = req.body;
    try {
        await pool.query("UPDATE education_registrations SET status = 'Đã tham gia' WHERE id = $1", [req.params.id]);

        if (points_reward > 0) {
            await pool.query(`INSERT INTO users (phone, name, points) VALUES ($1, $2, 0) ON CONFLICT (phone) DO NOTHING`, [phone, name || 'Người dân']);
            await pool.query('UPDATE users SET points = points + $1 WHERE phone = $2', [points_reward, phone]);

            const reason = `Tham gia học: ${class_title}`;
            await pool.query('INSERT INTO point_history (phone, name, reason, points) VALUES ($1, $2, $3, $4)', [phone, name, reason, points_reward]);
        }
        res.json({ message: "Đã duyệt và cộng điểm!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/registrations/:id/reject', async (req, res) => {
    try {
        await pool.query("UPDATE education_registrations SET status = 'Từ chối' WHERE id = $1", [req.params.id]);
        res.json({ message: "Đã từ chối!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ✅ ADMIN XOÁ ĐƠN ĐĂNG KÝ VĨNH VIỄN
router.delete('/registrations/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM education_registrations WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xoá đơn đăng ký thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
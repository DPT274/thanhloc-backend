const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// ==========================================
// 1. QUẢN LÝ KHẢO SÁT & TRẢ LỜI KHẢO SÁT
// ==========================================
router.get('/surveys', async (req, res) => {
    const result = await pool.query('SELECT * FROM surveys ORDER BY id DESC');
    res.json(result.rows);
});

router.post('/surveys', async (req, res) => {
    const { title, description, questions } = req.body;
    await pool.query('INSERT INTO surveys (title, description, questions) VALUES ($1, $2, $3)', [title, description, JSON.stringify(questions)]);
    res.json({ success: true });
});

router.delete('/surveys/:id', async (req, res) => {
    await pool.query('DELETE FROM surveys WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

router.post('/survey-responses', async (req, res) => {
    const { survey_id, user_name, answers } = req.body;
    const phone = answers.phone; // Lấy số điện thoại từ bài khảo sát

    try {
        if (phone) {
            const checkExist = await pool.query("SELECT id FROM survey_responses WHERE survey_id = $1 AND answers->>'phone' = $2", [survey_id, phone]);
            if (checkExist.rows.length > 0) return res.status(400).json({ message: "Bạn đã hoàn thành khảo sát này rồi!" });
        }

        await pool.query('INSERT INTO survey_responses (survey_id, user_name, answers) VALUES ($1, $2, $3)', [survey_id, user_name, JSON.stringify(answers)]);

        if (phone) {
            const surveyRes = await pool.query('SELECT title, questions FROM surveys WHERE id = $1', [survey_id]);
            if (surveyRes.rows.length > 0) {
                const survey = surveyRes.rows[0];
                const questionsData = typeof survey.questions === 'string' ? JSON.parse(survey.questions) : survey.questions;
                const pointsReward = questionsData.points_reward || 0;

                if (pointsReward > 0) {
                    await pool.query(`INSERT INTO users (phone, name, points) VALUES ($1, $2, 0) ON CONFLICT (phone) DO NOTHING`, [phone, user_name || 'Người dân']);
                    await pool.query('UPDATE users SET points = points + $1 WHERE phone = $2', [pointsReward, phone]);
                    const reason = `Thưởng làm khảo sát: ${survey.title}`;
                    await pool.query('INSERT INTO point_history (phone, name, reason, points) VALUES ($1, $2, $3, $4)', [phone, user_name, reason, pointsReward]);
                }
            }
        }
        res.json({ success: true, message: "Cảm ơn bạn đã đóng góp ý kiến!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/survey-responses', async (req, res) => {
    const result = await pool.query(`SELECT r.*, s.title as survey_title FROM survey_responses r JOIN surveys s ON r.survey_id = s.id ORDER BY r.submitted_at DESC`);
    res.json(result.rows);
});

// ==========================================
// 2. QUẢN LÝ YÊU CẦU DUYỆT ĐIỂM (TÌNH NGUYỆN)
// ==========================================
router.post('/register-activity', async (req, res) => {
    const { phone, name, activity_id, activity_title, points_reward } = req.body;
    try {
        await pool.query(`INSERT INTO users (phone, name, points) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`, [phone, name]);
        await pool.query('INSERT INTO registrations (phone, name, activity_id, activity_title, points_reward) VALUES ($1, $2, $3, $4, $5)', [phone, name, activity_id, activity_title, points_reward]);
        res.json({ message: "Đã gửi yêu cầu đăng ký!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/my-registrations/:phone', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM registrations WHERE phone = $1', [req.params.phone]);
        res.json(r.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/registrations', async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM registrations WHERE status = 'Đang chờ' ORDER BY id DESC");
        res.json(r.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/registrations', async (req, res) => {
    const { name, phone, activity_id, activity_title, points_reward } = req.body;
    try {
        await pool.query(`INSERT INTO users (phone, name, points) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`, [phone, name]);
        await pool.query('INSERT INTO registrations (phone, name, activity_id, activity_title, points_reward) VALUES ($1, $2, $3, $4, $5)', [phone, name, activity_id || null, activity_title, points_reward]);
        res.json({ message: "Đã thêm yêu cầu bằng tay!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/registrations/:id', async (req, res) => {
    const { name, phone, activity_title, points_reward } = req.body;
    try {
        await pool.query('UPDATE registrations SET name = $1, phone = $2, activity_title = $3, points_reward = $4 WHERE id = $5', [name, phone, activity_title, points_reward, req.params.id]);
        res.json({ message: "Đã cập nhật yêu cầu!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/registrations/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM registrations WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xoá yêu cầu!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/approve-registration', async (req, res) => {
    const { id, phone, points_reward } = req.body;
    try {
        await pool.query("UPDATE registrations SET status = 'Đã duyệt' WHERE id = $1", [id]);
        await pool.query('UPDATE users SET points = points + $1 WHERE phone = $2', [points_reward, phone]);
        res.json({ message: "Đã duyệt và cộng điểm thành công!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 3. QUẢN LÝ BẢNG XẾP HẠNG TÌNH NGUYỆN VIÊN
// ==========================================
router.get('/leaderboard', async (req, res) => {
    try {
        const r = await pool.query('SELECT phone, name, points FROM users ORDER BY points DESC LIMIT 100');
        res.json(r.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/leaderboard', async (req, res) => {
    const { phone, name, points } = req.body;
    try {
        await pool.query('INSERT INTO users (phone, name, points) VALUES ($1, $2, $3)', [phone, name, points]);
        res.json({ message: "Đã thêm thành công!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/leaderboard/:phone', async (req, res) => {
    const { name, points } = req.body;
    try {
        await pool.query('UPDATE users SET name = $1, points = $2 WHERE phone = $3', [name, points, req.params.phone]);
        res.json({ message: "Đã cập nhật!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/leaderboard/:phone', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE phone = $1', [req.params.phone]);
        res.json({ message: "Đã xóa!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 4. QUẢN LÝ ĐỔI QUÀ (REDEEM GIFTS)
// ==========================================
router.get('/gift-redemptions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM gift_redemptions ORDER BY redeemed_at DESC');
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/users/redeem', async (req, res) => {
    const { phone, user_name, gift_name, points_to_deduct } = req.body;
    try {
        const user = await pool.query('SELECT points FROM users WHERE phone = $1', [phone]);
        if (user.rows.length === 0 || user.rows[0].points < points_to_deduct) {
            return res.status(400).json({ message: "Không đủ điểm!" });
        }
        await pool.query('UPDATE users SET points = points - $1 WHERE phone = $2', [points_to_deduct, phone]);
        await pool.query('INSERT INTO gift_redemptions (user_phone, user_name, gift_name, points_used) VALUES ($1, $2, $3, $4)', [phone, user_name, gift_name, points_to_deduct]);
        res.json({ message: "Đổi quà thành công! Đã trừ điểm và lưu lịch sử." });
    } catch (error) { res.status(500).json({ message: "Lỗi hệ thống!" }); }
});

// ==========================================
// 5. API LẤY LỊCH SỬ CỘNG ĐIỂM CỦA NGƯỜI DÂN
// ==========================================
router.get('/point-history/:phone', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM point_history WHERE phone = $1 ORDER BY created_at DESC', [req.params.phone]);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
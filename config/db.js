const { Pool } = require('pg');

const pool = new Pool({
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.zhuyysywosyzqqwaqnel',
    password: '02072004@DPt*#',
    ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) return console.error('🚨 Lỗi kết nối Supabase:', err.stack);
    console.log('✅ Đã kết nối thành công với Database trên Supabase!');
    release();
});

const initDB = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS news (id SERIAL PRIMARY KEY, title TEXT, content TEXT, image TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS reports (id SERIAL PRIMARY KEY, name TEXT, phone TEXT, title TEXT, content TEXT, image TEXT, latitude TEXT, longitude TEXT, status TEXT DEFAULT 'Chờ xử lý', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS users (phone TEXT PRIMARY KEY, name TEXT, points INTEGER DEFAULT 0);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS activities (id SERIAL PRIMARY KEY, title TEXT, content TEXT, image TEXT, points_reward INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS gifts (id SERIAL PRIMARY KEY, name TEXT, image TEXT, points_required INTEGER DEFAULT 0);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS registrations (id SERIAL PRIMARY KEY, phone TEXT, name TEXT, activity_id INTEGER, activity_title TEXT, points_reward INTEGER, status TEXT DEFAULT 'Đang chờ', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS hotlines (id SERIAL PRIMARY KEY, name TEXT, phone TEXT);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS surveys (id SERIAL PRIMARY KEY, title TEXT, description TEXT, questions JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS survey_responses (id SERIAL PRIMARY KEY, survey_id INTEGER, user_name TEXT, answers JSONB, submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS gift_redemptions (id SERIAL PRIMARY KEY, user_phone TEXT, user_name TEXT, gift_name TEXT, points_used INTEGER, redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);

        await pool.query(`CREATE TABLE IF NOT EXISTS connections (id SERIAL PRIMARY KEY, title TEXT, image TEXT, link TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS press (id SERIAL PRIMARY KEY, name TEXT, image TEXT, link TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS police (id SERIAL PRIMARY KEY, name TEXT, image TEXT, link TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS documents (id SERIAL PRIMARY KEY, name TEXT, image TEXT, link TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS reading (id SERIAL PRIMARY KEY, name TEXT, image TEXT, link TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);

        await pool.query(`CREATE TABLE IF NOT EXISTS banners (id SERIAL PRIMARY KEY, image_url TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS settings (id SERIAL PRIMARY KEY, setting_key VARCHAR(255) UNIQUE, setting_value TEXT);`);

        await pool.query(`ALTER TABLE gift_redemptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Chờ nhận quà';`).catch(() => console.log("Cột status đã tồn tại"));
        await pool.query(`CREATE TABLE IF NOT EXISTS point_history (id SERIAL PRIMARY KEY, phone TEXT, name TEXT, reason TEXT, points INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS admin_links (id SERIAL PRIMARY KEY, title TEXT, image TEXT, link TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS admin_submissions (id SERIAL PRIMARY KEY, phone TEXT, name TEXT, image TEXT, status TEXT DEFAULT 'Chờ xử lý', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS education_classes (id SERIAL PRIMARY KEY, title TEXT, description TEXT, location TEXT, image TEXT, points_reward INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS education_registrations (id SERIAL PRIMARY KEY, phone TEXT, name TEXT, class_id INTEGER, class_title TEXT, status TEXT DEFAULT 'Đang chờ', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);

        // BẢNG KINH TẾ - DU LỊCH
        await pool.query(`CREATE TABLE IF NOT EXISTS tourism_places (id SERIAL PRIMARY KEY, category TEXT, name TEXT, address TEXT, phone TEXT, description TEXT, image TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);

        // 🌟 CODE MỚI ĐỂ LƯU LINK MAP VÀ FANPAGE
        await pool.query(`ALTER TABLE tourism_places ADD COLUMN IF NOT EXISTS map_link TEXT;`).catch(() => console.log("Đã có map_link"));
        await pool.query(`ALTER TABLE tourism_places ADD COLUMN IF NOT EXISTS page_link TEXT;`).catch(() => console.log("Đã có page_link"));

        await pool.query(`
            CREATE TABLE IF NOT EXISTS utilities (
                id SERIAL PRIMARY KEY, 
                name TEXT, 
                image TEXT, 
                action_path TEXT, 
                order_index INTEGER DEFAULT 0, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`CREATE TABLE IF NOT EXISTS tourism_icons (category TEXT PRIMARY KEY, image TEXT);`);

        console.log("✅ Database đã sẵn sàng!");
    } catch (error) {
        console.error("🚨 Lỗi tạo CSDL:", error.message);
    }
};

initDB();

module.exports = pool;
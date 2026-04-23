const supabase = require('../config/supabaseConfig');

const BUCKET_NAME = 'apd_public_assets';

// ==========================================
// 1. HÀM UPLOAD ẢNH
// ==========================================
const uploadImageToSupabase = async (fileBuffer, originalName, mimeType, folder = 'utilities') => {
    try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Làm sạch tên file, tránh lỗi ký tự đặc biệt
        const cleanFileName = originalName.replace(/[^a-zA-Z0-9.]/g, "_");
        const filePath = `${folder}/${uniqueSuffix}-${cleanFileName}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, fileBuffer, {
                contentType: mimeType,
                upsert: false
            });

        if (error) throw error;

        // Lấy URL Public để lưu vào DB
        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        return publicUrlData.publicUrl;

    } catch (err) {
        console.error('Lỗi upload Supabase:', err.message);
        throw new Error('Không thể tải ảnh lên hệ thống lưu trữ.');
    }
};

// ==========================================
// 2. HÀM XÓA ẢNH (Cái chổi dọn rác)
// ==========================================
const deleteImageFromSupabase = async (imageUrl) => {
    try {
        if (!imageUrl) return;

        const parts = imageUrl.split(`${BUCKET_NAME}/`);
        if (parts.length < 2) return;

        const filePath = parts[1];

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

        if (error) {
            console.error("Lỗi khi xoá file trên Supabase:", error);
        }
    } catch (e) {
        console.error("Lỗi hệ thống khi dọn dẹp ảnh:", e);
    }
};

// CHỈ CÓ ĐÚNG 1 DÒNG EXPORT NÀY NẰM Ở CUỐI CÙNG THÔI NHÉ!
module.exports = { uploadImageToSupabase, deleteImageFromSupabase };
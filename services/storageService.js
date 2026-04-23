// file: services/storageService.js
const supabase = require('../config/supabaseConfig');
const sharp = require('sharp'); // ✅ Gọi thư viện nén ảnh

const BUCKET_NAME = 'apd_public_assets';

/**
 * 1. HÀM UPLOAD ẢNH (CÓ TÍCH HỢP NÉN SIÊU NHẸ)
 */
const uploadImageToSupabase = async (fileBuffer, originalName, mimeType, folder = 'utilities') => {
    try {
        // --- 🚀 BƯỚC NÉN ẢNH ---
        const compressedBuffer = await sharp(fileBuffer)
            .resize({
                width: 800, // Ép chiều rộng tối đa là 800px (Rất nét cho điện thoại/web)
                withoutEnlargement: true // Nếu ảnh gốc nhỏ hơn 800px thì giữ nguyên, không phóng to làm mờ
            })
            .jpeg({ quality: 80 }) // Đổi thành định dạng JPEG và giảm chất lượng còn 80%
            .toBuffer();

        // --- BƯỚC UPLOAD ---
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

        // Đổi đuôi tên file thành .jpg vì ta đã nén nó thành dạng JPEG ở trên
        const nameWithoutExt = originalName.replace(/[^a-zA-Z0-9]/g, "_").split('_').slice(0, -1).join('_') || 'image';
        const filePath = `${folder}/${uniqueSuffix}-${nameWithoutExt}.jpg`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, compressedBuffer, { // Lưu ý: dùng compressedBuffer thay vì fileBuffer gốc
                contentType: 'image/jpeg', // Lưu ý: báo cho Supabase đây là file JPEG
                upsert: false
            });

        if (error) throw error;

        // Lấy URL Public để lưu vào Database
        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        return publicUrlData.publicUrl;

    } catch (err) {
        console.error('Lỗi upload và nén Supabase:', err.message);
        throw new Error('Không thể tải ảnh lên hệ thống lưu trữ.');
    }
};

/**
 * 2. HÀM XÓA ẢNH (Giữ nguyên)
 */
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
            console.error("Lỗi khi xoá file trên Supabase:", error.message);
        } else {
            console.log("✅ Đã dọn dẹp ảnh trên Supabase:", filePath);
        }
    } catch (e) {
        console.error("Lỗi hệ thống khi dọn dẹp ảnh:", e.message);
    }
};

module.exports = { uploadImageToSupabase, deleteImageFromSupabase };
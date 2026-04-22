import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { containerStyle, tableStyle, thStyle, tdStyle, inputStyle, btnBlue, btnRed } from '../styles';

export default function DocumentTab() {
    const [documentList, setDocumentList] = useState([]);
    const [name, setName] = useState('');
    const [link, setLink] = useState('');
    const [image, setImage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State lưu ID đang sửa
    const [editId, setEditId] = useState(null);
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        try {
            const res = await axios.get('https://thanhloc-backend.onrender.com/api/documents');
            setDocumentList(res.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImage(reader.result);
            reader.readAsDataURL(file);
        }
    };

    // Hàm submit dùng chung cho Thêm và Sửa
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !link || !image) return alert("Vui lòng nhập đủ thông tin và logo minh hoạ!");
        setIsSubmitting(true);
        try {
            if (editId) {
                // Đang ở chế độ Sửa (PUT)
                await axios.put(`https://thanhloc-backend.onrender.com/api/documents/${editId}`, { name, image, link });
                alert("Cập nhật thành công!");
            } else {
                // Đang ở chế độ Thêm mới (POST)
                await axios.post('https://thanhloc-backend.onrender.com/api/documents', { name, image, link });
                alert("Thêm thành công!");
            }

            cancelEdit();
            fetchData();
        } catch (error) {
            alert("Lỗi khi lưu thông tin");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Hàm gọi khi bấm nút "Sửa" ở từng dòng
    const handleEditClick = (item) => {
        setEditId(item.id);
        setName(item.name);
        setLink(item.link);
        setImage(item.image);

        // Cuộn trang lên form nhập liệu
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Hàm huỷ bỏ trạng thái đang sửa
    const cancelEdit = () => {
        setEditId(null);
        setName('');
        setLink('');
        setImage('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Xóa liên kết này?")) {
            await axios.delete(`https://thanhloc-backend.onrender.com/api/documents/${id}`);
            fetchData();
        }
    };

    return (
        <div style={containerStyle}>
            <h2 style={{ color: editId ? '#f39c12' : '#2980b9', marginBottom: '20px' }}>
                {editId ? "✏️ Cập nhật Tra cứu văn bản" : "🔍 Quản lý Tra cứu văn bản"}
            </h2>

            <form onSubmit={handleSubmit} style={{
                display: 'flex', flexDirection: 'column', gap: '15px',
                backgroundColor: '#f9f9f9', padding: '25px', borderRadius: '8px',
                marginBottom: '30px', border: editId ? '2px solid #f39c12' : '1px solid #e0e0e0', maxWidth: '600px'
            }}>
                <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Tên trang tra cứu:</label>
                    <input type="text" placeholder="VD: Thư viện Pháp luật" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Đường dẫn (Link):</label>
                    <input type="text" placeholder="VD: https://thuvienphapluat.vn" value={link} onChange={(e) => setLink(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Logo minh hoạ (Chọn file mới nếu muốn đổi):</label>
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} style={{ width: '100%' }} />
                </div>

                {image && (
                    <div style={{ padding: '10px', backgroundColor: '#fff', border: '1px dashed #ccc', borderRadius: '5px', textAlign: 'center' }}>
                        <img src={image} alt="Preview" style={{ height: '60px', objectFit: 'contain' }} />
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" style={{ ...btnBlue, flex: 1, padding: '12px', fontSize: '15px', backgroundColor: editId ? '#f39c12' : '#3498db' }} disabled={isSubmitting}>
                        {isSubmitting ? "⏳ Đang lưu..." : (editId ? "💾 Cập nhật" : "➕ Thêm Mục Tra Cứu")}
                    </button>

                    {editId && (
                        <button type="button" onClick={cancelEdit} style={{ padding: '12px 20px', fontSize: '15px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '5px' }}>
                            ❌ Huỷ
                        </button>
                    )}
                </div>
            </form>

            <table style={tableStyle}>
                <thead>
                    <tr>
                        <th style={thStyle}>Logo</th>
                        <th style={thStyle}>Trang / Link</th>
                        <th style={thStyle}>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {documentList.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={tdStyle}>
                                <img src={item.image} style={{ height: '50px', objectFit: 'contain' }} alt="logo" />
                            </td>
                            <td style={tdStyle}>
                                <strong style={{ fontSize: '16px' }}>{item.name}</strong><br />
                                <a href={item.link} target="_blank" rel="noreferrer" style={{ color: '#3498db', fontSize: '13px', textDecoration: 'none' }}>{item.link}</a>
                            </td>
                            <td style={tdStyle}>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button onClick={() => handleEditClick(item)} style={{ ...btnBlue, padding: '8px 12px', margin: 0, backgroundColor: '#f39c12' }}>✏️ Sửa</button>
                                    <button onClick={() => handleDelete(item.id)} style={{ ...btnRed, padding: '8px 12px', margin: 0 }}>🗑️ Xóa</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
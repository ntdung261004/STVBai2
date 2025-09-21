from flask import Flask, render_template
from flask_socketio import SocketIO
# === BẮT ĐẦU PHẦN SỬA LỖI ===
# Import blueprint 'pi_bp' từ file pi_controller.py
from controllers.pi_controller import pi_bp
# === KẾT THÚC PHẦN SỬA LỖI ===
from flask_socketio import SocketIO

app = Flask(__name__)
# SECRET_KEY cần thiết cho SocketIO để quản lý session
app.config['SECRET_KEY'] = 'your_secret_key_here!' 
socketio = SocketIO(app, cors_allowed_origins="*")

# Đăng ký blueprint sau khi đã import
app.register_blueprint(pi_bp, url_prefix='/pi')

@app.route('/')
def index():
    """
    Route chính, hiển thị giao diện điều khiển.
    """
    return render_template('index.html')

# =================================================================
# THÊM MỚI: LẮNG NGHE SỰ KIỆN TỪ PI VÀ PHÁT CHO TRÌNH DUYỆT
# =================================================================
@socketio.on('update_ammo')
def handle_ammo_update(data):
    """
    Nhận sự kiện 'update_ammo' từ Pi và phát sự kiện 'ammo_updated' 
    cho tất cả các client (trình duyệt).
    """
    ammo = data.get('ammo')
    # Dùng broadcast=True để gửi cho tất cả client
    socketio.emit('ammo_updated', {'ammo': ammo})
    print(f"Server: Nhận và chuyển tiếp số đạn = {ammo}") # Log để kiểm tra
# =================================================================

if __name__ == '__main__':
    # Chạy ứng dụng với sự hỗ trợ của SocketIO
    # host='0.0.0.0' cho phép các thiết bị khác trong mạng truy cập
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
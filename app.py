# file: app.py
from flask import Flask, render_template
from flask_socketio import SocketIO
from controllers.pi_controller import pi_bp
import logging

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here!' 
socketio = SocketIO(app, cors_allowed_origins="*")

# --- THÊM 2 DÒNG TỐI ƯU LOG TẠI ĐÂY ---
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app.register_blueprint(pi_bp, url_prefix='/pi')

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('status_update')
def handle_status_update(data):
    """Nhận trạng thái từ Pi và chuyển tiếp y hệt cho giao diện."""
    print(f"Server: Chuyển tiếp trạng thái -> {data}")
    socketio.emit('status_updated', data)

@socketio.on('update_ammo')
def handle_ammo_update(data):
    """Nhận số đạn từ Pi và chuyển tiếp."""
    socketio.emit('ammo_updated', data)
    
@socketio.on('session_ended')
def handle_session_ended(data):
    """Nhận sự kiện kết thúc phiên từ Pi và chuyển tiếp cho giao diện."""
    print(f"Server: Chuyển tiếp sự kiện kết thúc phiên -> Lý do: {data.get('reason')}")
    socketio.emit('session_ended', data)
    
@socketio.on('new_shot_image')
def handle_new_shot(data):
    """Nhận ảnh đã xử lý từ Pi và chuyển tiếp cho giao diện."""
    # print(f"Server: Nhận ảnh phát bắn {data.get('shot_id')}, đang chuyển tiếp...")
    socketio.emit('display_new_shot', data)
    
@socketio.on('target_hit_update')
def handle_target_hit(data):
    """Nhận thông báo mục tiêu bị trúng từ Pi và chuyển tiếp cho giao diện."""
    print(f"Server: Chuyển tiếp thông báo trúng mục tiêu -> {data.get('target_name')}")
    socketio.emit('ui_target_hit', data)
    
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
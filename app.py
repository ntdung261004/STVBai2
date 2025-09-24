# file: app.py
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
# 1. Import blueprint trước
from controllers.pi_controller import pi_bp
import logging

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here!' 
socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=500000)

# 2. Đăng ký blueprint sau
app.register_blueprint(pi_bp, url_prefix='/pi')

# Tối ưu log
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

@app.route('/')
def index():
    return render_template('index.html')

# --- Các trình xử lý sự kiện giữ nguyên ---

@socketio.on('video_frame_from_pi')
def handle_video_frame(data):
    emit('video_frame_to_browser', data, broadcast=True, include_self=False)
    
@socketio.on('status_update')
def handle_status_update(data):
    socketio.emit('status_updated', data)

@socketio.on('update_ammo')
def handle_ammo_update(data):
    socketio.emit('ammo_updated', data)
    
@socketio.on('session_ended')
def handle_session_ended(data):
    socketio.emit('session_ended', data)
    
@socketio.on('new_shot_image')
def handle_new_shot(data):
    socketio.emit('display_new_shot', data)
    
@socketio.on('target_hit_update')
def handle_target_hit(data):
    socketio.emit('ui_target_hit', data)
    
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
# file: app.py
from flask import Flask, render_template
from flask_socketio import SocketIO
from controllers.pi_controller import pi_bp

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here!' 
socketio = SocketIO(app, cors_allowed_origins="*")

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

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
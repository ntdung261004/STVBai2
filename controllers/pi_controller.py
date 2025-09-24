# controllers/pi_controller.py
from flask import Blueprint, request, jsonify

# Khởi tạo Blueprint như bình thường
pi_bp = Blueprint('pi_bp', __name__)

@pi_bp.route('/command', methods=['POST'])
def handle_command():
    # **THAY ĐỔI QUAN TRỌNG**: Import socketio TẠI ĐÂY, bên trong hàm.
    # Điều này đảm bảo app.py đã được tải hoàn toàn trước khi import.
    from app import socketio
    
    data = request.get_json()
    command = {'type': data.get('type'), 'value': data.get('value')}
    
    try:
        # Gửi lệnh trực tiếp đến Pi qua sự kiện 'command_to_pi'
        socketio.emit('command_to_pi', command)
        return jsonify({'status': 'success', 'message': f"Lệnh '{command['type']}' đã được gửi."})
    except Exception as e:
        print(f"Lỗi khi gửi lệnh qua SocketIO: {e}")
        return jsonify({'status': 'error', 'message': 'Lỗi nội bộ khi gửi lệnh.'}), 500
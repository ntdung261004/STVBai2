# controllers/pi_controller.py
from flask import Blueprint, request, jsonify, Response
import threading
import time
import queue # Thêm thư viện hàng đợi

pi_bp = Blueprint('pi_bp', __name__)

# --- HÀNG ĐỢI LỆNH ---
# Hàng đợi này sẽ lưu các lệnh từ frontend gửi cho Pi
COMMAND_QUEUE = queue.Queue(maxsize=10)

class LivestreamManager:
    # ... (Nội dung lớp này giữ nguyên)
    def __init__(self):
        self.frame = None
        self.lock = threading.Lock()

    def update_frame(self, frame):
        with self.lock:
            self.frame = frame

    def generate_frames_for_client(self):
        while True:
            time.sleep(1/30)
            with self.lock:
                if self.frame is None:
                    continue
                frame_to_send = self.frame
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_to_send + b'\r\n')

livestream_manager = LivestreamManager()

@pi_bp.route('/video_upload', methods=['POST'])
def video_upload():
    frame_data = request.data
    if frame_data:
        livestream_manager.update_frame(frame_data)
        return ('', 204)
    return ('', 400)

@pi_bp.route('/video_feed')
def video_feed():
    return Response(livestream_manager.generate_frames_for_client(), 
                    mimetype='multipart/x-mixed-replace; boundary=frame')

# === BẮT ĐẦU PHẦN THÊM MỚI: API ĐIỀU KHIỂN ===

@pi_bp.route('/command', methods=['POST'])
def handle_command():
    """
    API endpoint chung để nhận lệnh từ frontend (zoom, hiệu chỉnh tâm).
    """
    data = request.get_json()
    command_type = data.get('type')
    command_value = data.get('value')

    if not command_type or command_value is None:
        return jsonify({'status': 'error', 'message': 'Dữ liệu không hợp lệ.'}), 400

    command = {'type': command_type, 'value': command_value}
    
    try:
        # Đưa lệnh vào hàng đợi để Pi có thể lấy
        COMMAND_QUEUE.put_nowait(command)
        return jsonify({'status': 'success', 'message': f'Đã gửi lệnh {command_type}'})
    except queue.Full:
        return jsonify({'status': 'error', 'message': 'Hàng đợi lệnh đang đầy.'}), 503

@pi_bp.route('/get_command', methods=['GET'])
def get_command():
    """
    API endpoint để Raspberry Pi hỏi và lấy lệnh mới nhất.
    """
    try:
        # Lấy lệnh từ hàng đợi mà không bị block
        command = COMMAND_QUEUE.get_nowait()
        return jsonify({'command': command})
    except queue.Empty:
        # Nếu không có lệnh, trả về không có lệnh
        return jsonify({'command': None})

# === KẾT THÚC PHẦN THÊM MỚI ===

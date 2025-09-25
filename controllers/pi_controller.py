# controllers/pi_controller.py
from flask import Blueprint, request, jsonify, Response
import threading
import time
import queue
import cv2
import numpy as np

pi_bp = Blueprint('pi_bp', __name__)

COMMAND_QUEUE = queue.Queue(maxsize=10)

def create_disconnect_image():
    """Tạo một khung hình màu đen với thông báo chờ tín hiệu."""
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    text = "Cho tin hieu tu camera..."
    font = cv2.FONT_HERSHEY_SIMPLEX
    text_size = cv2.getTextSize(text, font, 1, 2)[0]
    text_x = (img.shape[1] - text_size[0]) // 2
    text_y = (img.shape[0] + text_size[1]) // 2
    cv2.putText(img, text, (text_x, text_y), font, 1, (255, 255, 255), 2)
    _, buffer = cv2.imencode('.jpg', img)
    return buffer.tobytes()

class LivestreamManager:
    """
    Quản lý khung hình livestream từ Pi.
    Tự động hiển thị ảnh "mất kết nối" nếu không nhận được khung hình mới sau 2 giây.
    """
    def __init__(self):
        self.frame = None
        self.lock = threading.Lock()
        self.last_update_time = 0
        self.disconnected_image = create_disconnect_image()
        self.CONNECTION_TIMEOUT = 2.0  # Giây

    def update_frame(self, new_frame):
        with self.lock:
            self.frame = new_frame
            self.last_update_time = time.time()

    def generate_frames_for_client(self):
        while True:
            with self.lock:
                is_disconnected = (time.time() - self.last_update_time) > self.CONNECTION_TIMEOUT
                
                # Nếu mất kết nối hoặc chưa từng có khung hình nào
                if is_disconnected or self.frame is None:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + self.disconnected_image + b'\r\n')
                    time.sleep(0.5)  # Đợi một chút trước khi gửi lại ảnh disconnect
                    continue
                
                # Nếu kết nối bình thường, gửi khung hình nhận được
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + self.frame + b'\r\n')
            time.sleep(1/30) # Stream ở ~30 FPS

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

@pi_bp.route('/command', methods=['POST'])
def handle_command():
    data = request.get_json()
    command = {'type': data.get('type'), 'value': data.get('value')}
    try:
        COMMAND_QUEUE.put_nowait(command)
        return jsonify({'status': 'success'})
    except queue.Full:
        return jsonify({'status': 'error', 'message': 'Hàng đợi lệnh đầy.'}), 503

@pi_bp.route('/get_command', methods=['GET'])
def get_command():
    try:
        command = COMMAND_QUEUE.get_nowait()
        return jsonify({'status': 'success', 'command': command})
    except queue.Empty:
        return jsonify({'status': 'success', 'command': None})
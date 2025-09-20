document.addEventListener('DOMContentLoaded', function() {
    // --- KHAI BÁO ÂM THANH ---
    const startSound = new Audio('static/sounds/xuat_phat.mp3');
    const timesUpSound = new Audio('static/sounds/het_thoi_gian.mp3');

    // Tạo một đối tượng chứa tất cả âm thanh riêng của từng bia
    const targetSounds = {
        bia5_hien: new Audio('static/sounds/bia_so_5_hien.mp3'),
        bia5_an: new Audio('static/sounds/bia_so_5_an.mp3'),
        bia6_hien: new Audio('static/sounds/bia_so_6_hien.mp3'),
        bia6_an: new Audio('static/sounds/bia_so_6_an.mp3'),
        bia7b_hien: new Audio('static/sounds/bia_so_7b_hien.mp3'),
        bia7b_an: new Audio('static/sounds/bia_so_7b_an.mp3'),
        bia10_hien: new Audio('static/sounds/bia_so_10_hien.mp3'),
        bia10_an: new Audio('static/sounds/bia_so_10_an.mp3'),
        bia8c_hien: new Audio('static/sounds/bia_so_8c_hien.mp3'),
        bia8c_an: new Audio('static/sounds/bia_so_8c_an.mp3')
    };
    const targetsGrid = document.getElementById('targets-grid');
    const startBtn = document.getElementById('start-btn');
    if(startBtn) {
        startBtn.addEventListener('click', () => {
            console.log("Xuất phát...");
            startSound.play(); // ► PHÁT ÂM THANH XUẤT PHÁT

            startBtn.disabled = true;
            let timeLeft = 75; // 1 phút 15 giây = 75 giây
            const timerElement = document.getElementById('timer');

            // Lấy tham chiếu đến tất cả các khung bia
            const target1 = document.getElementById('target-1');
            const target2 = document.getElementById('target-2');
            const target3 = document.getElementById('target-3');
            const target4 = document.getElementById('target-4');
            const target5 = document.getElementById('target-5');
            const target6 = document.getElementById('target-6');

            const countdown = setInterval(() => {
                if (timeLeft < 0) {
                    clearInterval(countdown);
                    console.log("Hết giờ!");
                    timesUpSound.play(); // ► PHÁT ÂM THANH HẾT GIỜ
                    timerElement.textContent = '00:00';
                    return;
                }
                
                let minutes = Math.floor(timeLeft / 60);
                let seconds = timeLeft % 60;

                minutes = String(minutes).padStart(2, '0');
                seconds = String(seconds).padStart(2, '0');

                timerElement.textContent = `${minutes}:${seconds}`;
                
                // Kích hoạt/Tắt hiệu ứng cho từng khung bia
                
                // Khung 1
                if (timeLeft === 60) { 
                    target1.classList.add('flash');
                    targetSounds.bia6_hien.play(); // SỬA LỖI: Gọi âm thanh từ đối tượng targetSounds
                }
                if (timeLeft === 54) { 
                    target1.classList.remove('flash'); 
                    target1.classList.add('hit-completed'); 
                    targetSounds.bia6_an.play(); // SỬA LỖI
                }

                // Khung 2
                if (timeLeft === 51) { 
                    target2.classList.add('flash'); 
                    targetSounds.bia5_hien.play(); // SỬA LỖI
                }
                if (timeLeft === 45) { 
                    target2.classList.remove('flash'); 
                    target2.classList.add('hit-completed'); 
                    targetSounds.bia5_an.play(); // SỬA LỖI
                }

                // Khung 3
                if (timeLeft === 35) { 
                    target3.classList.add('flash'); 
                    targetSounds.bia10_hien.play(); // SỬA LỖI
                }
                if (timeLeft === 30) { 
                    target3.classList.remove('flash'); 
                    target3.classList.add('hit-completed'); 
                    targetSounds.bia10_an.play(); // SỬA LỖI
                }

                // Khung 4
                if (timeLeft === 27) { 
                    target4.classList.add('flash'); 
                    targetSounds.bia7b_hien.play(); // SỬA LỖI
                }
                if (timeLeft === 22) { 
                    target4.classList.remove('flash'); 
                    target4.classList.add('hit-completed');
                    targetSounds.bia7b_an.play();  // SỬA LỖI
                }
                
                // Khung 5 & 6
                if (timeLeft === 7) { 
                    target5.classList.add('flash'); 
                    target6.classList.add('flash'); 
                    targetSounds.bia8c_hien.play(); // SỬA LỖI
                }
                if (timeLeft === 0) { 
                    target5.classList.remove('flash'); 
                    target5.classList.add('hit-completed'); 
                    target6.classList.remove('flash'); 
                    target6.classList.add('hit-completed'); 
                }

                timeLeft--;

            }, 1000);
        });
    }
    const targets = [
    { img: 'static/images/targets/bia_so_6.png', name: 'Bia số 6' },
    { img: 'static/images/targets/bia_so_5.png', name: 'Bia số 5' },
    { img: 'static/images/targets/bia_so_10.png', name: 'Bia số 10' },
    { img: 'static/images/targets/bia_so_7b.png', name: 'Bia số 7b' },
    { img: 'static/images/targets/bia_so_8c.png', name: 'Bia số 8c ngang' },
    { img: 'static/images/targets/bia_so_8c.png', name: 'Bia số 8c chếch' }
    ];

    function createTargetPlaceholders() {
    targetsGrid.innerHTML = '';
    targets.forEach((target, index) => {
        const targetWrapper = document.createElement('div');
        targetWrapper.className = 'col d-flex flex-column align-items-center';

        targetWrapper.innerHTML = `
        <div class="target-card" id="target-${index+1}">
            <img src="${target.img}" alt="${target.name}">
        </div>
        <div class="target-name">${target.name}</div>
        `;
        targetsGrid.appendChild(targetWrapper);
    });
    }

// === BẮT ĐẦU PHẦN THÊM MỚI: LOGIC ĐIỀU KHIỂN ===
    const calibrateBtn = document.getElementById('calibrate-btn');
    const videoFeed = document.getElementById('video-feed');
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomValue = document.getElementById('zoom-value');

    // Biến trạng thái để biết khi nào đang ở chế độ hiệu chỉnh
    let isCalibrating = false;

    /**
     * Hàm helper để gửi lệnh đến server
     * @param {string} type - Loại lệnh ('zoom' hoặc 'center')
     * @param {any} value - Giá trị của lệnh
     */
    async function sendCommand(type, value) {
        try {
            const response = await fetch('/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: type, value: value })
            });
            if (!response.ok) {
                console.error('Gửi lệnh thất bại!');
            }
        } catch (error) {
            console.error('Lỗi khi gửi lệnh:', error);
        }
    }

    // Sự kiện cho nút "Hiệu chỉnh tâm"
    if (calibrateBtn) {
        calibrateBtn.addEventListener('click', () => {
            isCalibrating = !isCalibrating; // Bật/tắt chế độ
            videoFeed.style.cursor = isCalibrating ? 'crosshair' : 'default';
            calibrateBtn.classList.toggle('btn-success', isCalibrating);
            calibrateBtn.classList.toggle('btn-warning', !isCalibrating);
        });
    }

    // Sự kiện click trên khung video để lấy tọa độ
    if (videoFeed) {
        videoFeed.addEventListener('click', (event) => {
            if (!isCalibrating) return; // Chỉ hoạt động khi đang ở chế độ hiệu chỉnh

            const rect = videoFeed.getBoundingClientRect();
            // Tính toán tọa độ tương đối (từ 0.0 đến 1.0) để không phụ thuộc vào kích thước video
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;

            // Gửi tọa độ đã chuẩn hóa về server
            sendCommand('center', { x: x, y: y });

            // Tự động tắt chế độ hiệu chỉnh sau khi đã chọn
            isCalibrating = false;
            videoFeed.style.cursor = 'default';
            calibrateBtn.classList.remove('btn-success');
            calibrateBtn.classList.add('btn-warning');
        });
    }
    
    // Sự kiện cho thanh trượt Zoom
    if (zoomSlider) {
        // Gửi lệnh khi người dùng thay đổi giá trị
        zoomSlider.addEventListener('input', () => {
            const zoomLevel = parseFloat(zoomSlider.value);
            zoomValue.textContent = `${zoomLevel.toFixed(1)}x`;
            sendCommand('zoom', zoomLevel);
        });
    }
    // === KẾT THÚC PHẦN THÊM MỚI ===

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            console.log("Resetting session...");
            // Cách đơn giản và hiệu quả nhất để reset là tải lại trang
            location.reload();
        });
    }

    // --- KHỞI CHẠY ---
    createTargetPlaceholders();
});
// file: static/js/main.js

document.addEventListener('DOMContentLoaded', function() {
    // --- KHAI BÁO CÁC PHẦN TỬ GIAO DIỆN (DOM ELEMENTS) ---
    const videoFeed = document.getElementById('video-feed');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomValue = document.getElementById('zoom-value');
    const calibrateBtn = document.getElementById('calibrate-btn');
    const timerElement = document.getElementById('timer');
    const targetsGrid = document.getElementById('targets-grid');
    const ammoCountElement = document.getElementById('ammo-count');
    const videoStatusEl = document.getElementById('video-status');
    const triggerStatusEl = document.getElementById('trigger-status');

    // **THÊM MỚI: Khai báo các phần tử của Modal**
    const sessionErrorModalEl = document.getElementById('session-error-modal');
    const sessionErrorModal = new bootstrap.Modal(sessionErrorModalEl);
    const modalErrorMessageEl = document.getElementById('modal-error-message');
    const modalResetButton = document.getElementById('modal-reset-button');

    let isCalibrating = false;

    // --- BIẾN QUẢN LÝ TRẠNG THÁI HỆ THỐNG ---
    const systemStatus = {
        video: false,
        trigger: false
    };
    let isSessionActive = false;
    let timerInterval = null;
    /**
     * Cập nhật giao diện (icon và text) cho trạng thái của một thành phần.
     * @param {HTMLElement} element - Element cha chứa icon và text.
     * @param {string} componentName - Tên thành phần (vd: "Video").
     * @param {boolean} isReady - Trạng thái sẵn sàng.
     */
    function updateStatusUI(element, componentName, isReady) {
        if (!element) return;
        const icon = element.querySelector('.status-icon');
        const textEl = element.querySelector('.status-text');
        
        icon.classList.toggle('text-success', isReady);
        icon.classList.toggle('text-danger', !isReady);
        textEl.textContent = isReady ? `${componentName} đã sẵn sàng` : `Đang chờ ${componentName}...`;
    }

    /**
     * Kiểm tra trạng thái tổng thể và bật/tắt nút "Xuất phát".
     */
    function checkSystemReady() {
        if (isSessionActive) {
            // Nếu phiên đang diễn ra, nút Xuất phát LUÔN BỊ VÔ HIỆU HÓA
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fa-solid fa-hourglass-start me-2"></i>Đang bắn...';
        } else if (systemStatus.video && systemStatus.trigger) {
            // Nếu không có phiên nào và thiết bị sẵn sàng, KÍCH HOẠT nút
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fa-solid fa-play me-2"></i>Xuất phát';
        } else {
            // Nếu không có phiên và thiết bị chưa sẵn sàng, VÔ HIỆU HÓA nút
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fa-solid fa-hourglass-half me-2"></i>Đang chờ...';
        }
    }

    // --- KHAI BÁO CÁC FILE ÂM THANH ---
    const startSound = new Audio('/static/sounds/xuat_phat.mp3');
    const timesUpSound = new Audio('/static/sounds/het_thoi_gian.mp3');
    const targetSounds = {
        bia5_hien: new Audio('/static/sounds/bia_so_5_hien.mp3'),
        bia5_an: new Audio('/static/sounds/bia_so_5_an.mp3'),
        bia6_hien: new Audio('/static/sounds/bia_so_6_hien.mp3'),
        bia6_an: new Audio('/static/sounds/bia_so_6_an.mp3'),
        bia7b_hien: new Audio('/static/sounds/bia_so_7b_hien.mp3'),
        bia7b_an: new Audio('/static/sounds/bia_so_7b_an.mp3'),
        bia10_hien: new Audio('/static/sounds/bia_so_10_hien.mp3'),
        bia10_an: new Audio('/static/sounds/bia_so_10_an.mp3'),
        bia8c_hien: new Audio('/static/sounds/bia_so_8c_hien.mp3'),
        bia8c_an: new Audio('/static/sounds/bia_so_8c_an.mp3')
    };

    /**
     * Gửi lệnh (zoom, center, start) tới server để Pi xử lý.
     * @param {string} type - Loại lệnh.
     * @param {any} value - Giá trị của lệnh.
     */
    async function sendCommand(type, value) {
        console.log(`Gửi lệnh: ${type}`, value);
        try {
            const response = await fetch('/pi/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, value })
            });
            if (!response.ok) {
                console.error('Lỗi khi gửi lệnh, server phản hồi:', response.statusText);
            }
        } catch (error) {
            console.error('Không thể kết nối tới server để gửi lệnh:', error);
        }
    }

    // --- KẾT NỐI SOCKET.IO VÀ LẮNG NGHE SỰ KIỆN TỪ SERVER ---
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on('connect', () => console.log('✅ Giao diện đã kết nối SocketIO!'));

    socket.on('disconnect', () => {
        systemStatus.video = false;
        systemStatus.trigger = false;
        isSessionActive = false; // Reset trạng thái phiên khi mất kết nối
        updateStatusUI(videoStatusEl, 'Video', false);
        updateStatusUI(triggerStatusEl, 'Cò', false);
        checkSystemReady();
    });

    socket.on('ammo_updated', function(data) {
        if (ammoCountElement) {
            ammoCountElement.textContent = `${data.ammo} / 16`;
        }
    });

    // **SỬA ĐỔI: Thêm logic xử lý lỗi vào sự kiện status_updated**
    socket.on('status_updated', function(data) {
        const { component, status } = data;
        const isReady = (status === 'ready');

        // **LOGIC MỚI: Nếu đang trong phiên tập mà có thiết bị mất kết nối**
        if (isSessionActive && !isReady) {
            const deviceName = (component === 'video') ? 'Camera' : 'Cò bắn';
            modalErrorMessageEl.textContent = `Mất kết nối với ${deviceName}. Phiên tập sẽ được hủy và khởi động lại.`;
            
            // Hiển thị modal
            sessionErrorModal.show();

            // Gửi lệnh reset về Pi để hủy phiên
            sendCommand('reset', true);
            
            // Dừng mọi timer đang chạy trên giao diện
            if (timerInterval) clearInterval(timerInterval);

            // Dừng xử lý thêm để tránh cập nhật giao diện không cần thiết
            return; 
        }

        // Logic cũ: Cập nhật trạng thái và nút bấm khi không trong phiên tập
        if (component === 'video') systemStatus.video = isReady;
        else if (component === 'trigger') systemStatus.trigger = isReady;
        
        updateStatusUI(component === 'video' ? videoStatusEl : triggerStatusEl, component === 'video' ? 'Video' : 'Cò', isReady);
        checkSystemReady();
    });

    if (modalResetButton) {
        modalResetButton.addEventListener('click', () => {
            // Chỉ cần tải lại trang, vì lệnh reset đã được gửi đi khi modal hiện ra
            location.reload();
        });
    }

    // --- CÁC SỰ KIỆN NÚT BẤM VÀ TƯƠNG TÁC ---
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            sendCommand('start', true); 
            isSessionActive = true;
            checkSystemReady();
            if (ammoCountElement) {
                ammoCountElement.textContent = '16 / 16';
            }
            startSound.play();
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fa-solid fa-hourglass-start me-2"></i>Đang bắn...';
            runTargetSequence(); 
        });
    }
    
    if (calibrateBtn) {
        calibrateBtn.addEventListener('click', () => {
            isCalibrating = !isCalibrating;
            videoFeed.style.cursor = isCalibrating ? 'crosshair' : 'default';
            calibrateBtn.classList.toggle('btn-success', isCalibrating);
            calibrateBtn.classList.toggle('btn-warning', !isCalibrating);
        });
    }

    if (videoFeed) {
        videoFeed.addEventListener('click', (event) => {
            if (!isCalibrating) return;
            const rect = videoFeed.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            sendCommand('center', { x, y });
            isCalibrating = false;
            videoFeed.style.cursor = 'default';
            calibrateBtn.classList.remove('btn-success');
            calibrateBtn.classList.add('btn-warning');
        });
    }
    
    if (zoomSlider) {
        zoomSlider.addEventListener('input', () => {
            const zoomLevel = parseFloat(zoomSlider.value);
            zoomValue.textContent = `${zoomLevel.toFixed(1)}x`;
            sendCommand('zoom', zoomLevel);
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            console.log("Nút Reset được nhấn, gửi lệnh 'reset' đến Pi.");
            // Gửi lệnh yêu cầu Pi hủy phiên tập hiện tại
            isSessionActive = false;
            if(timerInterval) clearInterval(timerInterval);
            sendCommand('reset', true);
            
            // Đợi một chút để lệnh được gửi đi rồi mới tải lại trang
            setTimeout(() => {
                location.reload();
            }, 200); // Đợi 200ms
        });
    }

    // --- LOGIC CHÍNH CỦA BÀI BẮN (GIỮ NGUYÊN CỦA BẠN) ---
    function runTargetSequence() {
        let timeLeft = 75;
        const countdown = setInterval(() => {
            if (timeLeft < 0) {
                clearInterval(countdown);
                timesUpSound.play();
                timerElement.textContent = '00:00';
                // Kích hoạt lại nút Xuất phát khi hết giờ
                startBtn.disabled = false; 
                startBtn.innerHTML = '<i class="fa-solid fa-play me-2"></i>Bắt đầu lại';
                return;
            }
            
            let minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
            let seconds = String(timeLeft % 60).padStart(2, '0');
            timerElement.textContent = `${minutes}:${seconds}`;

            // Lấy các element của mặt bia
            const targetElements = {
                t1: document.getElementById('target-1'), t2: document.getElementById('target-2'),
                t3: document.getElementById('target-3'), t4: document.getElementById('target-4'),
                t5: document.getElementById('target-5'), t6: document.getElementById('target-6')
            };

            // Dòng thời gian hiện/ẩn bia và phát âm thanh
            if (timeLeft === 60) { targetElements.t1.classList.add('flash'); targetSounds.bia6_hien.play(); }
            if (timeLeft === 54) { targetElements.t1.classList.remove('flash'); targetElements.t1.classList.add('hit-completed'); targetSounds.bia6_an.play(); }
            if (timeLeft === 51) { targetElements.t2.classList.add('flash'); targetSounds.bia5_hien.play(); }
            if (timeLeft === 45) { targetElements.t2.classList.remove('flash'); targetElements.t2.classList.add('hit-completed'); targetSounds.bia5_an.play(); }
            if (timeLeft === 35) { targetElements.t3.classList.add('flash'); targetSounds.bia10_hien.play(); }
            if (timeLeft === 30) { targetElements.t3.classList.remove('flash'); targetElements.t3.classList.add('hit-completed'); targetSounds.bia10_an.play(); }
            if (timeLeft === 27) { targetElements.t4.classList.add('flash'); targetSounds.bia7b_hien.play(); }
            if (timeLeft === 22) { targetElements.t4.classList.remove('flash'); targetElements.t4.classList.add('hit-completed'); targetSounds.bia7b_an.play(); }
            if (timeLeft === 7)  { targetElements.t5.classList.add('flash'); targetElements.t6.classList.add('flash'); targetSounds.bia8c_hien.play(); }
            if (timeLeft === 0)  { 
                targetElements.t5.classList.remove('flash'); targetElements.t5.classList.add('hit-completed'); 
                targetElements.t6.classList.remove('flash'); targetElements.t6.classList.add('hit-completed'); 
                targetSounds.bia8c_an.play();
            }

            timeLeft--;
        }, 1000);
    }

    // --- HÀM KHỞI TẠO GIAO DIỆN BAN ĐẦU ---
    function createTargetPlaceholders() {
        const targets = [
            { img: '/static/images/targets/bia_so_6.png', name: 'Bia số 6' },
            { img: '/static/images/targets/bia_so_5.png', name: 'Bia số 5' },
            { img: '/static/images/targets/bia_so_10.png', name: 'Bia số 10' },
            { img: '/static/images/targets/bia_so_7b.png', name: 'Bia số 7b' },
            { img: '/static/images/targets/bia_so_8c.png', name: 'Bia số 8c ngang' },
            { img: '/static/images/targets/bia_so_8c.png', name: 'Bia số 8c chếch' }
        ];
        targetsGrid.innerHTML = '';
        targets.forEach((target, index) => {
            const targetWrapper = document.createElement('div');
            targetWrapper.className = 'col d-flex flex-column align-items-center';
            targetWrapper.innerHTML = `
                <div class="target-card" id="target-${index+1}">
                    <img src="${target.img}" alt="${target.name}">
                </div>
                <div class="target-name">${target.name}</div>`;
            targetsGrid.appendChild(targetWrapper);
        });
    }

    // --- CHẠY CÁC HÀM KHỞI TẠO ---
    checkSystemReady();
    createTargetPlaceholders();
});
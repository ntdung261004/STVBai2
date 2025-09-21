// file: static/js/main.js

document.addEventListener('DOMContentLoaded', function() {
    // --- KHAI BÁO CÁC PHẦN TỬ DOM ---
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
    let isCalibrating = false;

    // --- BIẾN TRẠNG THÁI HỆ THỐNG ---
    const systemStatus = {
        video: false,
        trigger: false
    };
    function updateStatusUI(element, componentName, isReady) {
        if (!element) return;
        const icon = element.querySelector('.status-icon');
        const textEl = element.querySelector('.status-text');
        icon.classList.toggle('text-success', isReady);
        icon.classList.toggle('text-danger', !isReady);
        textEl.textContent = isReady ? `${componentName} đã sẵn sàng` : `Đang chờ ${componentName}...`;
    }

    function checkSystemReady() {
        if (systemStatus.video && systemStatus.trigger) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fa-solid fa-play me-2"></i>Xuất phát';
        } else {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fa-solid fa-hourglass-half me-2"></i>Đang chờ...';
        }
    }

    // --- KHAI BÁO ÂM THANH ---
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
     * HÀM GỬI LỆNH CHUNG TỚI SERVER
     * @param {string} type - Loại lệnh ('zoom', 'center', 'start')
     * @param {any} value - Giá trị của lệnh
     */
    async function sendCommand(type, value) {
        console.log(`Gửi lệnh: ${type}`, value);
        try {
            const response = await fetch('/pi/command', { // <-- SỬA LẠI URL CHO ĐÚNG BLUEPRINT
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, value })
            });
            if (response.ok) {
                const data = await response.json();
                console.log('Phản hồi từ server:', data.message);
            } else {
                console.error('Lỗi khi gửi lệnh, server phản hồi:', response.statusText);
            }
        } catch (error) {
            console.error('Không thể kết nối tới server để gửi lệnh:', error);
        }
    }

    // =================================================================
    // THÊM MỚI: KẾT NỐI SOCKETIO VÀ LẮNG NGHE SỰ KIỆN
    // =================================================================
    // Kết nối tới server qua SocketIO
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on('connect', () => console.log('✅ Giao diện đã kết nối SocketIO!'));

    socket.on('disconnect', () => {
        console.error('⚠️ Mất kết nối tới server!');
        // Khi mất kết nối server, reset tất cả trạng thái
        systemStatus.video = false;
        systemStatus.trigger = false;
        updateStatusUI(videoStatusEl, 'Video', false);
        updateStatusUI(triggerStatusEl, 'Cò', false);
        checkSystemReady();
    });

    // Lắng nghe sự kiện 'ammo_updated' từ server
    socket.on('ammo_updated', function(data) {
        console.log('Nhận được số đạn mới:', data.ammo);
        if (ammoCountElement) {
            ammoCountElement.textContent = (data.ammo + ' / 16');
        }
    });

    socket.on('status_updated', function(data) {
        const { component, status } = data;
        const isReady = (status === 'ready');

        if (component === 'video') {
            systemStatus.video = isReady;
            updateStatusUI(videoStatusEl, 'Video', isReady);
        } else if (component === 'trigger') {
            systemStatus.trigger = isReady;
            updateStatusUI(triggerStatusEl, 'Cò', isReady);
        }
        checkSystemReady();
    });
    // =================================================================


    // =================================================================
    // SỬA ĐỔI: SỰ KIỆN CHO NÚT XUẤT PHÁT
    // =================================================================
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            console.log("Nút Xuất phát được nhấn.");
            
            // 1. Gửi lệnh 'start' đến server cho Pi
            sendCommand('start', true); 
            // **SỬA ĐỔI**: Reset số đạn trên giao diện về 16 ngay khi nhấn
            if (ammoCountElement) {
                ammoCountElement.textContent = '16 / 16';
            }
            // 2. Bắt đầu các hiệu ứng trên giao diện
            startSound.play();
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fa-solid fa-hourglass-start me-2"></i>Đang bắn...';
            
            // 3. Khởi chạy timer và logic hiện bia (giữ nguyên logic của bạn)
            runTargetSequence(); 
        });
    }
    // =================================================================
    
    // Hàm chạy timer và trình tự bia (tách ra từ code gốc của bạn)
    function runTargetSequence() {
        let timeLeft = 75;
        const countdown = setInterval(() => {
            if (timeLeft < 0) {
                clearInterval(countdown);
                timesUpSound.play();
                timerElement.textContent = '00:00';
                return;
            }
            
            let minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
            let seconds = String(timeLeft % 60).padStart(2, '0');
            timerElement.textContent = `${minutes}:${seconds}`;

            // Logic hiện/ẩn bia của bạn...
            const targetElements = {
                t1: document.getElementById('target-1'),
                t2: document.getElementById('target-2'),
                t3: document.getElementById('target-3'),
                t4: document.getElementById('target-4'),
                t5: document.getElementById('target-5'),
                t6: document.getElementById('target-6')
            };

            if (timeLeft === 60) { targetElements.t1.classList.add('flash'); targetSounds.bia6_hien.play(); }
            if (timeLeft === 54) { targetElements.t1.classList.remove('flash'); targetElements.t1.classList.add('hit-completed'); targetSounds.bia6_an.play(); }
            if (timeLeft === 51) { targetElements.t2.classList.add('flash'); targetSounds.bia5_hien.play(); }
            if (timeLeft === 45) { targetElements.t2.classList.remove('flash'); targetElements.t2.classList.add('hit-completed'); targetSounds.bia5_an.play(); }
            if (timeLeft === 35) { targetElements.t3.classList.add('flash'); targetSounds.bia10_hien.play(); }
            if (timeLeft === 30) { targetElements.t3.classList.remove('flash'); targetElements.t3.classList.add('hit-completed'); targetSounds.bia10_an.play(); }
            if (timeLeft === 27) { targetElements.t4.classList.add('flash'); targetSounds.bia7b_hien.play(); }
            if (timeLeft === 22) { targetElements.t4.classList.remove('flash'); targetElements.t4.classList.add('hit-completed'); targetSounds.bia7b_an.play(); }
            if (timeLeft === 7)  { targetElements.t5.classList.add('flash'); targetElements.t6.classList.add('flash'); targetSounds.bia8c_hien.play(); }
            if (timeLeft === 0)  { targetElements.t5.classList.remove('flash'); targetElements.t5.classList.add('hit-completed'); targetElements.t6.classList.remove('flash'); targetElements.t6.classList.add('hit-completed'); }

            timeLeft--;
        }, 1000);
    }

    // --- CÁC SỰ KIỆN KHÁC (Hiệu chỉnh, Zoom, Reset - giữ nguyên) ---
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
        resetBtn.addEventListener('click', () => location.reload());
    }

    // --- KHỞI TẠO GIAO DIỆN ---
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
    checkSystemReady();
    createTargetPlaceholders();
});
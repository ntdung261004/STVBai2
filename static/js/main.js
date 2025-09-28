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

    // **THÊM MỚI: Khai báo các phần tử của Modal Kết thúc Phiên**
    const sessionEndModalEl = document.getElementById('session-end-modal');
    const sessionEndModal = new bootstrap.Modal(sessionEndModalEl);
    const modalEndReasonEl = document.getElementById('modal-end-reason');
    const modalReloadButton = document.getElementById('modal-reload-button');
    // **THÊM MỚI: Khai báo các phần tử của Trình xem ảnh trong Modal**
    const shotReviewImage = document.getElementById('shot-review-image');
    const shotCounter = document.getElementById('shot-counter');
    const prevShotBtn = document.getElementById('prev-shot-btn');
    const nextShotBtn = document.getElementById('next-shot-btn');

    // **THÊM MỚI: Khai báo các phần tử của Modal Kết quả**
    const modalHitCount = document.getElementById('modal-hit-count');
    const modalAchievementBadge = document.getElementById('modal-achievement-badge');
    // **THÊM MỚI:**
    const modalLoadingState = document.getElementById('modal-loading-state');
    const modalResultsContent = document.getElementById('modal-results-content');

    // **THÊM MỚI: Hằng số để map tên mục tiêu từ AI sang ID của giao diện**
    const TARGET_NAME_TO_UI_ID_MAP = {
        'bia_so_6': 'target-1',
        'bia_so_5': 'target-2',
        'bia_so_10': 'target-3',
        'bia_so_7b': 'target-4',
        // Bia 8c có 2 mục tiêu trên giao diện
        'bia_so_8c': ['target-5', 'target-6'] 
    };
    let isLoadingResults = false;
    let isCalibrating = false;
    let capturedShots = [];
    let currentShotIndex = 0;

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
        // **SỬA ĐỔI:** Thêm điều kiện `isLoadingResults`
        if (isSessionActive || isLoadingResults) {
            startBtn.disabled = true;
            if (isSessionActive) {
                startBtn.innerHTML = '<i class="fa-solid fa-hourglass-start me-2"></i>Đang bắn...';
            } else { // Tức là isLoadingResults = true
                startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang xử lý...';
            }
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

    socket.on('display_new_shot', function(data) {
        console.log(`Nhận được ảnh cho phát bắn ${data.shot_id}`);
        capturedShots.push(data.image_data);
    });

    // **THAY THẾ HOÀN TOÀN HÀM NÀY**
    socket.on('session_ended', function(data) {
        console.log('✅ Nhận lệnh kết thúc phiên. Bắt đầu xử lý kết quả.');
        isSessionActive = false;
        isLoadingResults = true;
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        // 1. Vô hiệu hóa nút Xuất phát và cập nhật trạng thái ngay lập tức
        checkSystemReady();

        // 2. Hiển thị Modal ở trạng thái "Loading" NGAY LẬP TỨC
        modalLoadingState.style.display = 'block';
        modalResultsContent.style.display = 'none';
        sessionEndModal.show();

        // 3. Bắt đầu quá trình kiểm tra ảnh nền và xử lý kết quả
        const processResults = () => {
            // Nếu ảnh chưa về đủ, chờ 100ms nữa rồi kiểm tra lại
            if (capturedShots.length < data.total_shots) {
                setTimeout(processResults, 100);
                return;
            }

            // 4. Đã có đủ dữ liệu, cập nhật nội dung và chuyển view
            console.log('Đã nhận đủ ảnh. Cập nhật nội dung modal.');

            // Điền dữ liệu lý do kết thúc
            let reasonText = 'Phiên tập đã hoàn thành!';
            if (data.reason === 'Hết thời gian') reasonText = 'Bạn đã hết thời gian.';
            else if (data.reason === 'Hết đạn') reasonText = 'Bạn đã bắn hết đạn.';
            modalEndReasonEl.textContent = reasonText;

            // Điền dữ liệu thống kê
            modalHitCount.textContent = `${data.hit_count} / 6`;
            // **THÊM MỚI: Logic hiển thị danh sách mục tiêu trúng**
            const modalHitList = document.getElementById('modal-hit-list');
            modalHitList.innerHTML = ''; // Xóa danh sách cũ

            // Tạo một map để chuyển tên AI sang tên hiển thị cho đẹp
            const TARGET_DISPLAY_NAMES = {
                'bia_so_6': 'Bia số 6',
                'bia_so_5': 'Bia số 5',
                'bia_so_10': 'Bia số 10',
                'bia_so_7b': 'Bia số 7b',
                'bia_so_8c': 'Bia số 8c'
            };

            if (data.hit_target_names && data.hit_target_names.length > 0) {
                data.hit_target_names.forEach(targetName => {
                    const displayName = TARGET_DISPLAY_NAMES[targetName] || targetName;
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-success me-1'; // Dùng màu xanh cho đồng bộ
                    badge.textContent = displayName;
                    modalHitList.appendChild(badge);
                });
            } else {
                modalHitList.textContent = 'Không trúng mục tiêu nào.';
            }
            modalAchievementBadge.textContent = data.achievement;

            // Đổi màu huy hiệu thành tích
            modalAchievementBadge.className = 'badge rounded-pill fs-6'; // Reset class
            switch (data.achievement) {
                case 'Giỏi': modalAchievementBadge.classList.add('bg-success'); break;
                case 'Khá': modalAchievementBadge.classList.add('bg-primary'); break;
                case 'Đạt': modalAchievementBadge.classList.add('bg-info'); break;
                case 'Không đạt': modalAchievementBadge.classList.add('bg-danger'); break;
                default: modalAchievementBadge.classList.add('bg-secondary');
            }

            // Cập nhật trình xem ảnh
            currentShotIndex = 0;
            updateShotReviewUI();

            // Chuyển từ loading sang hiển thị kết quả
            modalLoadingState.style.display = 'none';
            modalResultsContent.style.display = 'block';

            // 5. Đánh dấu đã xử lý xong và kích hoạt lại nút bấm
            isLoadingResults = false;
            checkSystemReady(); // Gọi lại để cập nhật nút Xuất phát -> Bắn lại
        };

        // Bắt đầu chạy hàm xử lý
        processResults();
    });

    // **THÊM MỚI: Lắng nghe sự kiện khi có mục tiêu bị bắn trúng**
    socket.on('ui_target_hit', function(data) {
        const targetName = data.target_name;
        console.log(`🎯 Giao diện nhận được thông báo trúng: ${targetName}`);

        const uiIds = TARGET_NAME_TO_UI_ID_MAP[targetName];
        if (!uiIds) return;

        const idsToUpdate = Array.isArray(uiIds) ? uiIds : [uiIds];

        idsToUpdate.forEach(id => {
            const targetEl = document.getElementById(id);
            if (targetEl) {
                // **SỬA ĐỔI QUAN TRỌNG:**
                targetEl.classList.remove('flash'); // Dừng nhấp nháy ngay lập tức
                targetEl.classList.add('hit');      // Chuyển sang màu xanh lá
            }
        });
    });

    function updateShotReviewUI() {
        const totalShots = capturedShots.length;
        if (totalShots === 0) {
            shotReviewImage.style.display = 'none'; // Ẩn khung ảnh
            shotCounter.textContent = 'Không có phát bắn nào';
            prevShotBtn.disabled = true;
            nextShotBtn.disabled = true;
            return;
        }

        shotReviewImage.style.display = 'block'; // Hiện khung ảnh
        shotReviewImage.src = capturedShots[currentShotIndex];
        shotCounter.textContent = `Ảnh ${currentShotIndex + 1} / ${totalShots}`;

        // Bật/tắt nút "Trước", "Sau"
        prevShotBtn.disabled = (currentShotIndex === 0);
        nextShotBtn.disabled = (currentShotIndex >= totalShots - 1);
    }

    // **THÊM MỚI: Gán sự kiện cho các nút điều khiển ảnh**
    if (prevShotBtn) {
        prevShotBtn.addEventListener('click', () => {
            if (currentShotIndex > 0) {
                currentShotIndex--;
                updateShotReviewUI();
            }
        });
    }

    if (nextShotBtn) {
        nextShotBtn.addEventListener('click', () => {
            if (currentShotIndex < capturedShots.length - 1) {
                currentShotIndex++;
                updateShotReviewUI();
            }
        });
    }

    if (modalResetButton) {
        modalResetButton.addEventListener('click', () => {
            // Chỉ cần tải lại trang, vì lệnh reset đã được gửi đi khi modal hiện ra
            location.reload();
        });
    }

    if (modalReloadButton) {
        modalReloadButton.addEventListener('click', () => {
            location.reload();
        });
    }

    // --- CÁC SỰ KIỆN NÚT BẤM VÀ TƯƠNG TÁC ---
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // Xóa ảnh của phiên cũ trước khi bắt đầu phiên mới
            capturedShots = [];
            currentShotIndex = 0;
            
            sendCommand('start', true);
            isSessionActive = true;
            // **THÊM MỚI: Reset trạng thái 'hit' của các mặt bia**
            for (let i = 1; i <= 6; i++) {
                const targetEl = document.getElementById(`target-${i}`);
                if (targetEl) {
                    targetEl.classList.remove('hit');
                    targetEl.classList.remove('hit-completed');
                }
            }
            checkSystemReady();
            if (ammoCountElement) {
                ammoCountElement.textContent = '16 / 16';
            }
            if (timerElement) {
                timerElement.textContent = '01:27';
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
            sendCommand('reset', true);
            setTimeout(() => location.reload(), 200);
        });
    }

    // --- LOGIC CHÍNH CỦA BÀI BẮN (GIỮ NGUYÊN CỦA BẠN) ---
    function runTargetSequence() {
        // SỬA ĐỔI: Tổng thời gian là 87 giây
        let timeLeft = 87;

        timerInterval = setInterval(() => {
            if (timeLeft < 0) {
                clearInterval(timerInterval);
                timerElement.textContent = '00:00';
                // Sự kiện session_ended từ server sẽ xử lý việc kết thúc
                return;
            }
            
            let minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
            let seconds = String(timeLeft % 60).padStart(2, '0');
            timerElement.textContent = `${minutes}:${seconds}`;

            const targetElements = {
                t1: document.getElementById('target-1'), t2: document.getElementById('target-2'),
                t3: document.getElementById('target-3'), t4: document.getElementById('target-4'),
                t5: document.getElementById('target-5'), t6: document.getElementById('target-6')
            };

            // **LOGIC ĐÃ ĐƯỢC NÂNG CẤP VỚI ĐIỀU KIỆN KIỂM TRA '.hit'**

            // Bia số 6
            if (timeLeft === 72 && !targetElements.t1.classList.contains('hit')) { targetElements.t1.classList.add('flash'); targetSounds.bia6_hien.play(); }
            if (timeLeft === 66 && !targetElements.t1.classList.contains('hit')) { targetElements.t1.classList.remove('flash'); targetElements.t1.classList.add('hit-completed'); targetSounds.bia6_an.play(); }
            
            // Bia số 5
            if (timeLeft === 63 && !targetElements.t2.classList.contains('hit')) { targetElements.t2.classList.add('flash'); targetSounds.bia5_hien.play(); }
            if (timeLeft === 57 && !targetElements.t2.classList.contains('hit')) { targetElements.t2.classList.remove('flash'); targetElements.t2.classList.add('hit-completed'); targetSounds.bia5_an.play(); }
            
            // Bia số 10
            if (timeLeft === 47 && !targetElements.t3.classList.contains('hit')) { targetElements.t3.classList.add('flash'); targetSounds.bia10_hien.play(); }
            if (timeLeft === 42 && !targetElements.t3.classList.contains('hit')) { targetElements.t3.classList.remove('flash'); targetElements.t3.classList.add('hit-completed'); targetSounds.bia10_an.play(); }
            
            // Bia số 7b
            if (timeLeft === 39 && !targetElements.t4.classList.contains('hit')) { targetElements.t4.classList.add('flash'); targetSounds.bia7b_hien.play(); }
            if (timeLeft === 34 && !targetElements.t4.classList.contains('hit')) { targetElements.t4.classList.remove('flash'); targetElements.t4.classList.add('hit-completed'); targetSounds.bia7b_an.play(); }
            
            // Bia số 8c
            if (timeLeft === 19 && !targetElements.t5.classList.contains('hit')) { targetElements.t5.classList.add('flash'); targetSounds.bia8c_hien.play(); }
            if (timeLeft === 12 && !targetElements.t6.classList.contains('hit')) { targetElements.t6.classList.add('flash'); targetSounds.bia8c_hien.play(); }
            
            if (timeLeft === 7 && !targetElements.t5.classList.contains('hit'))  { targetElements.t5.classList.remove('flash'); targetElements.t5.classList.add('hit-completed'); targetSounds.bia8c_an.play(); }
            if (timeLeft === 0)  { 
                if (!targetElements.t6.classList.contains('hit')) {
                    targetElements.t6.classList.remove('flash'); 
                    targetElements.t6.classList.add('hit-completed');
                }
                timesUpSound.play();
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
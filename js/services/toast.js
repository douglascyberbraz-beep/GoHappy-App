// GoHappy Toast System - Premium notifications replacing native alert()
window.GoHappyToast = {
    _queue: [],
    _showing: false,

    show: (message, type = 'info', duration = 3500) => {
        window.GoHappyToast._queue.push({ message, type, duration });
        if (!window.GoHappyToast._showing) {
            window.GoHappyToast._processQueue();
        }
    },

    _processQueue: () => {
        if (window.GoHappyToast._queue.length === 0) {
            window.GoHappyToast._showing = false;
            return;
        }
        window.GoHappyToast._showing = true;
        const { message, type, duration } = window.GoHappyToast._queue.shift();
        window.GoHappyToast._render(message, type, duration);
    },

    _render: (message, type, duration) => {
        const existing = document.getElementById('gh-toast');
        if (existing) existing.remove();

        const styles = {
            success: { bg: 'linear-gradient(135deg, #1a9e5c, #27AE60)', icon: '✅', shadow: 'rgba(39,174,96,0.4)' },
            error:   { bg: 'linear-gradient(135deg, #c0392b, #E74C3C)', icon: '❌', shadow: 'rgba(231,76,60,0.4)' },
            info:    { bg: 'linear-gradient(135deg, #0B4C8F, #0B71FC)', icon: 'ℹ️', shadow: 'rgba(11,113,252,0.4)' },
            warning: { bg: 'linear-gradient(135deg, #d68910, #F39C12)', icon: '⚠️', shadow: 'rgba(243,156,18,0.4)' },
            points:  { bg: 'linear-gradient(135deg, #7d3c98, #9B59B6)', icon: '⭐', shadow: 'rgba(155,89,182,0.4)' }
        };
        const s = styles[type] || styles.info;

        const toast = document.createElement('div');
        toast.id = 'gh-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.style.cssText = `
            position: fixed;
            bottom: calc(var(--nav-height, 85px) + env(safe-area-inset-bottom, 0px) + 16px);
            left: 50%;
            transform: translateX(-50%) translateY(30px) scale(0.92);
            background: ${s.bg};
            color: white;
            padding: 14px 22px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 700;
            font-family: 'Inter', sans-serif;
            box-shadow: 0 12px 40px ${s.shadow}, 0 4px 12px rgba(0,0,0,0.15);
            z-index: 99999;
            max-width: min(85vw, 380px);
            text-align: center;
            line-height: 1.4;
            display: flex;
            align-items: center;
            gap: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            pointer-events: none;
            border: 1px solid rgba(255,255,255,0.2);
        `;
        toast.innerHTML = `<span style="flex-shrink:0">${s.icon}</span><span>${message}</span>`;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(-50%) translateY(0) scale(1)';
            });
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px) scale(0.95)';
            setTimeout(() => {
                toast.remove();
                window.GoHappyToast._processQueue();
            }, 400);
        }, duration);
    },

    success: (msg, dur) => window.GoHappyToast.show(msg, 'success', dur),
    error:   (msg, dur) => window.GoHappyToast.show(msg, 'error', dur || 4500),
    info:    (msg, dur) => window.GoHappyToast.show(msg, 'info', dur),
    warning: (msg, dur) => window.GoHappyToast.show(msg, 'warning', dur),
    points:  (msg, dur) => window.GoHappyToast.show(msg, 'points', dur || 4500)
};

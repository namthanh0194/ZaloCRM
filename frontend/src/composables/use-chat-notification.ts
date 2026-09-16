import { ref } from "vue";

interface ExtendedNotificationOptions extends NotificationOptions {
  renotify?: boolean;
}

let originalTitle = document.title || 'ZaloCRM';
let titleInterval: number | null = null;
const unreadCount = ref(0);
const recentMessageKeys = new Set<string>();

function isDuplicateMessage(key: string): boolean {
  if (!key) return false;
  if (recentMessageKeys.has(key)) return true;
  recentMessageKeys.add(key);
  setTimeout(() => {
    recentMessageKeys.delete(key);
  }, 10000);
  return false;
}
let notificationAudio: HTMLAudioElement | null = null;

function initAudio() {
  if (typeof window === 'undefined') return null;
  if (!notificationAudio) {
    notificationAudio = new Audio('/sounds/notification.mp3');
    notificationAudio.preload = 'auto';
  }
  return notificationAudio;
}

export function playNotificationSound() {
  try {
    const audio = initAudio();
    if (audio) {
      audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err) => {
          console.warn('[notification] audio play blocked by browser policy:', err);
        });
      }
    }
  } catch (err) {
    console.warn('[notification] play audio error:', err);
  }
}

if (typeof window !== 'undefined') {
  const events = ['click', 'keydown', 'touchstart', 'pointerdown'];
  const handler = () => {
    const audio = initAudio();
    if (audio) {
      audio.volume = 0;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
      }).catch(() => {});
    }
    events.forEach(e => window.removeEventListener(e, handler));
  };
  events.forEach(e => window.addEventListener(e, handler, { once: true, passive: true }));
}


function updateFaviconBadge(count: number) {
  const favicon = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
  if (!favicon) return;
  if (count <= 0) {
    favicon.href = '/brand/zalocrm.ico';
    return;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = '/brand/zalocrm-logo.png';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 32, 32);
      // Chấm đỏ badge
      ctx.beginPath();
      ctx.arc(24, 8, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Số badge
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = count > 99 ? '99+' : String(count);
      ctx.fillText(text, 24, 8.5);

      favicon.href = canvas.toDataURL('image/png');
    };
  } catch {
    // fallback giữ nguyên favicon
  }
}

function updateTabTitle(count: number, latestSenderName?: string) {
  if (count <= 0) {
    if (titleInterval) {
      window.clearInterval(titleInterval);
      titleInterval = null;
    }
    document.title = originalTitle.replace(/^\((?:\d+|99\+)\)\s*/, '');
    return;
  }

  const prefix = `(${count > 99 ? '99+' : count}) `;
  const cleanTitle = document.title.replace(/^\((?:\d+|99\+)\)\s*/, '');
  if (cleanTitle && !cleanTitle.includes('💬')) originalTitle = cleanTitle;

  if (document.hidden && latestSenderName) {
    if (!titleInterval) {
      let toggle = false;
      titleInterval = window.setInterval(() => {
        toggle = !toggle;
        document.title = toggle
          ? `${prefix}💬 ${latestSenderName} vừa nhắn...`
          : `${prefix}${originalTitle}`;
      }, 1500);
    }
  } else {
    if (titleInterval) {
      window.clearInterval(titleInterval);
      titleInterval = null;
    }
    document.title = `${prefix}${originalTitle}`;
  }
}

export function useChatNotification() {
  async function requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {}
    }
  }

  function setUnreadTotal(count: number) {
    unreadCount.value = count;
    updateTabTitle(count);
    updateFaviconBadge(count);
  }

  function notifyIncomingMessage(msg: {
    senderName?: string;
    content?: string;
    conversationId?: string;
    messageId?: string;
  }) {
    const messageKey = msg.messageId
      ? `id:${msg.messageId}`
      : `${msg.conversationId || ""}:${msg.senderName || ""}:${msg.content || ""}`;
    if (isDuplicateMessage(messageKey)) return;

    playNotificationSound();
    const name = msg.senderName || "Khách hàng";
    const body = msg.content || "Đã gửi một tin nhắn";

    // 1. Cập nhật Tab Title & Favicon
    setUnreadTotal(unreadCount.value + 1);
    updateTabTitle(unreadCount.value, name);

    // 2. Desktop Notification góc phải dưới
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const tag = msg.conversationId
          ? `zalo-conv-${msg.conversationId}`
          : (msg.messageId ? `zalo-msg-${msg.messageId}` : undefined);

        const options: ExtendedNotificationOptions = {
          body: body.length > 80 ? body.slice(0, 80) + "..." : body,
          icon: "/brand/zalocrm-logo.png",
          silent: true,
        };
        if (tag) {
          options.tag = tag;
          options.renotify = true;
        }

        const notif = new Notification(`${name} (Zalo)`, options);
        notif.onclick = () => {
          window.focus();
          if (msg.conversationId) {
            window.location.href = `/chat/${msg.conversationId}`;
          }
          notif.close();
        };
      } catch (err) {
        console.warn("[notification] popup error:", err);
      }
    }
  }

  // Reset khi người dùng quay lại đọc
  if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && titleInterval) {
        window.clearInterval(titleInterval);
        titleInterval = null;
        if (unreadCount.value > 0) {
          document.title = `(${unreadCount.value}) ${originalTitle}`;
        } else {
          document.title = originalTitle;
        }
      }
    });
  }

  return {
    requestPermission,
    setUnreadTotal,
    notifyIncomingMessage,
    playNotificationSound,
    testNotification: () => {
      playNotificationSound();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          const n = new Notification("ZaloCRM - Thử thông báo", {
            body: "Thông báo Desktop & âm thanh notification.mp3 hoạt động tốt!",
            icon: "/brand/zalocrm-logo.png",
            tag: "zalo-test-notification",
            renotify: true,
            silent: true,
          } as ExtendedNotificationOptions);
          n.onclick = () => { window.focus(); n.close(); };
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((res) => {
            if (res === 'granted') {
              const n = new Notification("ZaloCRM - Đã bật thông báo", {
                body: "Thông báo Desktop & âm thanh notification.mp3 hoạt động tốt!",
                icon: "/brand/zalocrm-logo.png",
                tag: "zalo-test-notification",
                renotify: true,
                silent: true,
              } as ExtendedNotificationOptions);
              n.onclick = () => { window.focus(); n.close(); };
            }
          });
        }
      }
    },
  };
}

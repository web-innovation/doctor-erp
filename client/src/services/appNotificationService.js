const STORAGE_KEY = 'app_header_notifications_v1';
const UPDATE_EVENT = 'app-header-notifications-updated';
const MAX_ITEMS = 30;

function safeParse(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function readAll() {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

function writeAll(items) {
  if (typeof window === 'undefined') return;
  const limited = (Array.isArray(items) ? items : []).slice(0, MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

const appNotificationService = {
  storageKey: STORAGE_KEY,
  updateEvent: UPDATE_EVENT,
  list() {
    return readAll();
  },
  add(notification) {
    const now = new Date().toISOString();
    const id = notification?.id || `notif-${Date.now()}`;
    const item = {
      id,
      title: notification?.title || 'Notification',
      message: notification?.message || '',
      path: notification?.path || null,
      unread: notification?.unread !== false,
      type: notification?.type || 'info',
      createdAt: notification?.createdAt || now,
      source: notification?.source || 'local'
    };
    const current = readAll();
    const withoutSameId = current.filter((n) => n.id !== id);
    writeAll([item, ...withoutSameId]);
    return item;
  },
  remove(id) {
    const current = readAll();
    writeAll(current.filter((n) => n.id !== id));
  },
  markRead(id) {
    const current = readAll();
    writeAll(current.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  },
  clearAll() {
    writeAll([]);
  }
};

export default appNotificationService;

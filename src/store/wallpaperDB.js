// ============================================================
// 壁纸存储：IndexedDB 存原始 Blob（二进制，无 base64 膨胀 33%，
// 不随设置全量序列化，配额远超 storage.local 的 10MB）
// ============================================================

const DB_NAME = 'simpletab-wallpaper'
const STORE = 'wallpaper'
const KEY = 'main'

let _dbPromise = null
function db() {
  if (!_dbPromise) {
    _dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        req.onblocked = () => reject(new Error('IndexedDB blocked'))
      } catch (e) { reject(e) }
    })
  }
  return _dbPromise
}

/* 单请求事务封装：fn(store) 返回 IDBRequest */
function txn(mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    try {
      const t = d.transaction(STORE, mode)
      const req = fn(t.objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error || t.error)
      t.onabort = () => reject(t.error)
    } catch (e) { reject(e) }
  }))
}

export function loadWallpaperBlob() {
  return txn('readonly', s => s.get(KEY))
}
export function saveWallpaperBlob(blob) {
  return txn('readwrite', s => s.put(blob, KEY))
}
export function clearWallpaperBlob() {
  return txn('readwrite', s => s.delete(KEY))
}

/* Blob → 壁纸类型：视频/图片。type 缺失或未知按图片处理（background-image 可尝试渲染） */
export const kindOfBlob = blob =>
  (blob && blob.type && blob.type.startsWith('video/')) ? 'video' : 'image'

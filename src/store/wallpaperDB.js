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

/* ---------- 文件夹轮换壁纸：多图，key 为 folder/0..N-1（仅静态图片） ---------- */
const FOLDER_PREFIX = 'folder/'
export function saveFolderImage(blob, i) {
  return txn('readwrite', s => s.put(blob, FOLDER_PREFIX + i))
}
export function loadFolderImage(i) {
  return txn('readonly', s => s.get(FOLDER_PREFIX + i))
}
/* 批量删除 [from, to) 索引的图片（单事务，失败静默） */
export async function clearFolderImages(from, to) {
  const d = await db()
  return new Promise(resolve => {
    try {
      const t = d.transaction(STORE, 'readwrite')
      const st = t.objectStore(STORE)
      for (let i = from; i < to; i++) st.delete(FOLDER_PREFIX + i)
      t.oncomplete = () => resolve()
      t.onerror = () => resolve()
    } catch (e) { resolve() }
  })
}

/* Blob → 壁纸类型：视频/图片。type 缺失或未知按图片处理（background-image 可尝试渲染） */
export const kindOfBlob = blob =>
  (blob && blob.type && blob.type.startsWith('video/')) ? 'video' : 'image'

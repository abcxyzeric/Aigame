import { SaveSlot } from '../types';

const DB_NAME = 'ai-rpg-simulator-db';
const STORE_NAME = 'saves';
const DB_VERSION = 1;

let db: IDBDatabase;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject('Lỗi khi mở cơ sở dữ liệu IndexedDB.');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'saveId' });
      }
    };
  });
}

export async function addSave(save: SaveSlot): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(save);

    request.onsuccess = () => resolve();
    request.onerror = () => {
        console.error('Lỗi khi thêm save vào IndexedDB:', request.error);
        reject('Không thể lưu game.');
    };
  });
}

export async function getAllSaves(): Promise<SaveSlot[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort descending by saveId (which is a timestamp) to get newest first
      const sortedSaves = request.result.sort((a, b) => b.saveId - a.saveId);
      resolve(sortedSaves);
    };
    request.onerror = () => {
        console.error('Lỗi khi tải tất cả save từ IndexedDB:', request.error);
        reject('Không thể tải danh sách game đã lưu.');
    };
  });
}

export async function deleteSave(saveId: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(saveId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('Lỗi khi xóa save từ IndexedDB:', request.error);
            reject('Không thể xóa file lưu.');
        };
    });
}

export async function trimSaves(maxSaves: number): Promise<void> {
  const allSaves = await getAllSaves(); // This is already sorted newest to oldest
  if (allSaves.length > maxSaves) {
    const savesToDelete = allSaves.slice(maxSaves);
    for (const save of savesToDelete) {
      await deleteSave(save.saveId);
    }
  }
}

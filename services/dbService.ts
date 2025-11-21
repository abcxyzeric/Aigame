import { SaveSlot, FandomFile } from '../types';

const DB_NAME = 'ai-rpg-simulator-db';
const SAVES_STORE_NAME = 'saves';
const FANDOM_STORE_NAME = 'fandom_files';
const DB_VERSION = 2;

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

      // Use a switch statement with fall-through for robust, sequential upgrades.
      // This is the standard best practice for IndexedDB migrations and prevents data loss.
      switch (event.oldVersion) {
        case 0:
          // Version 0 means the database is being created for the first time.
          // Create the initial 'saves' store.
          if (!dbInstance.objectStoreNames.contains(SAVES_STORE_NAME)) {
            dbInstance.createObjectStore(SAVES_STORE_NAME, { keyPath: 'saveId' });
          }
        // FALL THROUGH to apply subsequent version changes
        case 1:
          // Upgrading from version 1 to 2 (or a fresh install falling through).
          // Version 2 introduced the 'fandom_files' store.
          if (!dbInstance.objectStoreNames.contains(FANDOM_STORE_NAME)) {
            dbInstance.createObjectStore(FANDOM_STORE_NAME, { keyPath: 'id' });
          }
          break; // Stop here for version 2. Add more cases for future versions.
      }
    };
  });
}

// --- Save Slot Functions ---

export async function addSave(save: SaveSlot): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SAVES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SAVES_STORE_NAME);
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
    const transaction = db.transaction(SAVES_STORE_NAME, 'readonly');
    const store = transaction.objectStore(SAVES_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
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
        const transaction = db.transaction(SAVES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SAVES_STORE_NAME);
        const request = store.delete(saveId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('Lỗi khi xóa save từ IndexedDB:', request.error);
            reject('Không thể xóa file lưu.');
        };
    });
}

export async function trimSaves(maxSaves: number): Promise<void> {
  const allSaves = await getAllSaves();
  if (allSaves.length > maxSaves) {
    const savesToDelete = allSaves.slice(maxSaves);
    for (const save of savesToDelete) {
      await deleteSave(save.saveId);
    }
  }
}

// --- Fandom File Functions ---

export async function addFandomFile(file: FandomFile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FANDOM_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FANDOM_STORE_NAME);
    const request = store.put(file);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Không thể lưu tệp nguyên tác.');
  });
}

export async function getAllFandomFiles(): Promise<FandomFile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FANDOM_STORE_NAME, 'readonly');
    const store = transaction.objectStore(FANDOM_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result.sort((a, b) => b.id - a.id));
    };
    request.onerror = () => reject('Không thể tải các tệp nguyên tác.');
  });
}

export async function deleteFandomFile(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FANDOM_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FANDOM_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Không thể xóa tệp nguyên tác.');
  });
}
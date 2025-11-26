import { SaveSlot, FandomFile, TurnVector, SummaryVector, EntityVector } from '../types';

const DB_NAME = 'ai-rpg-simulator-db';
const SAVES_STORE_NAME = 'saves';
const FANDOM_STORE_NAME = 'fandom_files';
const TURN_VECTORS_STORE_NAME = 'turn_vectors';
const SUMMARY_VECTORS_STORE_NAME = 'summary_vectors';
const ENTITY_VECTORS_STORE_NAME = 'entity_vectors';
const DB_VERSION = 5; // Tăng phiên bản DB

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

      switch (event.oldVersion) {
        case 0:
          if (!dbInstance.objectStoreNames.contains(SAVES_STORE_NAME)) {
            dbInstance.createObjectStore(SAVES_STORE_NAME, { keyPath: 'saveId' });
          }
        case 1:
          if (!dbInstance.objectStoreNames.contains(FANDOM_STORE_NAME)) {
            dbInstance.createObjectStore(FANDOM_STORE_NAME, { keyPath: 'id' });
          }
        case 2:
          if (!dbInstance.objectStoreNames.contains(TURN_VECTORS_STORE_NAME)) {
            const store = dbInstance.createObjectStore(TURN_VECTORS_STORE_NAME, { keyPath: 'turnId' });
            store.createIndex('turnIndex', 'turnIndex', { unique: false });
          }
          if (!dbInstance.objectStoreNames.contains(SUMMARY_VECTORS_STORE_NAME)) {
            const store = dbInstance.createObjectStore(SUMMARY_VECTORS_STORE_NAME, { keyPath: 'summaryId' });
            store.createIndex('summaryIndex', 'summaryIndex', { unique: false });
          }
        case 3:
            if (!dbInstance.objectStoreNames.contains(ENTITY_VECTORS_STORE_NAME)) {
                dbInstance.createObjectStore(ENTITY_VECTORS_STORE_NAME, { keyPath: 'id' });
            }
        case 4:
            // Nâng cấp từ v4 lên v5: Thêm chỉ mục 'worldId'
            if (dbInstance.objectStoreNames.contains(TURN_VECTORS_STORE_NAME)) {
                const store = request.transaction!.objectStore(TURN_VECTORS_STORE_NAME);
                if (!store.indexNames.contains('worldId')) {
                    store.createIndex('worldId', 'worldId', { unique: false });
                }
            }
             if (dbInstance.objectStoreNames.contains(SUMMARY_VECTORS_STORE_NAME)) {
                const store = request.transaction!.objectStore(SUMMARY_VECTORS_STORE_NAME);
                if (!store.indexNames.contains('worldId')) {
                    store.createIndex('worldId', 'worldId', { unique: false });
                }
            }
             if (dbInstance.objectStoreNames.contains(ENTITY_VECTORS_STORE_NAME)) {
                const store = request.transaction!.objectStore(ENTITY_VECTORS_STORE_NAME);
                 if (!store.indexNames.contains('worldId')) {
                    store.createIndex('worldId', 'worldId', { unique: false });
                }
            }
            break;
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
        const transaction = db.transaction([SAVES_STORE_NAME, TURN_VECTORS_STORE_NAME, SUMMARY_VECTORS_STORE_NAME, ENTITY_VECTORS_STORE_NAME], 'readwrite');
        
        // Xóa save slot
        transaction.objectStore(SAVES_STORE_NAME).delete(saveId);
        
        // Xóa các vector liên quan
        const deleteFromStore = (storeName: string) => {
            const store = transaction.objectStore(storeName);
            const index = store.index('worldId');
            const request = index.openKeyCursor(IDBKeyRange.only(saveId));
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };
        };
        
        deleteFromStore(TURN_VECTORS_STORE_NAME);
        deleteFromStore(SUMMARY_VECTORS_STORE_NAME);
        deleteFromStore(ENTITY_VECTORS_STORE_NAME);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
            console.error('Lỗi khi xóa save và các vector liên quan từ IndexedDB:', transaction.error);
            reject('Không thể xóa file lưu và dữ liệu liên quan.');
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

// --- Vector Store Functions ---

// Turn Vectors
export async function addTurnVector(vector: TurnVector): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TURN_VECTORS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TURN_VECTORS_STORE_NAME);
    const request = store.put(vector);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Không thể lưu vector lượt chơi.');
  });
}

export async function getAllTurnVectors(worldId: number): Promise<TurnVector[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TURN_VECTORS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(TURN_VECTORS_STORE_NAME);
    const index = store.index('worldId');
    const request = index.getAll(worldId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Không thể tải vector lượt chơi.');
  });
}

// Summary Vectors
export async function addSummaryVector(vector: SummaryVector): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SUMMARY_VECTORS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SUMMARY_VECTORS_STORE_NAME);
    const request = store.put(vector);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Không thể lưu vector tóm tắt.');
  });
}

export async function getAllSummaryVectors(worldId: number): Promise<SummaryVector[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SUMMARY_VECTORS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(SUMMARY_VECTORS_STORE_NAME);
    const index = store.index('worldId');
    const request = index.getAll(worldId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Không thể tải vector tóm tắt.');
  });
}

// --- Entity Vector Functions ---

export async function addEntityVector(vector: EntityVector): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(ENTITY_VECTORS_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(ENTITY_VECTORS_STORE_NAME);
        const request = store.put(vector);
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Không thể lưu vector thực thể.');
    });
}

export async function getAllEntityVectors(worldId: number): Promise<EntityVector[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(ENTITY_VECTORS_STORE_NAME, 'readonly');
        const store = transaction.objectStore(ENTITY_VECTORS_STORE_NAME);
        const index = store.index('worldId');
        const request = index.getAll(worldId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Không thể tải vector thực thể.');
    });
}

export async function deleteEntityVector(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(ENTITY_VECTORS_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(ENTITY_VECTORS_STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Không thể xóa vector thực thể.');
    });
}

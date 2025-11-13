
export interface FandomFile {
  id: number; // Date.now()
  name: string;
  content: string;
  date: string; // ISO String
}

const STORAGE_KEY = 'ai_rpg_fandom_files';

export const getAllFandomFiles = (): FandomFile[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error loading fandom files:", e);
    return [];
  }
};

export const saveFandomFile = (name: string, content: string): void => {
  try {
    const files = getAllFandomFiles();
    const newFile: FandomFile = {
      id: Date.now(),
      name,
      content,
      date: new Date().toISOString(),
    };
    // Add new file to the beginning of the array
    const updatedFiles = [newFile, ...files];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
  } catch (e) {
    console.error("Error saving fandom file:", e);
  }
};

export const deleteFandomFile = (id: number): void => {
   try {
    let files = getAllFandomFiles();
    files = files.filter(file => file.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    console.error("Error deleting fandom file:", e);
  }
};

export const renameFandomFile = (id: number, newName: string): void => {
  try {
    let files = getAllFandomFiles();
    const fileIndex = files.findIndex(file => file.id === id);
    if (fileIndex > -1) {
      files[fileIndex].name = newName;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    }
  } catch (e) {
    console.error("Error renaming fandom file:", e);
  }
};
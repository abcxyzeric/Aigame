import { FandomFile } from '../types';
import * as dbService from './dbService';

export const getAllFandomFiles = async (): Promise<FandomFile[]> => {
  try {
    return await dbService.getAllFandomFiles();
  } catch (e) {
    console.error("Error loading fandom files from DB:", e);
    return [];
  }
};

export const saveFandomFile = async (name: string, content: string): Promise<void> => {
  try {
    const newFile: FandomFile = {
      id: Date.now(),
      name,
      content,
      date: new Date().toISOString(),
    };
    await dbService.addFandomFile(newFile);
  } catch (e) {
    console.error("Error saving fandom file to DB:", e);
    throw new Error('Không thể lưu tệp vào cơ sở dữ liệu trình duyệt.');
  }
};

export const deleteFandomFile = async (id: number): Promise<void> => {
   try {
    await dbService.deleteFandomFile(id);
  } catch (e) {
    console.error("Error deleting fandom file from DB:", e);
    throw new Error('Không thể xóa tệp khỏi cơ sở dữ liệu.');
  }
};

export const renameFandomFile = async (id: number, newName: string): Promise<void> => {
  try {
    const files = await dbService.getAllFandomFiles();
    const fileToUpdate = files.find(file => file.id === id);
    if (fileToUpdate) {
      fileToUpdate.name = newName;
      await dbService.addFandomFile(fileToUpdate); // `put` operation will update the existing entry
    } else {
      throw new Error('Không tìm thấy tệp để đổi tên.');
    }
  } catch (e) {
    console.error("Error renaming fandom file in DB:", e);
    throw new Error('Không thể đổi tên tệp.');
  }
};
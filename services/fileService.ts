import { WorldConfig, GameState } from '../types';

export const saveWorldConfigToFile = (config: WorldConfig): void => {
  const dataStr = JSON.stringify(config, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const exportFileDefaultName = 'ai_rpg_world.json';

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

export const saveGameStateToFile = (state: GameState): void => {
  const dataStr = JSON.stringify(state, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = 'ai_rpg_save.json';
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

export const saveTextToFile = (content: string, fileName: string): void => {
  const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', fileName);
  linkElement.click();
};

export const saveJsonToFile = (data: object, defaultFileName: string): void => {
  const dataStr = JSON.stringify(data, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', defaultFileName);
  linkElement.click();
};


export const loadWorldConfigFromFile = (file: File): Promise<WorldConfig> => {
  return new Promise((resolve, reject) => {
    if (!file || file.type !== 'application/json') {
      reject(new Error('Vui lòng chọn một tệp .json hợp lệ.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text === 'string') {
          const config = JSON.parse(text) as WorldConfig;
          // Basic validation
          if (config.storyContext && config.character) {
             resolve(config);
          } else {
            reject(new Error('Tệp JSON không có cấu trúc hợp lệ.'));
          }
        } else {
          reject(new Error('Không thể đọc nội dung tệp.'));
        }
      } catch (error) {
        reject(new Error(`Lỗi khi phân tích tệp JSON: ${error}`));
      }
    };
    reader.onerror = () => {
      reject(new Error('Lỗi khi đọc tệp.'));
    };
    reader.readAsText(file);
  });
};

export const loadJsonFromFile = <T>(file: File): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (!file || file.type !== 'application/json') {
      reject(new Error('Vui lòng chọn một tệp .json hợp lệ.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text === 'string') {
          const data = JSON.parse(text) as T;
          resolve(data);
        } else {
          reject(new Error('Không thể đọc nội dung tệp.'));
        }
      } catch (error) {
        reject(new Error(`Lỗi khi phân tích tệp JSON: ${error}`));
      }
    };
    reader.onerror = () => {
      reject(new Error('Lỗi khi đọc tệp.'));
    };
    reader.readAsText(file);
  });
};

export const loadTextFromFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Không có tệp nào được chọn.'));
            return;
        }
        if (file.type !== 'text/plain') {
            reject(new Error('Vui lòng chọn một tệp .txt hợp lệ.'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            if (typeof text === 'string') {
                resolve(text);
            } else {
                reject(new Error('Không thể đọc nội dung tệp.'));
            }
        };
        reader.onerror = () => {
            reject(new Error('Lỗi khi đọc tệp.'));
        };
        reader.readAsText(file);
    });
};

export const loadKeysFromTxtFile = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
    if (!file || file.type !== 'text/plain') {
      reject(new Error('Vui lòng chọn một tệp .txt hợp lệ.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text === 'string') {
          const keys = text.split('\n').map(k => k.trim()).filter(Boolean);
          resolve(keys);
        } else {
          reject(new Error('Không thể đọc nội dung tệp.'));
        }
      } catch (error) {
        reject(new Error(`Lỗi khi đọc tệp văn bản: ${error}`));
      }
    };
    reader.onerror = () => {
      reject(new Error('Lỗi khi đọc tệp.'));
    };
    reader.readAsText(file);
  });
};
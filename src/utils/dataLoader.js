// src/utils/dataLoader.js

export const loadAllData = async () => {
  try {
    // 浏览器原生 fetch，直接读取 public/data 下的 json 文件
    const response = await fetch('/data/friescup_db.json');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // 原生解析 JSON，顺滑无比
    const db = await response.json();
    console.log('[ DB LOADED ] FriesCup Master JSON:', db);
    return db;
    
  } catch (error) {
    console.error('[ SYS_ERR ] 加载 JSON 数据库失败:', error);
    return null;
  }
};
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const indexPath = path.join(root, 'data/index.json');
const errors = [];
const readJSON = (filename) => {
  try { return JSON.parse(fs.readFileSync(filename, 'utf8')); }
  catch (error) { errors.push(`無法讀取 ${filename}: ${error.message}`); return null; }
};
const isStr = v => typeof v === 'string' && v.trim().length > 0;
const isStringList = v => Array.isArray(v) && v.every(isStr);
const expect = (ok, message) => { if (!ok) errors.push(message); };
const index = readJSON(indexPath);
if (!index || !Array.isArray(index.functions)) {
  console.error('資料索引錯誤：data/index.json 缺少 functions 陣列');
  process.exit(1);
}
const seen = new Set();
const knownIds = new Set(index.functions.map(item => item?.id).filter(isStr));
const libraryNames = new Set();
if (index.libraries !== undefined) {
  expect(Array.isArray(index.libraries), 'libraries 必須為陣列');
  if (Array.isArray(index.libraries)) for (const lib of index.libraries) {
    expect(isStr(lib?.name) && isStr(lib?.description), 'libraries 項目必須有 name 與 description');
    expect(!libraryNames.has(lib?.name), `函式庫名稱重複：${lib?.name}`);
    libraryNames.add(lib?.name);
  }
}
for (const item of index.functions) {
  const label = item?.id || '(缺少 id)';
  for (const key of ['id','language','library','symbol','title','summary','path']) expect(isStr(item?.[key]), `${label}: 索引缺少 ${key}`);
  if (!isStr(item?.id) || !isStr(item?.path)) continue;
  expect(!seen.has(item.id), `${label}: id 重複`);
  seen.add(item.id);
  expect(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(item.id), `${label}: id 必須使用英文小寫、數字、斜線或連字號`);
  const validPath = /^data\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\.json$/.test(item.path);
  const sameId = item.path === `data/${item.id}.json`;
  expect(validPath, `${label}: path 格式不正確`);
  expect(sameId, `${label}: path 與 id 不一致`);
  if (!validPath || !sameId) continue;
  const absolute = path.resolve(root, item.path);
  expect(absolute.startsWith(root + path.sep), `${label}: path 超出專案根目錄`);
  if (!absolute.startsWith(root + path.sep)) continue;
  const doc = readJSON(absolute);
  if (!doc) continue;
  for (const key of ['id','language','library','symbol','title','summary','syntax']) expect(isStr(doc[key]), `${label}: 文件缺少 ${key}`);
  for (const key of ['id','language','library','symbol','title','summary']) expect(doc[key] === item[key], `${label}: 索引與文件的 ${key} 不一致`);
  for (const [key, check] of [['category', isStr], ['keywords', isStringList]]) {
    for (const entry of [item, doc]) {
      if (entry[key] !== undefined) expect(check(entry[key]), `${label}: ${key} 格式錯誤`);
    }
    if (doc[key] !== undefined) {
      expect(JSON.stringify(item[key]) === JSON.stringify(doc[key]), `${label}: 索引與文件的 ${key} 不一致`);
    }
  }
  if (doc.syntax_short !== undefined) {
    expect(isStr(doc.syntax_short) && isStr(doc.syntax_full), `${label}: syntax_short 必須搭配 syntax_full`);
  }
  if (doc.syntax_full !== undefined) {
    expect(isStr(doc.syntax_full) && !/[(,]\s*(?:\.{3}|…)\s*[,)]/.test(doc.syntax_full), `${label}: syntax_full 必須為完整語法`);
  }
  if (doc.related_ids !== undefined) {
    expect(isStringList(doc.related_ids), `${label}: related_ids 必須為字串陣列`);
    if (isStringList(doc.related_ids)) for (const id of doc.related_ids) {
      expect(id !== item.id && knownIds.has(id), `${label}: related_ids 無效：${id}`);
    }
  }
  const exampleIds = new Set();
  expect(Array.isArray(doc.examples) && doc.examples.length > 0, `${label}: 至少一個 examples`);
  if (Array.isArray(doc.examples)) for (const [i,e] of doc.examples.entries()) {
    for (const k of ['title','code','output']) expect(isStr(e?.[k]), `${label}: 範例 ${i+1} 缺少 ${k}`);
    if (e?.id !== undefined) {
      expect(isStr(e.id) && !exampleIds.has(e.id), `${label}: 範例 ${i+1} id 無效或重複`);
      exampleIds.add(e.id);
    }
  }
  expect(Array.isArray(doc.parameters), `${label}: parameters 必須為陣列`);
  if (Array.isArray(doc.parameters)) {
    for (const [i,p] of doc.parameters.entries()) {
      for (const k of ['name','type','description']) expect(isStr(p?.[k]), `${label}: 參數 ${i+1} 缺少 ${k}`);
      expect(typeof p?.required === 'boolean', `${label}: 參數 ${i+1} required 必須為布林`);
      expect(p?.default === null || typeof p?.default === 'string', `${label}: 參數 ${i+1} default 應為字串或 null`);
      if (p?.accepted_values !== undefined) expect(isStr(p.accepted_values), `${label}: 參數 ${i+1} accepted_values 必須為字串`);
      if (p?.notes !== undefined) expect(isStringList(p.notes), `${label}: 參數 ${i+1} notes 必須為字串陣列`);
      if (p?.example_id !== undefined) expect(isStr(p.example_id) && exampleIds.has(p.example_id), `${label}: 參數 ${i+1} example_id 指向不存在的範例`);
    }
  }
  expect(isStr(doc.returns?.type) && isStr(doc.returns?.description), `${label}: returns 格式錯誤`);
  expect(isStringList(doc.notes), `${label}: notes 必須為字串陣列`);
  expect(isStr(doc.source?.url) && /^https:\/\//.test(doc.source?.url), `${label}: source.url 必須是 HTTPS 官方網址`);
  expect(isStr(doc.source?.library_version), `${label}: source.library_version 未填`);
  expect(/^\d{4}-\d\d-\d\d$/.test(doc.source?.checked_at || ''), `${label}: source.checked_at 必須為 YYYY-MM-DD`);
  if (typeof doc.syntax === 'string' && doc.syntax.includes('...') && !(isStr(doc.syntax_short) && isStr(doc.syntax_full))) {
    expect(isStr(doc.syntax_note), `${label}: 語法省略參數時必須註明 syntax_note`);
  }
}
if (errors.length) {
  console.error(`✗ 資料驗證失敗（${errors.length} 項）：\n` + errors.map(x => ` - ${x}`).join('\n'));
  process.exit(1);
}
console.log(`✓ 資料驗證通過，共 ${seen.size} 篇函式文件。`);

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '..');
const fixture = 'data/python/numpy/mean.json';

function validate(t, update) {
  const workspace = mkdtempSync(join(tmpdir(), 'library-wiki-data-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  cpSync(join(root, 'data'), join(workspace, 'data'), { recursive: true });
  mkdirSync(join(workspace, 'scripts'));
  const validator = join(workspace, 'scripts/validate.mjs');
  cpSync(join(root, 'scripts/validate.mjs'), validator);
  const docPath = join(workspace, fixture);
  const indexPath = join(workspace, 'data/index.json');
  const doc = JSON.parse(readFileSync(docPath, 'utf8'));
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  update(doc, index);
  writeFileSync(docPath, JSON.stringify(doc));
  writeFileSync(indexPath, JSON.stringify(index));
  return spawnSync(process.execPath, [validator], { encoding: 'utf8' });
}

test('既有格式可省略新版欄位', t => {
  const result = validate(t, (doc, index) => {
    delete index.libraries;
    const item = index.functions.find(entry => entry.id === doc.id);
    delete item.category;
    delete item.keywords;
    for (const key of ['category', 'keywords', 'syntax_short', 'syntax_full', 'related_ids']) delete doc[key];
    for (const param of doc.parameters) {
      for (const key of ['accepted_values', 'notes', 'example_id']) delete param[key];
    }
    for (const example of doc.examples) delete example.id;
  });
  assert.equal(result.status, 0, result.stderr);
});

test('拒絕省略的完整語法及失效的關聯', t => {
  const result = validate(t, doc => {
    doc.syntax_full = 'numpy.mean(a, ...)';
    doc.related_ids = ['python/numpy/unknown'];
    doc.parameters[1].example_id = 'unknown';
  });
  assert.equal(result.status, 1);
  for (const field of ['syntax_full', 'related_ids', 'example_id']) assert.match(result.stderr, new RegExp(field));
});

test('新版文件欄位須同步至搜尋索引', t => {
  const result = validate(t, (doc, index) => {
    delete index.functions.find(item => item.id === doc.id).keywords;
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /keywords 不一致/);
});

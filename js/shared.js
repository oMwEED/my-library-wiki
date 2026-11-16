export async function loadIndex() {
  const response = await fetch('./data/index.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`無法讀取函式索引（HTTP ${response.status}）`);
  const data = await response.json();
  if (!Array.isArray(data.functions)) throw new Error('函式索引格式不正確');
  return data;
}
export const byId = (id) => document.getElementById(id);
export function element(tag, options = {}, ...children) {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.text !== undefined) el.textContent = options.text;
  if (options.href) el.setAttribute('href', options.href);
  if (options.title) el.title = options.title;
  if (options.target) el.target = options.target;
  if (options.rel) el.rel = options.rel;
  if (options.ariaLabel) el.setAttribute('aria-label', options.ariaLabel);
  for (const c of children) if (c) el.append(c);
  return el;
}
export function detailHref(item) { return `./function.html?id=${encodeURIComponent(item.id)}`; }
export const categoryId = category => `category-${category}`;
export function libraryHref(name, category) {
  const hash = category ? `#${encodeURIComponent(categoryId(category))}` : '';
  return `./index.html?library=${encodeURIComponent(name)}${hash}`;
}
export function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    const category = item.category || '未分類';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }
  for (const group of groups.values()) group.sort((a, b) => a.title.localeCompare(b.title, 'en'));
  return groups;
}
export function matchingFunctions(items, query) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return items;
  return items.filter(item => {
    const fields = [item.symbol, item.title, item.library, item.language, item.summary, item.category, ...(item.keywords ?? [])]
      .filter(Boolean).map(value => value.toLowerCase());
    return terms.every(term => fields.some(field => field.includes(term)));
  });
}
export function setError(container, message) {
  const notice = element('p', { className: 'notice error', text: message });
  notice.setAttribute('role', 'alert');
  container.replaceChildren(notice);
}

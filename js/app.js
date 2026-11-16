import {
  byId, categoryId, detailHref, element, groupByCategory, libraryHref, loadIndex, matchingFunctions, setError
} from './shared.js';
import { setupSearch } from './search.js';

const view = byId('wiki-view');
const url = new URL(location.href);
const query = url.searchParams.get('q');
const library = url.searchParams.get('library');
const language = url.searchParams.get('language');
const languageHref = name => `./index.html?language=${encodeURIComponent(name)}`;

function emptyResults() {
  return element('div', { className: 'empty-state' },
    element('h2', { text: '找不到符合的函式' }),
    element('p', { className: 'muted', text: '目前的搜尋條件沒有相符的文件。' }));
}

function functionList(items) {
  return element('ul', { className: 'function-list' }, ...items.map(item =>
    element('li', {}, element('a', { className: 'function-card', href: detailHref(item) },
      element('code', { className: 'function-name', text: item.title }),
      element('span', { className: 'function-library', text: item.library }),
      element('span', { className: 'function-summary', text: item.summary }),
      element('span', { className: 'card-cta', text: '查看文件 →' })))));
}

function libraryCard({ name, description, items }, { href = libraryHref(name), heading = 'h3' } = {}) {
  return element('li', {}, element('a', { className: 'library-card', href },
    element(heading, { text: name }),
    element('p', { text: description }),
    element('span', { className: 'muted', text: `${items.length} 篇函式` })));
}

function showHome(languages) {
  const cards = [...languages].map(([name, libs]) =>
    libraryCard({
      name,
      description: libs.map(lib => lib.name).join('、'),
      items: libs.flatMap(lib => lib.items)
    }, { href: languageHref(name) }));
  const heading = element('h2', { text: '程式語言' });
  view.replaceChildren(heading, cards.length
    ? element('ul', { className: 'library-grid' }, ...cards)
    : element('p', { className: 'notice', text: '目前沒有收錄的函式庫。' }));
}

function showLanguage(libraries) {
  document.title = `${language} — Library Wiki`;
  view.replaceChildren(element('a', { className: 'breadcrumb', href: './index.html', text: '首頁' }),
    element('h1', { text: language }),
    element('ul', { className: 'library-grid' }, ...libraries.map(lib => libraryCard(lib, { heading: 'h2' }))));
}

function showMissing(title) {
  view.replaceChildren(element('h1', { text: title }), element('a', { href: './index.html', text: '返回首頁' }));
}

function showResults(items, libraries) {
  document.title = '搜尋結果 — Library Wiki';
  const found = matchingFunctions(items, query);
  const filter = element('select', { ariaLabel: '依函式庫篩選' },
    element('option', { text: '全部函式庫' }));
  filter.firstElementChild.value = '';
  for (const lib of libraries) filter.add(new Option(lib.name, lib.name));
  filter.value = libraries.some(lib => lib.name === library) ? library : '';
  const count = element('span', { className: 'muted' });
  count.setAttribute('role', 'status');
  const results = element('div');
  function render() {
    const matches = filter.value ? found.filter(item => item.library === filter.value) : found;
    count.classList.toggle('visually-hidden', !matches.length);
    count.textContent = matches.length ? `${matches.length} 篇函式` : '找不到符合的函式';
    results.replaceChildren(matches.length ? functionList(matches) : emptyResults());
  }
  filter.addEventListener('change', () => {
    if (filter.value) url.searchParams.set('library', filter.value);
    else url.searchParams.delete('library');
    history.replaceState(null, '', url);
    render();
  });
  view.replaceChildren(element('h1', { text: '搜尋結果' }),
    query.trim() ? element('p', { className: 'page-intro muted', text: `「${query.trim()}」` }) : null,
    element('div', { className: 'filter-head' }, filter, count), results);
  render();
}

function showLibrary(lib) {
  document.title = `${lib.name} — Library Wiki`;
  const groups = groupByCategory(lib.items);
  const input = element('input', { ariaLabel: `搜尋 ${lib.name} 函式` });
  input.type = 'search';
  input.placeholder = `搜尋 ${lib.name} 函式`;
  const filter = element('div', { className: 'local-search', ariaLabel: '函式庫內搜尋' }, input);
  filter.setAttribute('role', 'search');
  const results = element('div', { className: 'category-results' });
  const status = element('span', { className: 'visually-hidden' });
  status.setAttribute('role', 'status');
  function render() {
    const sections = [];
    let count = 0;
    for (const [category, items] of groups) {
      const matches = matchingFunctions(items, input.value);
      if (!matches.length) continue;
      count += matches.length;
      const heading = element('h2', {}, element('span', { text: category }),
        element('span', { className: 'category-count muted', text: `${matches.length} 篇函式` }));
      const section = element('section', { className: 'library-category' }, heading, functionList(matches));
      section.id = categoryId(category);
      sections.push(section);
    }
    status.textContent = count ? `${count} 篇函式` : '找不到符合的函式';
    results.replaceChildren(...(sections.length ? sections : [emptyResults()]));
  }
  input.addEventListener('input', render);
  const parentLanguage = lib.items[0].language;
  view.replaceChildren(element('a', { className: 'breadcrumb', href: languageHref(parentLanguage), text: parentLanguage }),
    element('h1', { text: lib.name }), element('p', { className: 'page-intro muted', text: lib.description }),
    filter, status, results);
  render();
  const target = [...results.children].find(section => '#' + encodeURIComponent(section.id) === location.hash);
  target?.scrollIntoView();
}

async function init() {
  byId('home-search').hidden = [query, library, language].some(value => value !== null);
  if (query !== null) document.querySelector('.top-search input').value = query;
  try {
    const { functions, libraries: metadata = [] } = await loadIndex();
    setupSearch(functions);
    const grouped = new Map();
    for (const item of functions) {
      if (!grouped.has(item.library)) grouped.set(item.library, []);
      grouped.get(item.library).push(item);
    }
    const libraries = [...grouped].map(([name, items]) => ({
      name, items, description: metadata.find(lib => lib.name === name)?.description ?? `${items[0].language} 函式參考文件。`
    }));
    const languages = new Map();
    for (const lib of libraries) {
      const name = lib.items[0].language;
      if (!languages.has(name)) languages.set(name, []);
      languages.get(name).push(lib);
    }
    if (query !== null) showResults(functions, libraries);
    else if (library !== null) {
      const lib = libraries.find(lib => lib.name === library);
      if (lib) showLibrary(lib);
      else showMissing('找不到此函式庫');
    } else if (language !== null) {
      const libs = languages.get(language);
      if (libs) showLanguage(libs);
      else showMissing('找不到此語言');
    } else showHome(languages);
  } catch (error) {
    setError(view, `${error.message}。請透過 HTTP 伺服器開啟網站。`);
  }
}
init();

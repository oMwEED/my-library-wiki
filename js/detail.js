import { byId, detailHref, element, groupByCategory, libraryHref, loadIndex, setError } from './shared.js';
import { setupSearch } from './search.js';

const content = byId('doc-content');

function section(id, title, english, ...children) {
  const heading = element('h2', {},
    element('span', { text: title }),
    element('span', { text: english, className: 'section-english' }));
  heading.id = id + '-heading';
  heading.lastElementChild.lang = 'en';
  const node = element('section', { className: 'doc-section' }, heading, ...children);
  node.id = id;
  return node;
}

function listOfNotes(notes) {
  return element('ul', { className: 'notes' }, ...notes.map(text => element('li', { text })));
}

function highlight(code, text, language) {
  code.replaceChildren();
  if (language.toLowerCase() !== 'python') {
    code.textContent = text;
    return;
  }

  // shortcut: 基本 Python 語法著色，遇到需解析 f-string 內部等情況時再導入完整高亮器。
  const tokens = /(?<comment>#[^\n]*)|(?<string>"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(?<keyword>\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b)|(?<number>\b\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?\b)/g;
  let end = 0;
  for (const token of text.matchAll(tokens)) {
    const kind = Object.keys(token.groups).find(key => token.groups[key] !== undefined);
    code.append(text.slice(end, token.index), element('span', { className: 'token-' + kind, text: token[0] }));
    end = token.index + token[0].length;
  }
  code.append(text.slice(end));
}

function codeBlock(language, label) {
  const code = element('code');
  const pre = element('pre', { ariaLabel: label }, code);
  pre.tabIndex = 0;
  const copy = element('button', { className: 'copy-btn', text: '複製', ariaLabel: '複製' + label });
  copy.type = 'button';
  const feedback = element('span', { className: 'copy-feedback' });
  feedback.setAttribute('role', 'status');
  copy.addEventListener('click', async () => {
    feedback.textContent = '';
    try {
      await navigator.clipboard.writeText(code.textContent);
      feedback.textContent = '已複製';
    } catch {
      feedback.textContent = '複製失敗';
    }
  });
  const panel = element('div', { className: 'code-panel' },
    element('div', { className: 'code-toolbar' },
      element('span', { className: 'code-language', text: language }),
      element('span', { className: 'copy-controls' }, feedback, copy)), pre);
  return {
    panel,
    setText(text) {
      feedback.textContent = '';
      highlight(code, text, language);
    }
  };
}

function syntaxSection(doc) {
  const full = doc.syntax_full || doc.syntax;
  const short = doc.syntax_full && doc.syntax_short;
  const code = codeBlock(doc.language, '語法');
  code.setText(short || full);
  const block = section('syntax', '語法', 'Syntax', code.panel);
  if (short && short !== full) {
    let expanded = false;
    code.panel.id = 'signature';
    const toggle = element('button', { className: 'text-button', text: '顯示完整語法' });
    const note = element('span', { className: 'helper-note', text: '目前顯示精簡語法。' });
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', code.panel.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      expanded = !expanded;
      code.setText(expanded ? full : short);
      toggle.textContent = expanded ? '收合語法' : '顯示完整語法';
      toggle.setAttribute('aria-expanded', String(expanded));
      note.hidden = expanded;
    });
    block.append(element('div', { className: 'syntax-actions' }, toggle, note));
  } else if (doc.syntax_note) {
    block.append(element('p', { className: 'helper-note', text: doc.syntax_note }));
  }
  return block;
}

function examplesSection(doc) {
  const code = codeBlock(doc.language, '範例程式碼');
  const choices = element('select', { className: 'example-select', ariaLabel: '選擇程式碼範例' });
  doc.examples.forEach((example, index) => choices.add(new Option(example.title, index)));
  const singleTitle = element('h3', { text: doc.examples[0].title });
  const output = element('pre', { className: 'output-panel', ariaLabel: '預期輸出' });
  output.tabIndex = 0;
  const status = element('span', { className: 'visually-hidden' });
  status.setAttribute('role', 'status');
  const panel = element('div', { className: 'example-content' }, code.panel,
    element('h3', { className: 'output-label', text: '預期輸出' }), output);
  const block = section('examples', '範例', 'Examples',
    doc.examples.length > 1 ? choices : singleTitle, panel, status);
  block.classList.add('examples-section');
  block.tabIndex = 0;
  block.setAttribute('aria-labelledby', 'examples-heading');
  let displayed;
  function show(index) {
    if (index === displayed) return;
    const example = doc.examples[index];
    code.setText(example.code);
    output.textContent = example.output;
    choices.value = String(index);
    if (displayed !== undefined) {
      status.textContent = '已顯示範例：' + example.title;
      panel.getAnimations().forEach(animation => animation.cancel());
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        panel.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 180 });
      }
    }
    displayed = index;
  }
  choices.addEventListener('change', () => show(Number(choices.value)));
  show(0);
  return { block, show };
}

function parametersSection(doc, showExample) {
  if (!doc.parameters.length) return section('parameters', '參數', 'Parameters',
    element('p', { className: 'muted', text: '此函式沒有列出獨立命名參數。' }));

  const recent = [];
  const rows = doc.parameters.map((param, index) => {
    const example = param.example_id
      ? doc.examples.findIndex(item => item.id === param.example_id) : -1;
    const button = element('button', { className: 'parameter-toggle' },
      element('code', { className: 'parameter-name', text: param.name }),
      element('span', { className: 'parameter-required', text: param.required ? '必填' : '選填' }),
      element('code', { className: 'parameter-type', text: param.type }),
      element('span', { className: 'parameter-purpose', text: param.description }));
    button.type = 'button';
    button.id = 'parameter-toggle-' + index;
    const link = example < 0 ? null : element('a', {
      href: '#examples',
      text: '查看 ' + param.name + ' 範例與輸出'
    });
    const details = element('div', { className: 'parameter-details' },
      element('dl', {},
        element('dt', { text: '預設值' }),
        element('dd', {}, param.default == null
          ? element('span', { text: param.required ? '無（必填）' : '未於來源明確列出' })
          : element('code', { text: param.default })),
        element('dt', { text: '接受的值／限制' }),
        element('dd', { text: param.accepted_values || '未於來源明確列出' }),
        param.notes?.length ? element('dt', { text: '注意事項' }) : null,
        param.notes?.length ? element('dd', {}, listOfNotes(param.notes)) : null),
      link);
    details.id = 'parameter-' + index;
    button.setAttribute('aria-controls', details.id);
    function expand(open) {
      button.setAttribute('aria-expanded', String(open));
      details.hidden = !open;
    }
    expand(false);
    function select() {
      const previous = recent.indexOf(index);
      if (previous >= 0) recent.splice(previous, 1);
      recent.push(index);
      showExample(Math.max(0, example));
    }
    button.addEventListener('click', () => {
      const open = details.hidden;
      expand(open);
      if (open) {
        select();
      } else {
        const previous = recent.indexOf(index);
        if (previous >= 0) {
          recent.splice(previous, 1);
          if (previous === recent.length) showExample(Math.max(0, rows[recent.at(-1)]?.example ?? 0));
        }
      }
    });
    link?.addEventListener('click', () => {
      select();
      byId('examples').focus({ preventScroll: true });
    });
    return { entry: element('li', { className: 'parameter-row' }, button, details), expand, example };
  });

  const all = element('button', { className: 'text-button', text: '展開全部' });
  const none = element('button', { className: 'text-button', text: '收合全部' });
  all.type = none.type = 'button';
  all.addEventListener('click', () => rows.forEach(row => row.expand(true)));
  none.addEventListener('click', () => {
    rows.forEach(row => row.expand(false));
    recent.length = 0;
    showExample(0);
  });
  return section('parameters', '參數', 'Parameters',
    element('div', { className: 'parameter-actions' }, all, none),
    element('ul', { className: 'parameter-list' }, ...rows.map(row => row.entry)));
}

function breadcrumbs(doc, category) {
  const items = [
    element('a', { href: './index.html', text: '首頁' }),
    element('a', { href: libraryHref(doc.library), text: doc.library }),
    element('a', { href: libraryHref(doc.library, category), text: category }),
    element('code', { text: doc.title })
  ];
  items.at(-1).setAttribute('aria-current', 'page');
  return element('nav', { className: 'breadcrumbs', ariaLabel: '麵包屑' },
    element('ol', {}, ...items.map(item => element('li', {}, item))));
}

function sectionNavigation(sections, exampleSection) {
  const links = sections.map(node => element('a', {
    href: '#' + node.id, text: node.querySelector('h2 span').textContent
  }));
  const nav = element('nav', { className: 'section-nav', ariaLabel: '文件章節' }, ...links);
  const wide = matchMedia('(min-width: 56rem)');
  for (const section of sections) {
    if (section !== exampleSection) section.tabIndex = -1;
  }
  function sync() {
    const bottom = document.querySelector('.topbar').getBoundingClientRect().bottom + nav.offsetHeight + 24;
    const candidates = wide.matches ? sections.slice(0, -1) : sections;
    const focused = sections.indexOf(document.activeElement);
    const atEnd = Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight;
    let active = 0;
    if (exampleSection.contains(document.activeElement) && exampleSection.getBoundingClientRect().bottom > bottom) {
      active = sections.length - 1;
    } else if (atEnd && focused >= 0 && sections[focused].getBoundingClientRect().top > bottom) {
      active = focused;
    } else {
      for (const [index, section] of candidates.entries()) {
        if (section.getBoundingClientRect().top <= bottom) active = index;
      }
    }
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      sync();
    });
  }
  for (const [index, link] of links.entries()) {
    link.addEventListener('click', () => {
      sections[index].focus({ preventScroll: true });
      schedule();
    });
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  document.addEventListener('focusin', schedule);
  document.addEventListener('focusout', schedule);
  schedule();
  return nav;
}

function relatedSection(doc, entries, siblings) {
  const explicit = [...new Set(doc.related_ids ?? [])]
    .map(id => entries.find(item => item.id === id && item.id !== doc.id)).filter(Boolean);
  const related = explicit.length ? explicit : (siblings ?? []).filter(item => item.id !== doc.id);
  if (!related.length) return null;
  return section('related', '相關函式', 'Related',
    element('ul', { className: 'related-list' }, ...related.map(item => element('li', {},
      element('a', { href: detailHref(item) }, element('code', { text: item.title })),
      element('p', { className: 'muted', text: item.summary })))));
}

function adjacentNavigation(siblings, id) {
  const index = siblings.findIndex(item => item.id === id);
  const prev = siblings[index - 1];
  const next = siblings[index + 1];
  if (!prev && !next) return null;
  const links = [[prev, '上一個函式', 'prev'], [next, '下一個函式', 'next']];
  return element('nav', { className: 'adjacent-nav', ariaLabel: '相鄰函式' },
    ...links.map(([item, label, rel]) => item ? element('a', { href: detailHref(item), rel },
      element('span', { className: 'muted', text: label }), element('code', { text: item.title })) : null));
}

function display(doc, item, entries) {
  document.title = doc.title + ' — Library Wiki';
  const category = item.category || '未分類';
  const groups = groupByCategory(entries.filter(entry => entry.library === item.library));
  const version = doc.source.library_version === 'unverified'
    ? '適用版本未驗證' : '適用版本 ' + doc.source.library_version;
  const official = /^https:\/\//i.test(doc.source.url)
    ? element('a', { href: doc.source.url, target: '_blank', rel: 'noopener noreferrer', text: '官方文件 ↗' })
    : null;
  const header = element('header', { className: 'doc-head' },
    element('h1', { text: doc.title }),
    element('div', { className: 'meta' }, element('span', { text: doc.library }),
      element('span', { text: version }), official),
    element('p', { className: 'doc-summary', text: doc.summary }));
  const examples = examplesSection(doc);
  const syntax = syntaxSection(doc);
  const parameters = parametersSection(doc, examples.show);
  const returns = section('returns', '回傳值', 'Returns',
    element('div', { className: 'return-box' }, element('code', { text: doc.returns.type }),
      element('p', { text: doc.returns.description })));
  const sections = [syntax, parameters, returns, examples.block];
  const nav = sectionNavigation(sections, examples.block);
  const notes = doc.notes?.length ? section('notes', '注意事項', 'Notes', listOfNotes(doc.notes)) : null;

  content.replaceChildren(breadcrumbs(doc, category), header, nav, element('article', {},
    element('div', { className: 'doc-grid' },
      element('div', { className: 'doc-copy' }, syntax, parameters, returns),
      element('div', { className: 'example-column' }, examples.block)),
    element('div', { className: 'doc-extras' }, notes, relatedSection(doc, entries, groups.get(category)),
      adjacentNavigation([...groups.values()].flat(), doc.id))));
  content.append(element('p', { className: 'doc-checked muted', text: '來源查核日期 ' + doc.source.checked_at }));

  const target = sections.find(node => '#' + node.id === location.hash);
  if (target) {
    target.focus({ preventScroll: true });
    target.scrollIntoView();
  }
}

async function init() {
  try {
    const { functions: entries } = await loadIndex();
    setupSearch(entries);
    const id = new URLSearchParams(location.search).get('id');
    if (!id) throw new Error('網址缺少函式 ID，請從首頁選擇函式。');
    const item = entries.find(entry => entry.id === id);
    if (!item) throw new Error('找不到這篇函式文件。');
    if (item.path !== 'data/' + item.id + '.json' ||
        !/^data\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\.json$/.test(item.path)) {
      throw new Error('函式文件路徑格式不正確。');
    }
    const response = await fetch('./' + item.path, { cache: 'no-cache' });
    if (!response.ok) throw new Error('無法讀取文件（HTTP ' + response.status + '）');
    display(await response.json(), item, entries);
  } catch (error) {
    setError(content, error.message);
  }
}
init();

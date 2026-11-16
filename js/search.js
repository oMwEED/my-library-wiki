import { detailHref, element, matchingFunctions } from './shared.js';

export function setupSearch(items) {
  document.querySelectorAll('[data-search]').forEach((form, index) => {
    const input = form.elements.q;
    const list = element('div', { className: 'suggestions' });
    const status = element('span', { className: 'visually-hidden' });
    list.id = `suggestions-${index}`;
    list.hidden = true;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', '搜尋建議');
    status.setAttribute('role', 'status');
    form.append(list, status);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', list.id);

    let results = [];
    let selected = -1;

    function close() {
      selected = -1;
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      status.textContent = '';
    }

    function update() {
      close();
      const query = input.value.trim();
      results = query ? matchingFunctions(items, query).slice(0, 6) : [];
      list.replaceChildren(...results.map((item, position) => {
        const option = element('div', { className: 'suggestion' },
          element('code', { text: item.title }),
          element('span', { className: 'suggestion-library', text: item.library }),
          element('span', { className: 'suggestion-summary', text: item.summary }));
        option.id = `${list.id}-${position}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.addEventListener('click', () => { location.href = detailHref(item); });
        return option;
      }));
      if (results.length) {
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        status.textContent = `${results.length} 項搜尋建議`;
      }
    }

    input.addEventListener('input', event => { if (!event.isComposing) update(); });
    input.addEventListener('compositionend', update);
    input.addEventListener('focus', update);
    input.addEventListener('blur', close);
    list.addEventListener('pointerdown', event => event.preventDefault());
    document.addEventListener('pointerdown', event => {
      if (!form.contains(event.target)) close();
    });
    input.addEventListener('keydown', event => {
      if (event.isComposing) return;
      if (event.key === 'Enter' && !list.hidden && selected >= 0) {
        event.preventDefault();
        location.href = detailHref(results[selected]);
        return;
      }
      if (event.key === 'Escape' && !list.hidden) {
        event.preventDefault();
        close();
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (list.hidden) update();
      if (!results.length) return;
      event.preventDefault();
      if (selected >= 0) list.children[selected].setAttribute('aria-selected', 'false');
      selected = event.key === 'ArrowDown'
        ? (selected + 1) % results.length
        : (selected <= 0 ? results.length - 1 : selected - 1);
      const option = list.children[selected];
      option.setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    });
    if (document.activeElement === input) update();
  });
}

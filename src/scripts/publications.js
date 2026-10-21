const page = document.querySelector('[data-publications]');
const groups = page.querySelector('[data-groups]');

if (groups.querySelector('li')) {
  const byType = [...groups.querySelectorAll('section')];
  const entries = [...groups.querySelectorAll('li')].map((li) => ({ li, home: li.parentElement }));
  const empty = page.querySelector('[data-empty]');

  const place = (year) => (/^\d+$/.test(year) ? -Number(year) : 0);
  const years = [...new Set(entries.map(({ li }) => li.dataset.year))].sort((a, b) => place(a) - place(b));
  const byYear = new Map(
    years.map((year) => {
      const [section, heading, list] = [byType[0], byType[0].querySelector('h2'), byType[0].querySelector('ol')].map((e) => e.cloneNode(false));
      section.removeAttribute('id');
      section.hidden = true;
      heading.textContent = year;
      section.append(heading, list);
      groups.append(section);
      return [year, { section, list }];
    }),
  );

  let show = 'all';
  let arrange = 'type';

  const update = () => {
    for (const { li, home } of entries) {
      (arrange === 'type' ? home : byYear.get(li.dataset.year).list).append(li);
      li.hidden = show !== 'all' && li.dataset.kind !== show;
    }
    const filled = (section) => section.querySelector('li:not([hidden])') !== null;
    for (const section of byType) section.hidden = arrange !== 'type' || !filled(section);
    for (const { section } of byYear.values()) section.hidden = arrange !== 'year' || !filled(section);
    empty.hidden = groups.querySelector('li:not([hidden])') !== null;
  };

  const choices = (selector, choose) => {
    const buttons = [...page.querySelectorAll(selector)];
    for (const button of buttons) {
      button.addEventListener('click', () => {
        for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
        choose(button);
        update();
      });
    }
  };
  choices('[data-show]', (button) => {
    show = button.dataset.show;
  });
  choices('[data-arrange]', (button) => {
    arrange = button.dataset.arrange;
  });

  for (const button of groups.querySelectorAll('[data-hide]')) {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    const label = button.querySelector('span');
    const closed = label.textContent;
    button.addEventListener('click', () => {
      const opening = panel.hidden;
      panel.hidden = !opening;
      button.setAttribute('aria-expanded', String(opening));
      label.textContent = opening ? button.dataset.hide : closed;
    });
  }

  for (const button of groups.querySelectorAll('[data-copy]')) {
    const source = button.previousElementSibling;
    const label = button.querySelector('span');
    const idle = label.textContent;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(source.innerText.replaceAll('\u00a0', ' '));
        label.textContent = 'Copied';
        setTimeout(() => {
          label.textContent = idle;
        }, 2000);
      } catch {}
    });
  }
}

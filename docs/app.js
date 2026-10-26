const KEY = "chernila-41226-v1";
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const FULL = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
const PAIRS = [
  { n: 1, time: "8:00–9:30" },
  { n: 2, time: "9:40–11:10" },
  { n: 3, time: "11:20–12:50" },
  { n: 4, time: "13:30–15:00" },
  { n: 5, time: "15:10–16:40" },
  { n: 6, time: "16:50–18:20" },
];
const TABS = [
  ["home", "Главная"],
  ["notes", "Конспекты"],
  ["pairs", "Пары"],
  ["board", "Доска"],
  ["links", "Ссылки"],
];
const KINDS = ["лекция", "практика", "лабораторная", "другое"];
const LINKS = [
  ["https://dalgau.ru/", "Сайт ДальГАУ", "Новости университета и факультеты"],
  ["https://dalgau.fliptable.ru/", "Электронное расписание", "Официальная доска пар"],
  ["https://lk.dalgau.ru", "Личный кабинет", "Оценки, приказы, документы"],
  ["https://eiop.dalgau.ru/", "Электронная среда", "Курсы и учебные материалы"],
  ["https://dalgau.ru/about_the_university/fakultety/", "Факультеты", "Кафедры и корпуса"],
];

function seed() {
  return {
    version: 1,
    notes: [
      {
        id: "seed-howto",
        subject: "Общее",
        title: "Как вести тетрадь",
        kind: "другое",
        updatedAt: "2026-10-25T12:00:00.000Z",
        body: "Это общая тетрадь группы 4-1226 Дальневосточного ГАУ.\n\nКонспект, который вы добавляете, хранится только в этом браузере — на сервер он не уходит. Чтобы им пользовалась вся группа, нажмите «Выгрузить» и отправьте файл в чат. Остальные открывают «Загрузить».\n\nСюда не стоит писать пароли, телефоны и чужие документы: сайт открытый, а файл тетради можно переслать.\n\nОфициальные пары смотрите в электронном расписании. Вкладка «Пары» — ваша копия, время в ней шаблонное, клетки можно поправить.",
      },
    ],
    posts: [
      {
        id: "seed-open",
        title: "Тетрадь группы открыта",
        body: "Дедлайны, переносы пар и сборы пишите на этой доске. Важное отмечайте штампом.",
        important: true,
        date: "2026-10-25",
      },
    ],
    slots: {},
  };
}

function esc(value) {
  const map = {
    "&": "&" + "amp;",
    "<": "&" + "lt;",
    ">": "&" + "gt;",
    '"': "&" + "quot;",
    "'": "&" + "#39;",
  };
  return String(value).replace(/[&<>"']/g, (ch) => map[ch]);
}

function parseLedger(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.notes) || !Array.isArray(raw.posts)) return null;
  return {
    version: 1,
    notes: raw.notes.map((note) => ({
      id: typeof note.id === "string" ? note.id : crypto.randomUUID(),
      subject: typeof note.subject === "string" && note.subject.trim() ? note.subject.trim() : "Без предмета",
      title: typeof note.title === "string" && note.title.trim() ? note.title.trim() : "Без названия",
      body: typeof note.body === "string" ? note.body : "",
      kind: KINDS.includes(note.kind) ? note.kind : "другое",
      updatedAt: typeof note.updatedAt === "string" ? note.updatedAt : new Date().toISOString(),
    })),
    posts: raw.posts.map((post) => ({
      id: typeof post.id === "string" ? post.id : crypto.randomUUID(),
      title: typeof post.title === "string" && post.title.trim() ? post.title.trim() : "Без названия",
      body: typeof post.body === "string" ? post.body : "",
      important: Boolean(post.important),
      date: typeof post.date === "string" ? post.date : new Date().toISOString().slice(0, 10),
    })),
    slots: Object.fromEntries(
      Object.entries(raw.slots || {}).filter(([key, slot]) => /^[0-5]-[1-6]$/.test(key) && slot && typeof slot === "object").map(([key, slot]) => [
        key,
        {
          subject: typeof slot.subject === "string" ? slot.subject : "",
          room: typeof slot.room === "string" ? slot.room : "",
          who: typeof slot.who === "string" ? slot.who : "",
        },
      ]),
    ),
  };
}

function load() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? parseLedger(JSON.parse(saved)) || seed() : seed();
  } catch {
    return seed();
  }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function formatDay(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function todayIndex() {
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

const ui = {
  data: load(),
  tab: "home",
  query: "",
  subject: "все",
  openNote: null,
  day: 0,
  today: todayIndex(),
  modal: null,
  error: "",
};

ui.day = ui.today > 5 ? 0 : ui.today;

function tabFromHash() {
  const id = location.hash.replace("#", "");
  return TABS.some(([key]) => key === id) ? id : "home";
}

function commit(next) {
  ui.data = next;
  save(next);
  render();
}

function shell(body) {
  const nav = TABS.map(
    ([id, label]) => `<button type="button" data-tab="${id}" ${ui.tab === id ? 'aria-current="page"' : ""}>${label}</button>`,
  ).join("");
  return `
    <header class="mast">
      <div>
        <h1 class="word">Чернила</h1>
        <span class="drip" aria-hidden="true"></span>
        <p class="kicker">Тетрадь группы · Дальневосточный ГАУ</p>
      </div>
      <p class="group-no">4-1226<span>Благовещенск</span></p>
    </header>
    <div class="double"></div>
    <nav class="nav" aria-label="Разделы">${nav}</nav>
    ${body}
    <div class="tools">
      <button type="button" class="btn" data-act="export">Выгрузить</button>
      <button type="button" class="btn" data-act="import">Загрузить</button>
      <button type="button" class="btn" data-act="clear">Очистить</button>
      <span class="hint">только этот браузер</span>
      <a class="hint" href="https://github.com/Arra666/dalgau-4-1226">Репозиторий</a>
      <input class="file" id="file" type="file" accept="application/json,.json" />
    </div>
    ${modalHtml()}`;
}

function modalHtml() {
  if (!ui.modal) return "";
  if (ui.modal.type === "note") {
    const d = ui.modal;
    return `<div class="dialog" role="dialog" aria-modal="true">
      <h2>${d.id ? "Править конспект" : "Новый конспект"}</h2>
      ${ui.error ? `<p class="error">${esc(ui.error)}</p>` : ""}
      <label class="field"><span>Предмет</span><input data-f="subject" value="${esc(d.subject)}" /></label>
      <label class="field"><span>Название</span><input data-f="title" value="${esc(d.title)}" /></label>
      <label class="field"><span>Тип</span><select data-f="kind">${KINDS.map((k) => `<option ${k === d.kind ? "selected" : ""}>${k}</option>`).join("")}</select></label>
      <label class="field"><span>Текст</span><textarea data-f="body">${esc(d.body)}</textarea></label>
      <div class="row"><button class="btn solid" data-act="save-note" type="button">Сохранить</button><button class="btn" data-act="close" type="button">Закрыть</button></div>
    </div>`;
  }
  if (ui.modal.type === "post") {
    const d = ui.modal;
    return `<div class="dialog" role="dialog" aria-modal="true">
      <h2>${d.id ? "Править запись" : "Новая запись"}</h2>
      ${ui.error ? `<p class="error">${esc(ui.error)}</p>` : ""}
      <label class="field"><span>Заголовок</span><input data-f="title" value="${esc(d.title)}" /></label>
      <label class="field"><span>Текст</span><textarea data-f="body">${esc(d.body)}</textarea></label>
      <label class="checks"><input data-f="important" type="checkbox" ${d.important ? "checked" : ""} /> Пометить штампом «важно»</label>
      <div class="row"><button class="btn solid" data-act="save-post" type="button">Сохранить</button><button class="btn" data-act="close" type="button">Закрыть</button></div>
    </div>`;
  }
  const d = ui.modal;
  return `<div class="dialog" role="dialog" aria-modal="true">
    <h2>${DAYS[d.day]} · пара ${d.pair}</h2>
    <p class="muted">${PAIRS[d.pair - 1].time}</p>
    <label class="field"><span>Предмет</span><input data-f="subject" value="${esc(d.subject)}" /></label>
    <label class="field"><span>Аудитория</span><input data-f="room" value="${esc(d.room)}" /></label>
    <label class="field"><span>Кто ведёт</span><input data-f="who" value="${esc(d.who)}" /></label>
    <div class="row">
      <button class="btn solid" data-act="save-slot" type="button">Сохранить</button>
      <button class="btn" data-act="wipe-slot" type="button">Очистить поля</button>
      <button class="btn" data-act="close" type="button">Закрыть</button>
    </div>
  </div>`;
}

function homeHtml() {
  const today = ui.today;
  const posts = [...ui.data.posts].sort((a, b) => b.date.localeCompare(a.date));
  const notes = [...ui.data.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  const post = posts[0];
  let todayBlock = `<p class="preview">На ${FULL[today]} пар пока не вписано. <button type="button" class="btn" data-tab="pairs">Открыть сетку</button></p>`;
  if (today > 5) todayBlock = `<p class="preview">Выходной. Сетка пар начинается с понедельника.</p>`;
  else {
    const filled = PAIRS.map((pair) => ({ pair, slot: ui.data.slots[`${today}-${pair.n}`] })).filter((item) => item.slot?.subject);
    if (filled.length) {
      todayBlock = filled
        .slice(0, 3)
        .map(({ pair, slot }) => `<p class="preview">${pair.n}. ${esc(slot.subject)}${slot.room ? ` · ${esc(slot.room)}` : ""} <span class="when">${pair.time}</span></p>`)
        .join("");
    }
  }
  return `<section class="section">
    <p class="lede">Конспекты, пары и объявления группы 4-1226 на одном листе. Записи живут в этом браузере. Файл можно выгрузить и отправить остальным.</p>
    <div class="card"><p class="meta">Сегодня</p><h3>${FULL[today]}</h3>${todayBlock}</div>
    ${
      post
        ? `<article class="card"><p class="meta">Доска ${post.important ? '<span class="stamp">Важно</span>' : ""} <span>${formatDay(post.date)}</span></p><h3>${esc(post.title)}</h3><p class="preview">${esc(post.body)}</p></article>`
        : ""
    }
    <div class="section"><h2>Свежие конспекты</h2>
      ${notes.length === 0 ? `<p class="empty">Пока пусто.</p>` : notes.map((note) => `<button type="button" class="entry" data-tab="notes"><p class="meta"><span>${esc(note.subject)}</span><span>${esc(note.kind)}</span></p><h3>${esc(note.title)}</h3><p class="when">${formatDay(note.updatedAt)}</p></button>`).join("")}
    </div>
    <hr class="hair" />
    <p class="muted">Дальневосточный государственный аграрный университет<br />Благовещенск, ул. Политехническая, 86<br />Группа 4-1226</p>
  </section>`;
}

function notesHtml() {
  const q = ui.query.trim().toLowerCase();
  const names = ["все", ...new Set(ui.data.notes.map((note) => note.subject))];
  const notes = [...ui.data.notes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((note) => ui.subject === "все" || note.subject === ui.subject)
    .filter((note) => !q || `${note.subject} ${note.title} ${note.body} ${note.kind}`.toLowerCase().includes(q));
  return `<section class="section">
    <div class="row"><h2>Конспекты</h2><button type="button" class="btn solid" data-act="new-note">Новый конспект</button></div>
    <input class="search" data-f="query" value="${esc(ui.query)}" placeholder="Поиск по тексту" aria-label="Поиск по конспектам" />
    <div class="chips">${names.map((name) => `<button type="button" class="chip" data-subject="${esc(name)}" aria-pressed="${ui.subject === name}">${esc(name)}</button>`).join("")}</div>
    <div class="list">
      ${notes.length === 0 ? `<p class="empty">Ничего не нашлось. Добавьте первый конспект.</p>` : ""}
      ${notes
        .map((note) => {
          const open = ui.openNote === note.id;
          return `<article class="card">
            <button type="button" class="entry" data-note="${note.id}">
              <p class="meta"><span>${esc(note.subject)}</span><span>${esc(note.kind)}</span><span>${formatDay(note.updatedAt)}</span></p>
              <h3>${esc(note.title)}</h3>
              ${open ? "" : `<p class="preview">${esc(note.body.slice(0, 140))}</p>`}
            </button>
            ${
              open
                ? `<p class="body">${esc(note.body || "Без текста.")}</p><div class="row"><button type="button" class="btn" data-edit="${note.id}">Править</button><button type="button" class="btn" data-del="${note.id}">Удалить</button></div>`
                : ""
            }
          </article>`;
        })
        .join("")}
    </div>
  </section>`;
}

function pairsHtml() {
  return `<section class="section">
    <h2>Пары</h2>
    <p class="muted">Время — шаблон. Нажмите строку и впишите свою пару, аудиторию и кто ведёт.</p>
    <div class="chips">${DAYS.map((label, index) => `<button type="button" class="day" data-day="${index}" aria-pressed="${ui.day === index}">${label}${ui.today === index ? " · сегодня" : ""}</button>`).join("")}</div>
    <div>${PAIRS.map((pair) => {
      const slot = ui.data.slots[`${ui.day}-${pair.n}`];
      const extra = [slot?.room, slot?.who].filter(Boolean).join(" · ");
      return `<button type="button" class="pair" data-pair="${pair.n}"><span><strong>${pair.n}</strong><time class="when">${pair.time}</time></span><span><strong>${esc(slot?.subject || "Пусто")}</strong><span class="when">${esc(extra || "Нажмите, чтобы заполнить")}</span></span></button>`;
    }).join("")}</div>
  </section>`;
}

function boardHtml() {
  const posts = [...ui.data.posts].sort((a, b) => b.date.localeCompare(a.date));
  return `<section class="section">
    <div class="row"><h2>Доска</h2><button type="button" class="btn solid" data-act="new-post">Новая запись</button></div>
    <div class="list">
      ${posts.length === 0 ? `<p class="empty">Доска пустая.</p>` : ""}
      ${posts
        .map(
          (post) => `<article class="card">
            <p class="meta">${post.important ? '<span class="stamp">Важно</span>' : ""}<span>${formatDay(post.date)}</span></p>
            <h3>${esc(post.title)}</h3>
            <p class="body">${esc(post.body)}</p>
            <div class="row"><button type="button" class="btn" data-edit-post="${post.id}">Править</button><button type="button" class="btn" data-del-post="${post.id}">Удалить</button></div>
          </article>`,
        )
        .join("")}
    </div>
  </section>`;
}

function linksHtml() {
  return `<section class="section"><h2>Ссылки</h2><p class="muted">Официальные адреса университета. Пароли вводите только там, не в этой тетради.</p><div>${LINKS.map(
    ([href, title, note]) => `<a class="link" href="${href}" target="_blank" rel="noreferrer"><strong>${title}</strong><span class="when">${note}</span></a>`,
  ).join("")}</div></section>`;
}

function readModal() {
  if (!ui.modal) return;
  document.querySelectorAll("[data-f]").forEach((el) => {
    if (el.dataset.f === "query") return;
    ui.modal[el.dataset.f] = el.type === "checkbox" ? el.checked : el.value;
  });
}

function render() {
  const app = document.getElementById("app");
  const focus = document.activeElement?.dataset?.f;
  const body = ui.tab === "notes" ? notesHtml() : ui.tab === "pairs" ? pairsHtml() : ui.tab === "board" ? boardHtml() : ui.tab === "links" ? linksHtml() : homeHtml();
  app.innerHTML = shell(body);
  if (focus) {
    const next = app.querySelector(`[data-f="${focus}"]`);
    if (next) {
      next.focus();
      if (next.setSelectionRange && typeof next.value === "string") {
        const pos = next.value.length;
        next.setSelectionRange(pos, pos);
      }
    }
  }
}

document.getElementById("app").addEventListener("click", (event) => {
  const el = event.target.closest("[data-tab], [data-act], [data-subject], [data-note], [data-edit], [data-del], [data-day], [data-pair], [data-edit-post], [data-del-post]");
  if (!el) return;
  if (el.dataset.tab) {
    location.hash = el.dataset.tab === "home" ? "" : el.dataset.tab;
    ui.tab = el.dataset.tab;
    render();
    return;
  }
  if (el.dataset.subject) {
    ui.subject = el.dataset.subject;
    render();
    return;
  }
  if (el.dataset.note) {
    ui.openNote = ui.openNote === el.dataset.note ? null : el.dataset.note;
    render();
    return;
  }
  if (el.dataset.day) {
    ui.day = Number(el.dataset.day);
    render();
    return;
  }
  if (el.dataset.pair) {
    const slot = ui.data.slots[`${ui.day}-${el.dataset.pair}`] || { subject: "", room: "", who: "" };
    ui.modal = { type: "slot", day: ui.day, pair: Number(el.dataset.pair), ...slot };
    render();
    return;
  }
  if (el.dataset.edit) {
    const note = ui.data.notes.find((item) => item.id === el.dataset.edit);
    ui.modal = { type: "note", ...note };
    ui.error = "";
    render();
    return;
  }
  if (el.dataset.del && confirm("Удалить этот конспект?")) {
    commit({ ...ui.data, notes: ui.data.notes.filter((item) => item.id !== el.dataset.del) });
    return;
  }
  if (el.dataset.editPost) {
    const post = ui.data.posts.find((item) => item.id === el.dataset.editPost);
    ui.modal = { type: "post", ...post };
    ui.error = "";
    render();
    return;
  }
  if (el.dataset.delPost && confirm("Снять запись с доски?")) {
    commit({ ...ui.data, posts: ui.data.posts.filter((item) => item.id !== el.dataset.delPost) });
    return;
  }
  const act = el.dataset.act;
  if (act === "new-note") {
    ui.modal = { type: "note", subject: "", title: "", body: "", kind: "лекция" };
    ui.error = "";
    render();
  } else if (act === "new-post") {
    ui.modal = { type: "post", title: "", body: "", important: false };
    ui.error = "";
    render();
  } else if (act === "close") {
    ui.modal = null;
    ui.error = "";
    render();
  } else if (act === "save-note") {
    readModal();
    if (!ui.modal.title.trim()) {
      ui.error = "Нужно название.";
      render();
      return;
    }
    const note = {
      id: ui.modal.id || crypto.randomUUID(),
      subject: ui.modal.subject.trim() || "Без предмета",
      title: ui.modal.title.trim(),
      body: ui.modal.body.trim(),
      kind: KINDS.includes(ui.modal.kind) ? ui.modal.kind : "другое",
      updatedAt: new Date().toISOString(),
    };
    const notes = ui.modal.id ? ui.data.notes.map((item) => (item.id === note.id ? note : item)) : [note, ...ui.data.notes];
    ui.modal = null;
    ui.openNote = note.id;
    commit({ ...ui.data, notes });
  } else if (act === "save-post") {
    readModal();
    if (!ui.modal.title.trim()) {
      ui.error = "Нужен заголовок.";
      render();
      return;
    }
    const existing = ui.data.posts.find((item) => item.id === ui.modal.id);
    const post = {
      id: ui.modal.id || crypto.randomUUID(),
      title: ui.modal.title.trim(),
      body: ui.modal.body.trim(),
      important: Boolean(ui.modal.important),
      date: existing?.date || new Date().toISOString().slice(0, 10),
    };
    const posts = ui.modal.id ? ui.data.posts.map((item) => (item.id === post.id ? post : item)) : [post, ...ui.data.posts];
    ui.modal = null;
    commit({ ...ui.data, posts });
  } else if (act === "wipe-slot") {
    readModal();
    ui.modal.subject = "";
    ui.modal.room = "";
    ui.modal.who = "";
    render();
  } else if (act === "save-slot") {
    readModal();
    const slots = { ...ui.data.slots };
    const key = `${ui.modal.day}-${ui.modal.pair}`;
    if (!ui.modal.subject.trim() && !ui.modal.room.trim() && !ui.modal.who.trim()) delete slots[key];
    else slots[key] = { subject: ui.modal.subject.trim(), room: ui.modal.room.trim(), who: ui.modal.who.trim() };
    ui.modal = null;
    commit({ ...ui.data, slots });
  } else if (act === "export") {
    const blob = new Blob([JSON.stringify(ui.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "chernila-4-1226.json";
    link.click();
    URL.revokeObjectURL(url);
  } else if (act === "import") {
    document.getElementById("file").click();
  } else if (act === "clear" && confirm("Стереть тетрадь только в этом браузере?")) {
    ui.openNote = null;
    commit(seed());
  }
});

document.getElementById("app").addEventListener("input", (event) => {
  if (event.target.dataset.f === "query") {
    ui.query = event.target.value;
    const pos = event.target.selectionStart;
    render();
    const input = document.querySelector("[data-f=query]");
    if (input) {
      input.focus();
      input.setSelectionRange(pos, pos);
    }
  }
});

document.getElementById("app").addEventListener("change", async (event) => {
  if (event.target.id !== "file" || !event.target.files?.[0]) return;
  try {
    const parsed = parseLedger(JSON.parse(await event.target.files[0].text()));
    if (!parsed) {
      alert("Этот файл не похож на тетрадь группы.");
      return;
    }
    if (!confirm("Заменить тетрадь в этом браузере содержимым файла?")) return;
    commit(parsed);
  } catch {
    alert("Не удалось прочитать файл.");
  } finally {
    event.target.value = "";
  }
});

window.addEventListener("hashchange", () => {
  ui.tab = tabFromHash();
  render();
});

ui.tab = tabFromHash();
render();

/* Simple private admin:
   - admin key stored in localStorage
   - reads/writes JSON files in /content
   - uploads images into /images/<category>/
   - commits via Netlify Function: /.netlify/functions/gh-save
*/

const $ = (s) => document.querySelector(s);

const loginCard = $("#loginCard");
const appCard = $("#appCard");
const editorCard = $("#editorCard");
const statusEl = $("#status");

const tabsEl = $("#tabs");
const hintEl = $("#hint");

const loginBtn = $("#loginBtn");
const pingBtn = $("#pingBtn");
const logoutBtn = $("#logoutBtn");
const saveBtn = $("#saveBtn");

const keyInput = $("#adminKey");

const STORAGE_KEY = "HUHA_ADMIN_KEY";

let active = "home";
let state = {
  home: null,
  services: null,
  price: null,
  contact: null,
  gallery: null
};

const TAB_DEFS = [
  { id: "home", label: "Főoldal", file: "content/home.json" },
  { id: "services", label: "Szolgáltatások", file: "content/services.json" },
  { id: "price", label: "Árak", file: "content/price.json" },
  { id: "contact", label: "Kapcsolat", file: "content/contact.json" },
  { id: "gallery", label: "Galéria", file: "content/gallery.json" },
];

function setStatus(text, type = "muted") {
  statusEl.className = type === "ok" ? "ok" : type === "err" ? "err" : "muted";
  statusEl.textContent = text;
}

function getAdminKey() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

function setAdminKey(v) {
  localStorage.setItem(STORAGE_KEY, v);
}

function clearAdminKey() {
  localStorage.removeItem(STORAGE_KEY);
}

async function apiSave({ path, contentBase64, message }) {
  const adminKey = getAdminKey();
  const res = await fetch("/.netlify/functions/gh-save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": adminKey
    },
    body: JSON.stringify({ path, contentBase64, message })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Mentés hiba (${res.status})`);
  return data;
}

async function apiPing() {
  const adminKey = keyInput.value.trim() || getAdminKey();
  const res = await fetch("/.netlify/functions/ping", {
    headers: { "X-Admin-Key": adminKey }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Ping hiba");
  return data;
}

async function loadJson(file) {
  const res = await fetch("/" + file + "?t=" + Date.now());
  if (!res.ok) throw new Error(`Nem találom: /${file}`);
  return await res.json();
}

function renderTabs() {
  tabsEl.innerHTML = "";
  TAB_DEFS.forEach(t => {
    const el = document.createElement("div");
    el.className = "tab" + (t.id === active ? " active" : "");
    el.textContent = t.label;
    el.onclick = async () => {
      active = t.id;
      renderTabs();
      await renderEditor();
    };
    tabsEl.appendChild(el);
  });
}

function inputRow(label, value, onChange, opts = {}) {
  const wrap = document.createElement("div");
  const lab = document.createElement("label");
  lab.textContent = label;

  const inp = opts.multiline ? document.createElement("textarea") : document.createElement("input");
  if (!opts.multiline) inp.type = "text";
  inp.value = value ?? "";
  inp.oninput = () => onChange(inp.value);

  wrap.appendChild(lab);
  wrap.appendChild(inp);
  return wrap;
}

function renderHome() {
  const data = state.home || { title: "", subtitle: "" };
  const card = document.createElement("div");
  card.className = "card";

  card.appendChild(inputRow("Címsor", data.title, v => data.title = v));
  card.appendChild(inputRow("Alcím", data.subtitle, v => data.subtitle = v, { multiline: true }));

  state.home = data;

  hintEl.innerHTML = `Fájl: <code>content/home.json</code>`;
  editorCard.innerHTML = "";
  editorCard.appendChild(card);
}

function renderPrice() {
  const data = state.price || { title: "", text: "" };
  const card = document.createElement("div");
  card.className = "card";

  card.appendChild(inputRow("Címsor", data.title, v => data.title = v));
  card.appendChild(inputRow("Szöveg", data.text, v => data.text = v, { multiline: true }));

  state.price = data;

  hintEl.innerHTML = `Fájl: <code>content/price.json</code>`;
  editorCard.innerHTML = "";
  editorCard.appendChild(card);
}

function renderContact() {
  const data = state.contact || { email: "", phone: "" };
  const card = document.createElement("div");
  card.className = "card";

  card.appendChild(inputRow("Email", data.email, v => data.email = v));
  card.appendChild(inputRow("Telefon", data.phone, v => data.phone = v));

  state.contact = data;

  hintEl.innerHTML = `Fájl: <code>content/contact.json</code>`;
  editorCard.innerHTML = "";
  editorCard.appendChild(card);
}

function renderServices() {
  const data = state.services || { title: "", items: [] };
  const card = document.createElement("div");
  card.className = "card";

  card.appendChild(inputRow("Címsor", data.title, v => data.title = v));

  const listWrap = document.createElement("div");
  listWrap.className = "list";

  const renderList = () => {
    listWrap.innerHTML = "";
    data.items = data.items || [];
    data.items.forEach((it, idx) => {
      const row = document.createElement("div");
      row.className = "list-item";

      const inp = document.createElement("input");
      inp.value = it;
      inp.oninput = () => data.items[idx] = inp.value;

      const actions = document.createElement("div");
      actions.className = "row";

      const up = document.createElement("button");
      up.className = "btn ghost";
      up.type = "button";
      up.textContent = "↑";
      up.onclick = () => {
        if (idx === 0) return;
        [data.items[idx - 1], data.items[idx]] = [data.items[idx], data.items[idx - 1]];
        renderList();
      };

      const down = document.createElement("button");
      down.className = "btn ghost";
      down.type = "button";
      down.textContent = "↓";
      down.onclick = () => {
        if (idx === data.items.length - 1) return;
        [data.items[idx + 1], data.items[idx]] = [data.items[idx], data.items[idx + 1]];
        renderList();
      };

      const del = document.createElement("button");
      del.className = "btn ghost";
      del.type = "button";
      del.textContent = "Törlés";
      del.onclick = () => {
        data.items.splice(idx, 1);
        renderList();
      };

      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(del);

      row.appendChild(inp);
      row.appendChild(actions);
      listWrap.appendChild(row);
    });
  };

  const addBtn = document.createElement("button");
  addBtn.className = "btn ghost";
  addBtn.type = "button";
  addBtn.textContent = "+ Új elem";
  addBtn.onclick = () => {
    data.items.push("");
    renderList();
  };

  card.appendChild(addBtn);
  card.appendChild(listWrap);

  renderList();
  state.services = data;

  hintEl.innerHTML = `Fájl: <code>content/services.json</code>`;
  editorCard.innerHTML = "";
  editorCard.appendChild(card);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = r.result;
      // res: data:image/...;base64,xxxx
      const base64 = String(res).split(",")[1] || "";
      resolve(base64);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function renderGallery() {
  const data = state.gallery || { konyha: [], eloszoba: [], gardrob: [] };

  const card = document.createElement("div");
  card.className = "card";

  const catSelect = document.createElement("select");
  ["konyha", "eloszoba", "gardrob"].forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    catSelect.appendChild(o);
  });

  const uploadInp = document.createElement("input");
  uploadInp.type = "file";
  uploadInp.accept = "image/*";

  const uploadBtn = document.createElement("button");
  uploadBtn.className = "btn primary";
  uploadBtn.type = "button";
  uploadBtn.textContent = "Kép feltöltése a kategóriába";

  const info = document.createElement("p");
  info.className = "muted";
  info.textContent = "Tipp: a képek a /images/<kategória>/ mappába kerülnek, és bekerülnek a gallery.json-ba is.";

  uploadBtn.onclick = async () => {
    const file = uploadInp.files?.[0];
    if (!file) return alert("Válassz képet!");
    const category = catSelect.value;

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ["jpg","jpeg","png","webp"].includes(ext) ? ext : "jpg";
    const filename = `${Date.now()}.${safeExt}`;
    const path = `images/${category}/${filename}`;

    try {
      setStatus("Feltöltés…", "muted");
      const base64 = await fileToBase64(file);

      await apiSave({
        path,
        contentBase64: base64,
        message: `Upload image: ${path}`
      });

      data[category] = data[category] || [];
      // store as string path
      data[category].push(path);

      setStatus("Kép feltöltve. Ne felejtsd el Mentés (commit)-ot!", "ok");
      await renderEditor();
    } catch (e) {
      setStatus(String(e.message || e), "err");
      alert(e.message || e);
    }
  };

  const renderList = (category) => {
    const block = document.createElement("div");
    block.style.marginTop = "16px";

    const h = document.createElement("h3");
    h.textContent = category;
    block.appendChild(h);

    const list = document.createElement("div");
    list.className = "list";

    (data[category] || []).forEach((p, idx) => {
      const row = document.createElement("div");
      row.className = "list-item";

      const left = document.createElement("div");
      left.className = "row";

      const img = document.createElement("img");
      img.className = "thumb";
      img.src = "/" + p;

      const txt = document.createElement("input");
      txt.value = p;
      txt.oninput = () => data[category][idx] = txt.value;

      left.appendChild(img);
      left.appendChild(txt);

      const actions = document.createElement("div");
      actions.className = "row";

      const del = document.createElement("button");
      del.className = "btn ghost";
      del.type = "button";
      del.textContent = "Kivesz";
      del.onclick = () => {
        data[category].splice(idx, 1);
        renderEditor();
      };

      actions.appendChild(del);

      row.appendChild(left);
      row.appendChild(actions);
      list.appendChild(row);
    });

    block.appendChild(list);
    return block;
  };

  const top = document.createElement("div");
  top.className = "grid";
  const left = document.createElement("div");
  left.appendChild(document.createElement("label")).textContent = "Kategória";
  left.appendChild(catSelect);
  const right = document.createElement("div");
  right.appendChild(document.createElement("label")).textContent = "Fájl kiválasztás";
  right.appendChild(uploadInp);
  top.appendChild(left);
  top.appendChild(right);

  card.appendChild(top);
  card.appendChild(document.createElement("div")).style.height = "10px";
  card.appendChild(uploadBtn);
  card.appendChild(info);

  card.appendChild(renderList("konyha"));
  card.appendChild(renderList("eloszoba"));
  card.appendChild(renderList("gardrob"));

  state.gallery = data;

  hintEl.innerHTML = `Fájl: <code>content/gallery.json</code> (képek: <code>/images/…</code>)`;
  editorCard.innerHTML = "";
  editorCard.appendChild(card);
}

async function renderEditor() {
  if (!state[active]) {
    const def = TAB_DEFS.find(t => t.id === active);
    state[active] = await loadJson(def.file);
  }

  editorCard.style.display = "block";

  if (active === "home") return renderHome();
  if (active === "services") return renderServices();
  if (active === "price") return renderPrice();
  if (active === "contact") return renderContact();
  if (active === "gallery") return renderGallery();
}

async function saveActive() {
  const def = TAB_DEFS.find(t => t.id === active);
  const json = JSON.stringify(state[active], null, 2);
  const base64 = btoa(unescape(encodeURIComponent(json)));

  await apiSave({
    path: def.file,
    contentBase64: base64,
    message: `Update ${def.file}`
  });
}

async function initApp() {
  loginCard.style.display = "none";
  appCard.style.display = "block";
  editorCard.style.display = "block";

  renderTabs();
  await renderEditor();
}

loginBtn.onclick = async () => {
  const k = keyInput.value.trim();
  if (!k) return alert("Írd be az admin kulcsot!");
  setAdminKey(k);

  try {
    const p = await apiPing();
    setStatus(`Belépve: ${p.ok}`, "ok");
    await initApp();
  } catch (e) {
    clearAdminKey();
    setStatus("Hibás kulcs vagy nincs function", "err");
    alert(e.message || e);
  }
};

pingBtn.onclick = async () => {
  try {
    const p = await apiPing();
    setStatus(`Kapcsolat OK: ${p.ok}`, "ok");
  } catch (e) {
    setStatus("Kapcsolat hiba", "err");
    alert(e.message || e);
  }
};

logoutBtn.onclick = () => {
  clearAdminKey();
  location.reload();
};

saveBtn.onclick = async () => {
  try {
    setStatus("Mentés (commit)…", "muted");
    await saveActive();
    setStatus("Mentve és commitolva ✅ (Netlify frissít)", "ok");
  } catch (e) {
    setStatus("Mentés hiba", "err");
    alert(e.message || e);
  }
};

(async function boot() {
  const k = getAdminKey();
  if (k) {
    try {
      // try ping
      const res = await fetch("/.netlify/functions/ping", { headers: { "X-Admin-Key": k }});
      if (res.ok) {
        setStatus("Belépve", "ok");
        await initApp();
        return;
      }
    } catch {}
  }
  setStatus("Nincs bejelentkezve", "muted");
})();


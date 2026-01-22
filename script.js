/* script.js – HuHa Bútor
   - Betölti a tartalmat a /content/*.json fájlokból
   - Ha van admin vázlat LocalStorage-ban (KEY), az FELÜLÍRJA a fájltartalmat
   - Kezeli: menü/hash navigáció, extra (admin) szekciók blokkokkal, galéria tabok + rács + lightbox, opcionális főoldali kép
*/

const DRAFT_KEY = "huhabutor_content_draft";

// ---------- Helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Nem tölthető be: ${path} (${res.status})`);
  return await res.json();
}

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i")
    .replace(/ó/g,"o").replace(/ö/g,"o").replace(/ő/g,"o")
    .replace(/ú/g,"u").replace(/ü/g,"u").replace(/ű/g,"u")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

function ensureDraftShape(d) {
  const out = d && typeof d === "object" ? d : {};
  out.home = out.home || { title:"", subtitle:"", image:null };
  out.contact = out.contact || { email:"", phone:"" };
  out.pages = Array.isArray(out.pages) ? out.pages : [];
  out.gallery = out.gallery && typeof out.gallery === "object" ? out.gallery : {};
  return out;
}

function getDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  return ensureDraftShape(safeJsonParse(raw));
}

// Prefer draft value if it exists (not empty), else file value.
function pick(draftVal, fileVal) {
  if (draftVal === undefined || draftVal === null) return fileVal;
  if (typeof draftVal === "string" && draftVal.trim() === "") return fileVal;
  return draftVal;
}

// ---------- DOM expected (index.html) ----------
/*
  - Nav links: .nav-link href="#home|services|price|gallery|contact|<extra>"
  - Sections: .section#home, .section#services, .section#price, .section#gallery, .section#contact
  - Home:
      #homeTitle, #homeSubtitle, optional image: #homeHeroImg (img.hero-img) (ha nincs, nem baj)
  - Services:
      #servicesTitle, #servicesList (ul)
  - Price:
      #priceTitle, #priceText
  - Contact:
      #contactEmail, #contactPhone
  - Gallery:
      #galleryTabs, #galleryGrid
      Lightbox:
        #lightbox, #lightboxImg, #lightboxPrev, #lightboxNext (vagy .lightbox-prev/.lightbox-next)
  - Extra pages:
      <nav class="main-nav">…</nav>
      <main class="site-main"><div class="container">…</div></main>
    A script létrehoz szekciót: <section class="section" id="extraId">…</section>
*/

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value ?? "";
}

function setHtml(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = value ?? "";
}

function setList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = "";
  (items || []).forEach(txt => {
    const li = document.createElement("li");
    li.textContent = txt;
    el.appendChild(li);
  });
}

function setOptionalImage(imgEl, src) {
  if (!imgEl) return;
  if (src && typeof src === "string" && src.trim() !== "") {
    imgEl.src = src;
    imgEl.style.display = "block";
  } else {
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
  }
}

// ---------- Routing (hash sections) ----------
function showSectionByHash() {
  const hash = (location.hash || "#home").replace("#", "");
  const sections = $$(".section");
  const navLinks = $$(".nav-link");

  let target = document.getElementById(hash);
  if (!target) target = document.getElementById("home");

  sections.forEach(s => s.classList.toggle("active", s === target));

  navLinks.forEach(a => {
    const href = a.getAttribute("href") || "";
    const id = href.startsWith("#") ? href.slice(1) : href;
    a.classList.toggle("active", id === (target?.id || "home"));
  });

  // ha anchorozott oldal van, felülre
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Extra pages (admin pages -> blocks) ----------
function ensureExtraNavLink(id, title) {
  const nav = $(".main-nav");
  if (!nav) return;

  const href = `#${id}`;
  let link = $(`.main-nav a.nav-link[href="${href}"]`);
  if (!link) {
    link = document.createElement("a");
    link.className = "nav-link";
    link.href = href;
    link.textContent = title;
    nav.appendChild(link);
  } else {
    link.textContent = title;
  }
}

function ensureExtraSection(id, title) {
  let sec = document.getElementById(id);
  if (!sec) {
    // próbáljuk a site-main > .container alá rakni
    const container = $(".site-main .container") || $(".container") || document.body;

    sec = document.createElement("section");
    sec.className = "section";
    sec.id = id;

    // alap kártya
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h2>${title}</h2><div class="extra-body" data-extra-body></div>`;
    sec.appendChild(card);

    container.appendChild(sec);
  } else {
    // frissítsük a címét ha kell
    const h2 = $("h2", sec);
    if (h2) h2.textContent = title;
  }
  return sec;
}

function renderBlock(block) {
  const wrap = document.createElement("div");

  if (!block || typeof block !== "object") return wrap;

  switch (block.type) {
    case "heading": {
      const h = document.createElement("h3");
      h.textContent = block.text || "";
      wrap.appendChild(h);
      break;
    }
    case "text": {
      const p = document.createElement("p");
      p.style.lineHeight = "1.6";
      p.textContent = block.text || "";
      wrap.appendChild(p);
      break;
    }
    case "list": {
      const ul = document.createElement("ul");
      (block.items || []).forEach(it => {
        const li = document.createElement("li");
        li.textContent = it || "";
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
      break;
    }
    case "image": {
      if (block.src) {
        const img = document.createElement("img");
        img.src = block.src;
        img.alt = block.alt || "";
        img.style.width = "100%";
        img.style.borderRadius = "16px";
        img.style.display = "block";
        img.style.marginTop = "12px";
        wrap.appendChild(img);
      }
      break;
    }
    case "button": {
      const a = document.createElement("a");
      a.className = "btn-primary";
      a.href = block.href || "#contact";
      a.textContent = block.label || "Tovább";
      a.style.display = "inline-block";
      a.style.marginTop = "10px";
      a.style.textDecoration = "none";
      wrap.appendChild(a);
      break;
    }
    default:
      break;
  }

  wrap.style.marginTop = "12px";
  return wrap;
}

function renderExtraPages(draftPages = []) {
  // Töröljük a korábban generált extra szekciók tartalmát, de a szekciókat nem muszáj.
  // Biztonság: csak a draftPages-ben lévőket rendereljük.
  (draftPages || []).forEach(p => {
    if (!p?.id) return;
    const id = slugify(p.id);
    const title = p.title || id;

    ensureExtraNavLink(id, title);
    const sec = ensureExtraSection(id, title);
    const body = $("[data-extra-body]", sec);
    if (!body) return;

    body.innerHTML = "";
    const blocks = Array.isArray(p.blocks) ? p.blocks : [];
    blocks.forEach(b => body.appendChild(renderBlock(b)));
  });
}

// ---------- Gallery (tabs + grid + lightbox) ----------
let LB = {
  open: false,
  images: [],
  index: 0
};

function openLightbox(images, index) {
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  if (!lb || !img) return;

  LB.open = true;
  LB.images = images || [];
  LB.index = Math.max(0, Math.min(index || 0, LB.images.length - 1));

  img.src = LB.images[LB.index];
  lb.style.display = "flex";
}

function closeLightbox() {
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  if (!lb || !img) return;
  LB.open = false;
  img.removeAttribute("src");
  lb.style.display = "none";
}

function stepLightbox(dir) {
  if (!LB.open || !LB.images.length) return;
  LB.index = (LB.index + dir + LB.images.length) % LB.images.length;
  const img = document.getElementById("lightboxImg");
  if (img) img.src = LB.images[LB.index];
}

function wireLightbox() {
  const lb = document.getElementById("lightbox");
  if (lb) {
    lb.addEventListener("click", (e) => {
      // háttérre katt = zár (kép ne zárja)
      if (e.target === lb) closeLightbox();
    });
  }

  const prev = document.getElementById("lightboxPrev") || $(".lightbox-prev");
  const next = document.getElementById("lightboxNext") || $(".lightbox-next");
  if (prev) prev.addEventListener("click", (e) => { e.stopPropagation(); stepLightbox(-1); });
  if (next) next.addEventListener("click", (e) => { e.stopPropagation(); stepLightbox(1); });

  document.addEventListener("keydown", (e) => {
    if (!LB.open) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });
}

function normalizeGalleryObject(g) {
  // várt forma: { konyha: ["images/...jpg", ...], eloszoba: [...], ... }
  if (!g || typeof g !== "object") return {};
  const out = {};
  Object.keys(g).forEach(k => {
    const arr = Array.isArray(g[k]) ? g[k] : [];
    out[k] = arr.filter(Boolean);
  });
  return out;
}

function renderGallery(galleryObj) {
  const tabsEl = document.getElementById("galleryTabs");
  const gridEl = document.getElementById("galleryGrid");
  if (!tabsEl || !gridEl) return;

  const g = normalizeGalleryObject(galleryObj);
  const cats = Object.keys(g);

  tabsEl.innerHTML = "";
  gridEl.innerHTML = "";

  if (!cats.length) {
    gridEl.innerHTML = `<p class="note">Még nincs feltöltött galéria.</p>`;
    return;
  }

  let activeCat = cats[0];

  function drawTabs() {
    tabsEl.innerHTML = "";
    cats.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "gallery-tab" + (cat === activeCat ? " active" : "");
      btn.type = "button";
      btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      btn.addEventListener("click", () => {
        activeCat = cat;
        drawTabs();
        drawGrid();
      });
      tabsEl.appendChild(btn);
    });
  }

  function drawGrid() {
    const images = g[activeCat] || [];
    gridEl.innerHTML = "";

    if (!images.length) {
      gridEl.innerHTML = `<p class="note">Ebben a kategóriában még nincs kép.</p>`;
      return;
    }

    images.forEach((src, idx) => {
      const btn = document.createElement("button");
      btn.className = "gallery-item-btn";
      btn.type = "button";

      // ✅ ha akarsz “felugró” betöltést, CSS-ből megy (amit már beírtál),
      // de a dinamikusan létrehozott elemeknél jobb a delay inline:
      btn.style.animationDelay = `${Math.min(idx * 0.06, 0.6)}s`;

      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = src;
      img.alt = `${activeCat} ${idx + 1}`;

      btn.appendChild(img);
      btn.addEventListener("click", () => openLightbox(images, idx));
      gridEl.appendChild(btn);
    });
  }

  drawTabs();
  drawGrid();
}

// ---------- Main load + render ----------
async function loadAndRender() {
  // 1) file content
  let fileHome = {}, fileServices = {}, filePrice = {}, fileContact = {}, fileGallery = {};
  try { fileHome = await fetchJson("./content/home.json"); } catch (e) { console.warn(e); }
  try { fileServices = await fetchJson("./content/services.json"); } catch (e) { console.warn(e); }
  try { filePrice = await fetchJson("./content/price.json"); } catch (e) { console.warn(e); }
  try { fileContact = await fetchJson("./content/contact.json"); } catch (e) { console.warn(e); }
  try { fileGallery = await fetchJson("./content/gallery.json"); } catch (e) { console.warn(e); }

  // 2) draft override
  const draft = getDraft(); // lehet null
  const d = ensureDraftShape(draft);

  // --- Home
  const homeTitle = pick(d.home?.title, fileHome.title);
  const homeSubtitle = pick(d.home?.subtitle, fileHome.subtitle);

  setText("homeTitle", homeTitle || "");
  setText("homeSubtitle", homeSubtitle || "");

  // opcionális főoldali kép:
  // - admin draft: d.home.image (base64)
  // - fallback (ha valaki mégis használja): fileHome.heroImage
  const heroImgEl =
    document.getElementById("homeHeroImg") ||
    $(".hero-img", document.getElementById("home") || document) ||
    null;

  const heroSrc = pick(d.home?.image, fileHome.heroImage);
  setOptionalImage(heroImgEl, heroSrc);

  // --- Services
  setText("servicesTitle", fileServices.title || "Szolgáltatások");
  if (Array.isArray(fileServices.items)) {
    setList("servicesList", fileServices.items);
  } else if (Array.isArray(fileServices.list)) {
    setList("servicesList", fileServices.list);
  }

  // --- Price
  setText("priceTitle", filePrice.title || "Árak");
  // ha text/plain:
  if (typeof filePrice.text === "string") setText("priceText", filePrice.text);
  else if (typeof filePrice.html === "string") setHtml("priceText", filePrice.html);

  // --- Contact (draft felülírja)
  const email = pick(d.contact?.email, fileContact.email);
  const phone = pick(d.contact?.phone, fileContact.phone);

  setText("contactEmail", email || "");
  setText("contactPhone", phone || "");

  // --- Gallery (draft felülírja)
  const galleryData = (() => {
    // draft.gallery lehet base64-ekkel vagy path-ekkel is; mindkettőt támogatjuk
    const dg = d.gallery && Object.keys(d.gallery).length ? d.gallery : null;
    return dg || fileGallery;
  })();
  renderGallery(galleryData);

  // --- Extra pages (csak draftból)
  if (Array.isArray(d.pages) && d.pages.length) {
    renderExtraPages(d.pages);
  }

  // routing
  showSectionByHash();
}

// ---------- Init ----------
window.addEventListener("hashchange", showSectionByHash);

document.addEventListener("DOMContentLoaded", async () => {
  wireLightbox();

  // ha nincs hash, legyen home
  if (!location.hash) location.hash = "#home";

  await loadAndRender();
});
// ===== MOBIL MENÜ TOGGLE =====
(function () {
  const btn = document.getElementById("menuBtn");
  const nav = document.getElementById("mainNav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // ha rákattintasz egy menüpontra, csukja be mobilon
  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    document.body.classList.remove("nav-open");
    btn.setAttribute("aria-expanded", "false");
  });

  // ha átmész desktop méretre, legyen bezárva
  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) {
      document.body.classList.remove("nav-open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
})();

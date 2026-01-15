/* =========================
   SZEKCIÓVÁLTÁS MENÜVEL
   - stabil (nem tud üresre váltani)
   - kezeli a #hash nyitást
========================= */
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".section");

function setActiveSection(targetId) {
  const target = document.getElementById(targetId);

  if (!target) {
    console.warn(`Nincs ilyen szekció id: #${targetId}. Ellenőrizd a menü href-et és a section id-t.`);
    return;
  }

  // menü aktív állapot
  navLinks.forEach(l => {
    const linkTarget = (l.getAttribute("href") || "").replace("#", "");
    l.classList.toggle("active", linkTarget === targetId);
  });

  // szekció aktív állapot
  sections.forEach(s => s.classList.remove("active"));
  target.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = (link.getAttribute("href") || "").replace("#", "");
    if (!targetId) return;

    history.replaceState(null, "", `#${targetId}`);
    setActiveSection(targetId);
  });
});

window.addEventListener("DOMContentLoaded", () => {
  const initial = (location.hash || "#home").replace("#", "");
  if (document.getElementById(initial)) setActiveSection(initial);
  else setActiveSection("home");
});

window.addEventListener("hashchange", () => {
  const targetId = (location.hash || "#home").replace("#", "");
  setActiveSection(targetId);
});


/* =========================
   GALÉRIA + LIGHTBOX
   (B verzió – számozott képek)
   - animált megjelenés (CSS-ben)
   - lapozható (nyilak + billentyű)
========================= */

// ha nem tudod mennyi kép van, hagyd nagyra (kihagyja ami nem létezik)
const galleryCounts = {
  konyha: 200,
  eloszoba: 200,
  gardrob: 200
};

let currentImages = [];
let currentIndex = 0;

const galleryGrid = document.getElementById("galleryGrid");
const galleryTabs = document.querySelectorAll(".gallery-tab");

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const prevBtn = document.querySelector(".lightbox-prev");
const nextBtn = document.querySelector(".lightbox-next");

// több kiterjesztéssel próbálkozik
function tryLoadImage(category, index) {
  const exts = ["jpg", "jpeg", "png", "webp"];
  return new Promise((resolve, reject) => {
    let i = 0;
    const img = new Image();

    const tryNext = () => {
      if (i >= exts.length) return reject();
      img.src = `images/${category}/${index}.${exts[i++]}`;
    };

    img.onload = () => resolve(img.src);
    img.onerror = tryNext;

    tryNext();
  });
}

async function loadGallery(category) {
  if (!galleryGrid) return;

  galleryGrid.innerHTML = "";
  currentImages = [];

  // aktív tab
  galleryTabs.forEach(b => b.classList.remove("active"));
  const activeBtn = document.querySelector(`.gallery-tab[data-category="${category}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  const max = galleryCounts[category] || 0;

  for (let i = 1; i <= max; i++) {
    try {
      const src = await tryLoadImage(category, i);
      currentImages.push(src);

      const img = document.createElement("img");
      img.src = src;
      img.alt = `${category} referencia`;
      img.addEventListener("click", () => openLightboxBySrc(src));
      galleryGrid.appendChild(img);
    } catch {
      // nincs ilyen sorszámú kép -> skip
    }
  }
}

function openLightboxBySrc(src) {
  currentIndex = Math.max(0, currentImages.indexOf(src));
  lightboxImg.src = currentImages[currentIndex] || src;
  lightbox.style.display = "flex";
}

function closeLightbox() {
  lightbox.style.display = "none";
}

function showPrev() {
  if (!currentImages.length) return;
  currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
  lightboxImg.src = currentImages[currentIndex];
}

function showNext() {
  if (!currentImages.length) return;
  currentIndex = (currentIndex + 1) % currentImages.length;
  lightboxImg.src = currentImages[currentIndex];
}

// lightbox események
if (lightbox) lightbox.addEventListener("click", closeLightbox);

if (prevBtn) {
  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showPrev();
  });
}

if (nextBtn) {
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showNext();
  });
}

document.addEventListener("keydown", (e) => {
  if (!lightbox || lightbox.style.display !== "flex") return;
  if (e.key === "ArrowLeft") showPrev();
  if (e.key === "ArrowRight") showNext();
  if (e.key === "Escape") closeLightbox();
});

// tab váltás
galleryTabs.forEach(btn => {
  btn.addEventListener("click", () => loadGallery(btn.dataset.category));
});

// alap betöltés
loadGallery("konyha");


/* =========================
   KAPCSOLAT ŰRLAP → MAILTO
========================= */
const contactForm = document.getElementById("contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const fullName = document.getElementById("fullName")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const message = document.getElementById("message")?.value.trim() || "";

    const to = "info@asztalosmuhely.hu";
    const subject = `Ajánlatkérés / érdeklődés - ${fullName || "Név nélkül"}`;

    const body =
`Teljes név: ${fullName}
Email: ${email}

Üzenet:
${message}
`;

    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  });
}

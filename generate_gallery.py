import os
import json

BASE_DIR = "images/hero/gallery"   # <-- ezt használod most
OUT_FILE = os.path.join("content", "gallery.json")

# milyen fájlkiterjesztéseket vegyen
IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

def is_img(fn: str) -> bool:
    return os.path.splitext(fn.lower())[1] in IMG_EXTS

def main():
    gallery = {}

    if not os.path.isdir(BASE_DIR):
        raise SystemExit(f"HIBA: Nem találom a mappát: {BASE_DIR}")

    # kategóriák = almappák
    for cat in sorted(os.listdir(BASE_DIR)):
        cat_path = os.path.join(BASE_DIR, cat)
        if not os.path.isdir(cat_path):
            continue

        files = [f for f in sorted(os.listdir(cat_path)) if is_img(f)]
        # relatív utak a webhez
        gallery[cat] = [f"{BASE_DIR}/{cat}/{f}" for f in files]

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(gallery, f, ensure_ascii=False, indent=2)

    print("Kész: " + OUT_FILE)

if __name__ == "__main__":
    main()

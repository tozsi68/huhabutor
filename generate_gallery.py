import os, json

BASE = "images"
CATEGORIES = ["konyha", "eloszoba", "gardrob"]
EXTS = {".jpg", ".jpeg", ".png", ".webp"}

data = {}

for cat in CATEGORIES:
    folder = os.path.join(BASE, cat)
    files = []
    if os.path.isdir(folder):
        for name in os.listdir(folder):
            ext = os.path.splitext(name.lower())[1]
            if ext in EXTS:
                files.append(name)
    files.sort(key=lambda s: s.lower())
    data[cat] = files

with open("gallery.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Kesz: gallery.json")

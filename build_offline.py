from pathlib import Path
root = Path(__file__).resolve().parent
html = (root / "index.html").read_text(encoding="utf-8")
for name in ["board-grid.js", "board-export.js", "portrait-transfer.js", "app.js"]:
    js = (root / name).read_text(encoding="utf-8")
    if "</script" in js.lower():
        raise ValueError("Unsafe inline script content")
    html = html.replace('<script src="' + name + '"></script>', '<script>\n' + js + '\n</script>')
(root / "Izzie豆作-离线版.html").write_text(html, encoding="utf-8")

from pathlib import Path
root = Path(__file__).resolve().parent
html = (root / "index.html").read_text(encoding="utf-8")
js = (root / "app.js").read_text(encoding="utf-8")
(root / "Izzie豆作-离线版.html").write_text(html.replace('<script src="app.js"></script>', '<script>' + js + '</script>'), encoding="utf-8")

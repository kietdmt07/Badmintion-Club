import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_button_text = """▶️ Phát Lệnh Bắt Đầu Trận Đấu"""
new_button_text = """▶️ Bắt đầu"""

if old_button_text in html:
    html = html.replace(old_button_text, new_button_text)
else:
    print("WARNING: old_button_text not found!")

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html button text patched")

import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_code = """          <div style="font-weight:700; font-size:14px; color:#1B4332; margin-top:2px;">
            ${escapeHtml(a.title)}
          </div>
          
          <div style="font-size:13px; color:#2C2C2A; line-height:1.45; white-space:pre-line;">
            ${escapeHtml(a.content)}
          </div>"""

new_code = """          <div style="font-weight:700; font-size:14px; color:#1B4332; margin-top:2px;">
            ${escapeHtml(a.title)}
          </div>
          
          ${a.imageUrl ? `<img src="${a.imageUrl}" style="width:100%; border-radius:8px; margin-top:4px; max-height:200px; object-fit:cover;" />` : ''}

          <div style="font-size:13px; color:#2C2C2A; line-height:1.45; white-space:pre-line;">
            ${escapeHtml(a.content)}
          </div>"""

html = html.replace(old_code, new_code)

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html announcement image patched")

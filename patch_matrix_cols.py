import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_matrix_td = """                            <td style="padding:8px; text-align:center;">
                               <input type="checkbox" class="matrix-chk" value="${r.id}" style="transform:scale(1.3); cursor:pointer;" />
                            </td>
                            <td style="padding:8px; font-weight:600;">${escapeHtml(m?memberDisplayName(m):'')}</td>
                            <td style="padding:8px; text-align:center;">${m?.gender==='Nữ'?'👩 Nữ':'👨 Nam'}</td>
                            <td style="padding:8px;"><span class="bc-badge" style="background:var(--tab-bg); color:var(--text-primary);">${r.cat}</span></td>"""

new_matrix_td = """                            <td style="padding:8px; text-align:center;">
                               <input type="checkbox" class="matrix-chk" value="${r.id}" style="transform:scale(1.3); cursor:pointer;" />
                            </td>
                            <td style="padding:8px; font-weight:600;">${escapeHtml(m?memberDisplayName(m):'')}</td>
                            <td style="padding:8px; text-align:center;">${m?.gender==='Nữ'?'👩 Nữ':'👨 Nam'}</td>
                            <td style="padding:8px;">${r.skill && r.skill !== 'Chưa xác định' ? `<span style="font-size:11px; background:#4CAF50; color:#FFF; padding:2px 6px; border-radius:4px;">${r.skill}</span>` : '-'}</td>
                            <td style="padding:8px;"><span class="bc-badge" style="background:var(--tab-bg); color:var(--text-primary); font-size:12px;">${r.cat}</span></td>"""

if old_matrix_td in html:
    html = html.replace(old_matrix_td, new_matrix_td)
else:
    print("WARNING: old_matrix_td not found!")

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html matrix UI patched")

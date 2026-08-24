import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_score_inputs = """                         <div style="padding:0 10px; white-space:nowrap;">
                            ${canManage() ? 
                              `<input type="number" id="s1-${m.id}" value="${m.score1!==null?m.score1:''}" style="width:40px; text-align:center; border: 1px solid var(--card-border); border-radius:4px; padding:4px;" /> - 
                               <input type="number" id="s2-${m.id}" value="${m.score2!==null?m.score2:''}" style="width:40px; text-align:center; border: 1px solid var(--card-border); border-radius:4px; padding:4px;" />` 
                              : `<span style="font-size:16px; font-weight:bold; color:var(--text-primary);">${m.score1!==null?m.score1:'-'} : ${m.score2!==null?m.score2:'-'}</span>`
                            }
                         </div>"""

new_score_inputs = """                         <div style="padding:0 10px; white-space:nowrap;">
                            ${canManage() ? 
                              (m.status === 'pending' ? `<span style="font-size:12px; color:var(--text-secondary); font-style:italic;">(Chưa diễn ra)</span>` :
                              `<input type="number" id="s1-${m.id}" value="${m.score1!==null?m.score1:''}" style="width:40px; text-align:center; border: 1px solid var(--card-border); border-radius:4px; padding:4px;" /> - 
                               <input type="number" id="s2-${m.id}" value="${m.score2!==null?m.score2:''}" style="width:40px; text-align:center; border: 1px solid var(--card-border); border-radius:4px; padding:4px;" />`)
                              : `<span style="font-size:16px; font-weight:bold; color:var(--text-primary);">${m.score1!==null?m.score1:'-'} : ${m.score2!==null?m.score2:'-'}</span>`
                            }
                         </div>"""

if old_score_inputs in html:
    html = html.replace(old_score_inputs, new_score_inputs)
else:
    print("WARNING: old_score_inputs not found!")

old_buttons = """                       ${canManage() ? `
                         <div style="text-align:center; margin-top:8px; display:flex; gap:6px; justify-content:center;">
                           ${m.status === 'pending' ? `<button class="bc-btn small" id="start-match-${m.id}" style="background:#4CAF50; border-color:#4CAF50; color:#FFF; font-size:11px; padding:4px 10px;">▶️ Bắt Đầu</button>` : ''}
                           <button class="bc-btn small" id="update-match-${m.id}" style="background:#0288D1; border-color:var(--text-primary); color:#FFF; font-size:11px; padding:4px 10px;">Lưu Tỷ số</button>
                         </div>
                       ` : ''}"""

new_buttons = """                       ${canManage() ? `
                         <div style="text-align:center; margin-top:8px; display:flex; gap:6px; justify-content:center;">
                           ${m.status === 'pending' ? `<button class="bc-btn small" id="start-match-${m.id}" style="background:#4CAF50; border-color:#4CAF50; color:#FFF; font-size:11px; padding:4px 10px; width:100%;">▶️ Phát Lệnh Bắt Đầu Trận Đấu</button>` : 
                           `<button class="bc-btn small" id="update-match-${m.id}" style="background:#0288D1; border-color:var(--text-primary); color:#FFF; font-size:11px; padding:4px 10px;">💾 Lưu Tỷ số</button>`}
                         </div>
                       ` : ''}"""

if old_buttons in html:
    html = html.replace(old_buttons, new_buttons)
else:
    print("WARNING: old_buttons not found!")

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html UI logic patched")

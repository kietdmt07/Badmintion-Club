import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix 1: Match Status Bug
old_match_logic = """                         if (s1 !== null && s2 !== null) {
                            status = 'finished';
                            if (!eTime) eTime = Date.now();
                            if (!sTime) sTime = Date.now() - 15*60000; // fake 15 mins if not started
                         }
                         else if (s1 !== null || s2 !== null) status = 'live';
                         else status = 'pending';"""

new_match_logic = """                         if (s1 !== null && s2 !== null) {
                            status = 'finished';
                            if (!eTime) eTime = Date.now();
                            if (!sTime) sTime = Date.now() - 15*60000; // fake 15 mins if not started
                         }
                         else if (s1 !== null || s2 !== null) {
                            status = 'live';
                            if (!sTime) sTime = Date.now();
                         }
                         else {
                            status = m.status; // Keep existing status if no score is entered
                         }"""

if old_match_logic in html:
    html = html.replace(old_match_logic, new_match_logic)
else:
    print("WARNING: old_match_logic not found!")

# Fix 2: Knockout Button Style
old_btn = """          if (canManage() && (activeTour.status === 'playing' || activeTour.status === 'knockout')) {
             wrap.appendChild(el(`<div style="text-align:center; margin-top:30px; padding-top:20px; border-top:2px dashed var(--card-border);">
                <button class="bc-btn danger" id="tour-to-knockout-btn" style="padding:12px 25px; font-size:16px; background:#D32F2F; border-color:#F26419; box-shadow:0 4px 10px rgba(211,47,47,0.3);">${activeTour.status === 'knockout' ? '🔄 TÁI TÍNH TOÁN & TẠO LẠI NHÁNH ĐẤU' : '🏆 CHỐT VÒNG BẢNG & TẠO NHÁNH ĐẤU KNOCKOUT'}</button>
             </div>`));"""

new_btn = """          if (canManage() && (activeTour.status === 'playing' || activeTour.status === 'knockout')) {
             wrap.appendChild(el(`<div style="text-align:center; margin-top:30px; padding-top:20px; border-top:2px dashed var(--card-border);">
                <button class="bc-btn" id="tour-to-knockout-btn" style="padding:12px 25px; font-size:16px; background:linear-gradient(135deg, #F26419 0%, #D8973C 100%); border:none; color:#FFF; box-shadow:0 4px 15px rgba(242,100,25,0.4); text-transform:uppercase; font-weight:bold;">${activeTour.status === 'knockout' ? '🔄 Tái tính toán & Tạo lại Nhánh đấu' : '🏆 Chốt vòng bảng & Tạo Nhánh đấu Knockout'}</button>
             </div>`));"""

if old_btn in html:
    html = html.replace(old_btn, new_btn)
else:
    print("WARNING: old_btn not found!")

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html bugfixes patched")

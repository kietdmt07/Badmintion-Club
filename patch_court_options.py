import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_court_options = """       // ======================== TAB 3: GROUP STAGE ========================
       if (isGroupTab) {
          const groupsContainer = el(`<div style="display:flex; flex-direction:column; gap:20px;"></div>`);
          
          const courtOptions = Array.from({length: activeTour.courtsCount || 4}, (_, i) => {
             return `<option value="Sân ${i+1}">Sân ${i+1}</option>`;
          }).join('');"""

new_court_options = """       // ======================== TAB 3: GROUP STAGE ========================
       if (isGroupTab) {
          const groupsContainer = el(`<div style="display:flex; flex-direction:column; gap:20px;"></div>`);
          
          let courtOptions = '';
          if (activeTour.courtIds && activeTour.courtIds.length > 0) {
             courtOptions = activeTour.courtIds.map(cid => {
                const cName = state.courts.find(c => c.id === cid)?.name || 'Sân ' + cid;
                return `<option value="${escapeHtml(cName)}">${escapeHtml(cName)}</option>`;
             }).join('');
          } else {
             courtOptions = Array.from({length: activeTour.courtsCount || 4}, (_, i) => {
                return `<option value="Sân ${i+1}">Sân ${i+1}</option>`;
             }).join('');
          }"""

if old_court_options in html:
    html = html.replace(old_court_options, new_court_options)
else:
    print("WARNING: old_court_options not found in TAB 3!")

old_court_options_2 = """       // ======================== TAB 4: KNOCKOUT STAGE ========================
       if (isKnockoutTab) {
          const koContainer = el(`<div style="display:flex; flex-direction:column; gap:30px; overflow-x:auto;"></div>`);
          
          const courtOptions = Array.from({length: activeTour.courtsCount || 4}, (_, i) => {
             return `<option value="Sân ${i+1}">Sân ${i+1}</option>`;
          }).join('');"""

new_court_options_2 = """       // ======================== TAB 4: KNOCKOUT STAGE ========================
       if (isKnockoutTab) {
          const koContainer = el(`<div style="display:flex; flex-direction:column; gap:30px; overflow-x:auto;"></div>`);
          
          let courtOptions = '';
          if (activeTour.courtIds && activeTour.courtIds.length > 0) {
             courtOptions = activeTour.courtIds.map(cid => {
                const cName = state.courts.find(c => c.id === cid)?.name || 'Sân ' + cid;
                return `<option value="${escapeHtml(cName)}">${escapeHtml(cName)}</option>`;
             }).join('');
          } else {
             courtOptions = Array.from({length: activeTour.courtsCount || 4}, (_, i) => {
                return `<option value="Sân ${i+1}">Sân ${i+1}</option>`;
             }).join('');
          }"""

if old_court_options_2 in html:
    html = html.replace(old_court_options_2, new_court_options_2)
else:
    print("WARNING: old_court_options_2 not found in TAB 4!")

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html court options patched")

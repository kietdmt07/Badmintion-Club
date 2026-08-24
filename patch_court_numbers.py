import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add courtsCount back to Setup Modal
old_setup_courts = """            <div style="display:flex; gap:16px; flex-wrap:wrap;">
              <div style="flex:1; min-width:140px;">
                <label style="font-size:13px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Địa điểm tổ chức (Chọn sân)</label>
                <div style="border:1px solid var(--card-border); border-radius:8px; padding:10px; max-height:150px; overflow-y:auto; background:var(--input-bg);">
                  ${state.courts.map(c => `
                    <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:13px;">
                      <input type="checkbox" class="ts-court-chk" value="${c.id}" /> ${escapeHtml(c.name)}
                    </label>
                  `).join('') || '<div style="font-size:12px; color:var(--text-secondary);">Chưa có sân nào trong hệ thống. Hãy thêm sân ở mục Duyệt & Cấu hình.</div>'}
                </div>
              </div>
            </div>"""

new_setup_courts = """            <div style="display:flex; gap:16px; flex-wrap:wrap;">
              <div style="flex:1; min-width:140px;">
                <label style="font-size:13px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Địa điểm tổ chức (Chọn khu vực sân)</label>
                <div style="border:1px solid var(--card-border); border-radius:8px; padding:10px; max-height:150px; overflow-y:auto; background:var(--input-bg);">
                  ${state.courts.map(c => `
                    <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:13px;">
                      <input type="checkbox" class="ts-court-chk" value="${c.id}" /> ${escapeHtml(c.name)}
                    </label>
                  `).join('') || '<div style="font-size:12px; color:var(--text-secondary);">Chưa có sân nào trong hệ thống. Hãy thêm sân ở mục Duyệt & Cấu hình.</div>'}
                </div>
              </div>
              <div style="flex:1; min-width:140px;">
                <label style="font-size:13px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Số lượng Sân con (VD: Sân 1, Sân 2...)</label>
                <input type="number" class="bc-input" id="ts-courts-count" value="${state.tourSetup.courtsCount || 4}" min="1" max="20" style="width:100%;" />
              </div>
            </div>"""

if old_setup_courts in html:
    html = html.replace(old_setup_courts, new_setup_courts)
else:
    print("WARNING: old_setup_courts not found!")

# 2. Add courtsCount to newTour object
old_setup_save = """            const selCourts = Array.from(document.querySelectorAll('.ts-court-chk:checked')).map(x => x.value);
            const selCats = Array.from(document.querySelectorAll('.ts-cat-chk:checked')).map(x => x.value);
            const desc = document.getElementById('ts-desc').value.trim();
            
            if (!name) return alert('Vui lòng nhập tên giải đấu!');
            if (selCats.length === 0) return alert('Vui lòng chọn ít nhất 1 hạng mục thi đấu!');
            if (selCourts.length === 0) return alert('Vui lòng chọn ít nhất 1 sân làm địa điểm!');
            
            const courtNames = selCourts.map(cid => state.courts.find(c => c.id === cid)?.name).filter(Boolean);

            const newTour = {
              id: uid(),
              name,
              bannerUrl: bannerB64,
              description: desc,
              courtIds: selCourts,
              categories: selCats,
              status: 'registering',"""

new_setup_save = """            const selCourts = Array.from(document.querySelectorAll('.ts-court-chk:checked')).map(x => x.value);
            const selCats = Array.from(document.querySelectorAll('.ts-cat-chk:checked')).map(x => x.value);
            const desc = document.getElementById('ts-desc').value.trim();
            const count = parseInt(document.getElementById('ts-courts-count').value, 10) || 4;
            
            if (!name) return alert('Vui lòng nhập tên giải đấu!');
            if (selCats.length === 0) return alert('Vui lòng chọn ít nhất 1 hạng mục thi đấu!');
            if (selCourts.length === 0) return alert('Vui lòng chọn ít nhất 1 khu vực sân làm địa điểm!');
            
            const courtNames = selCourts.map(cid => state.courts.find(c => c.id === cid)?.name).filter(Boolean);

            const newTour = {
              id: uid(),
              name,
              bannerUrl: bannerB64,
              description: desc,
              courtIds: selCourts,
              courtsCount: count,
              categories: selCats,
              status: 'registering',"""

if old_setup_save in html:
    html = html.replace(old_setup_save, new_setup_save)
else:
    print("WARNING: old_setup_save not found!")

# 3. Add courtsCount to Edit Modal
old_edit_modal = """                 <div style="margin-bottom:15px;">
                   <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">Địa điểm tổ chức (Chọn sân)</label>
                   <div style="border:1px solid var(--card-border); border-radius:8px; padding:10px; max-height:120px; overflow-y:auto; background:var(--input-bg);">
                     ${state.courts.map(c => `
                       <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:13px; cursor:pointer;">
                         <input type="checkbox" class="ed-court-chk" value="${c.id}" ${(activeTour.courtIds||[]).includes(c.id) ? 'checked' : ''} /> ${escapeHtml(c.name)}
                       </label>
                     `).join('') || '<div style="font-size:12px; color:var(--text-secondary);">Chưa có sân nào trong hệ thống.</div>'}
                   </div>
                 </div>

                 <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px; border-top:1px dashed var(--card-border); padding-top:15px;">"""

new_edit_modal = """                 <div style="margin-bottom:15px; display:flex; gap:16px; flex-wrap:wrap;">
                   <div style="flex:1; min-width:140px;">
                     <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">Địa điểm tổ chức (Khu vực)</label>
                     <div style="border:1px solid var(--card-border); border-radius:8px; padding:10px; max-height:120px; overflow-y:auto; background:var(--input-bg);">
                       ${state.courts.map(c => `
                         <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:13px; cursor:pointer;">
                           <input type="checkbox" class="ed-court-chk" value="${c.id}" ${(activeTour.courtIds||[]).includes(c.id) ? 'checked' : ''} /> ${escapeHtml(c.name)}
                         </label>
                       `).join('') || '<div style="font-size:12px; color:var(--text-secondary);">Chưa có sân nào trong hệ thống.</div>'}
                     </div>
                   </div>
                   <div style="flex:1; min-width:140px;">
                     <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">Số lượng Sân con thi đấu</label>
                     <input type="number" class="bc-input" id="ed-courts-count" value="${activeTour.courtsCount || 4}" min="1" max="20" style="width:100%;" />
                   </div>
                 </div>

                 <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px; border-top:1px dashed var(--card-border); padding-top:15px;">"""

if old_edit_modal in html:
    html = html.replace(old_edit_modal, new_edit_modal)
else:
    print("WARNING: old_edit_modal not found!")

# 4. Save edit courtsCount
old_edit_save = """             modal.querySelector('#ed-save').onclick = async () => {
                const n = modal.querySelector('#ed-name').value.trim();
                const d = modal.querySelector('#ed-desc').value.trim();
                const c = Array.from(modal.querySelectorAll('.ed-court-chk:checked')).map(x => x.value);
                const cats = Array.from(modal.querySelectorAll('.ed-cat-chk:checked')).map(x => x.value);
                
                if (!n) return alert('Tên không được để trống!');
                if (cats.length === 0) return alert('Vui lòng chọn ít nhất 1 hạng mục thi đấu!');
                
                await mutateTournaments(tours => {
                   const t = tours.find(x => x.id === activeTour.id);
                   if (t) {
                      t.name = n;
                      t.description = d;
                      t.courtIds = c;
                      t.categories = cats;
                      t.bannerUrl = newBannerB64;
                   }
                   return tours;
                });
                modal.remove();
                render();
             };"""

new_edit_save = """             modal.querySelector('#ed-save').onclick = async () => {
                const n = modal.querySelector('#ed-name').value.trim();
                const d = modal.querySelector('#ed-desc').value.trim();
                const c = Array.from(modal.querySelectorAll('.ed-court-chk:checked')).map(x => x.value);
                const cats = Array.from(modal.querySelectorAll('.ed-cat-chk:checked')).map(x => x.value);
                const cnt = parseInt(modal.querySelector('#ed-courts-count').value, 10) || 4;
                
                if (!n) return alert('Tên không được để trống!');
                if (cats.length === 0) return alert('Vui lòng chọn ít nhất 1 hạng mục thi đấu!');
                
                await mutateTournaments(tours => {
                   const t = tours.find(x => x.id === activeTour.id);
                   if (t) {
                      t.name = n;
                      t.description = d;
                      t.courtIds = c;
                      t.courtsCount = cnt;
                      t.categories = cats;
                      t.bannerUrl = newBannerB64;
                   }
                   return tours;
                });
                modal.remove();
                render();
             };"""

if old_edit_save in html:
    html = html.replace(old_edit_save, new_edit_save)
else:
    print("WARNING: old_edit_save not found!")

# 5. Fix courtOptions in TAB 3 and TAB 4 back to Sân 1, Sân 2...
old_court_options_3 = """          let courtOptions = '';
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

new_court_options_3 = """          const courtOptions = Array.from({length: activeTour.courtsCount || 4}, (_, i) => {
             return `<option value="Sân ${i+1}">Sân ${i+1}</option>`;
          }).join('');"""

html = html.replace(old_court_options_3, new_court_options_3)

# 6. Change active tour header slightly to display correctly if courtsCount is there
old_header_text = """                <div style="font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; margin-bottom:10px;">
                   Tình trạng: ${activeTour.status.toUpperCase()} | Địa điểm: ${courtNamesStr}
                </div>"""

new_header_text = """                <div style="font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; margin-bottom:10px;">
                   Tình trạng: ${activeTour.status.toUpperCase()} | Địa điểm: ${courtNamesStr} ${activeTour.courtsCount ? `(Số lượng: ${activeTour.courtsCount} sân)` : ''}
                </div>"""

if old_header_text in html:
    html = html.replace(old_header_text, new_header_text)
else:
    print("WARNING: old_header_text not found!")


with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html court numbers logic repatched")

import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# The old edit modal code
old_modal_chunk = """                 <div style="margin-bottom:15px;">
                   <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">Địa điểm tổ chức (Chọn sân)</label>
                   <div style="border:1px solid var(--card-border); border-radius:8px; padding:10px; max-height:120px; overflow-y:auto; background:var(--input-bg);">
                     ${state.courts.map(c => `
                       <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:13px;">
                         <input type="checkbox" class="ed-court-chk" value="${c.id}" ${(activeTour.courtIds||[]).includes(c.id) ? 'checked' : ''} /> ${escapeHtml(c.name)}
                       </label>
                     `).join('') || '<div style="font-size:12px; color:var(--text-secondary);">Chưa có sân nào trong hệ thống.</div>'}
                   </div>
                 </div>"""

new_modal_chunk = """                 <div style="margin-bottom:15px;">
                   <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">Hạng mục thi đấu</label>
                   <div style="display:flex; gap:16px; flex-wrap:wrap; border:1px solid var(--card-border); border-radius:8px; padding:10px; background:var(--input-bg);">
                     ${['Đôi Nam', 'Đôi Nữ', 'Đôi Nam Nữ'].map(cat => {
                       const checked = (activeTour.categories || []).includes(cat) ? 'checked' : '';
                       return `<label style="display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:600; cursor:pointer;">
                         <input type="checkbox" class="ed-cat-chk" value="${cat}" ${checked} /> 🏸 ${cat}
                       </label>`;
                     }).join(' ')}
                   </div>
                 </div>

                 <div style="margin-bottom:15px;">
                   <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">Địa điểm tổ chức (Chọn sân)</label>
                   <div style="border:1px solid var(--card-border); border-radius:8px; padding:10px; max-height:120px; overflow-y:auto; background:var(--input-bg);">
                     ${state.courts.map(c => `
                       <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:13px; cursor:pointer;">
                         <input type="checkbox" class="ed-court-chk" value="${c.id}" ${(activeTour.courtIds||[]).includes(c.id) ? 'checked' : ''} /> ${escapeHtml(c.name)}
                       </label>
                     `).join('') || '<div style="font-size:12px; color:var(--text-secondary);">Chưa có sân nào trong hệ thống.</div>'}
                   </div>
                 </div>"""

html = html.replace(old_modal_chunk, new_modal_chunk)

# Now update the save logic
old_save_logic = """             modal.querySelector('#ed-save').onclick = async () => {
                const n = modal.querySelector('#ed-name').value.trim();
                const d = modal.querySelector('#ed-desc').value.trim();
                const c = Array.from(modal.querySelectorAll('.ed-court-chk:checked')).map(x => x.value);
                
                if (!n) return alert('Tên không được để trống!');
                
                await mutateTournaments(tours => {
                   const t = tours.find(x => x.id === activeTour.id);
                   if (t) {
                      t.name = n;
                      t.description = d;
                      t.courtIds = c;
                      t.bannerUrl = newBannerB64;
                   }
                   return tours;
                });
                modal.remove();
                render();
             };"""

new_save_logic = """             modal.querySelector('#ed-save').onclick = async () => {
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

html = html.replace(old_save_logic, new_save_logic)

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html edit modal patched with categories")

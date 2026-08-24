import re

with open('/Users/kietdmt/Documents/v7_temp.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update the setupCard template
old_setup = """            <div style="display:flex; gap:16px; flex-wrap:wrap;">
              <div style="flex:1; min-width:140px;">
                <label style="font-size:13px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Số lượng sân thi đấu</label>
                <input type="number" class="bc-input" id="ts-courts-count" value="4" min="1" max="20" style="width:100%;" />
              </div>
            </div>"""

new_setup = """            <div style="display:flex; gap:16px; flex-wrap:wrap;">
              <div style="flex:1; min-width:140px;">
                <label style="font-size:13px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Banner Giải Đấu (Ảnh bìa)</label>
                <input type="file" id="ts-banner-input" accept="image/*" class="bc-input" style="width:100%; font-size:12px; padding:6px;" />
              </div>
            </div>
            
            <div style="display:flex; gap:16px; flex-wrap:wrap;">
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
            </div>

            <div style="display:flex; gap:16px; flex-wrap:wrap;">
              <div style="flex:1; min-width:140px;">
                <label style="font-size:13px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Thông báo / Mô tả chi tiết (Điều lệ, Lệ phí...)</label>
                <textarea class="bc-input" id="ts-desc" rows="4" style="width:100%; resize:vertical;" placeholder="VD: Lệ phí thi đấu: 100k/người. Chuyển khoản qua STK..."></textarea>
              </div>
            </div>"""

js = js.replace(old_setup, new_setup)

# 2. Update ts-start-btn handler
old_start_logic = """        setTimeout(() => {
          document.getElementById('ts-start-btn').onclick = async () => {
            const name = document.getElementById('ts-name').value.trim();
            const count = parseInt(document.getElementById('ts-courts-count').value, 10) || 4;
            const selCats = Array.from(document.querySelectorAll('.ts-cat-chk:checked')).map(x => x.value);
            
            if (!name) return alert('Vui lòng nhập tên giải đấu!');
            if (selCats.length === 0) return alert('Vui lòng chọn ít nhất 1 hạng mục thi đấu!');
            
            const newTour = {
              id: uid(),
              name,
              categories: selCats,
              courtsCount: count,
              status: 'registering',
              registrations: [],
              pairs: [],
              groups: [],
              matches: [],
              bracket: null,
              createdAt: new Date().toISOString()
            };
            
            await mutateTournaments(tours => {
               tours.push(newTour);
               return tours;
            });
            await mutateKey('bc_announcements', anns => {
               anns.unshift({
                  id: uid(),
                  category: 'tournament',
                  title: `🔥 Giải đấu mới: ${name} đã mở đăng ký!`,
                  content: `Ban chủ nhiệm vừa mở cổng đăng ký cho giải đấu **${name}**.\\nCác VĐV hãy mau chóng vào Tab [Giải Đấu] để ghi danh và tìm đồng đội nhé!\\n\\nHạng mục: ${selCats.join(', ')}`,
                  pinned: true,
                  createdAt: Date.now()
               });
               return anns;
            });"""

new_start_logic = """        setTimeout(() => {
          let bannerB64 = '';
          const bannerInput = document.getElementById('ts-banner-input');
          if (bannerInput) bannerInput.onchange = (e) => {
             const f = e.target.files[0];
             if(!f) return;
             compressImage(f, 800, 0.7, (b64) => { bannerB64 = b64; });
          };

          document.getElementById('ts-start-btn').onclick = async () => {
            const name = document.getElementById('ts-name').value.trim();
            const selCourts = Array.from(document.querySelectorAll('.ts-court-chk:checked')).map(x => x.value);
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
              status: 'registering',
              registrations: [],
              pairs: [],
              groups: [],
              matches: [],
              bracket: null,
              createdAt: new Date().toISOString()
            };
            
            await mutateTournaments(tours => {
               tours.push(newTour);
               return tours;
            });
            await mutateKey('bc_announcements', anns => {
               anns.unshift({
                  id: uid(),
                  category: 'tournament',
                  title: `🔥 Giải đấu mới: ${name} đã mở đăng ký!`,
                  content: `📍 **Địa điểm:** ${courtNames.join(', ')}\n\n${desc ? desc + '\\n\\n' : ''}Ban chủ nhiệm vừa mở cổng đăng ký cho giải đấu **${name}**.\\nCác VĐV hãy mau chóng vào Tab [Giải Đấu] để ghi danh nhé!\\n\\nHạng mục: ${selCats.join(', ')}`,
                  imageUrl: bannerB64,
                  pinned: true,
                  createdAt: Date.now()
               });
               return anns;
            });"""

js = js.replace(old_start_logic, new_start_logic)

# 3. Add Banner and Description display in Active Tournament header + Edit Modal trigger
old_header = """       // Active Tour Header
       wrap.appendChild(el(`<div class="bc-card" style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:var(--card-bg); border:1px solid var(--card-border); margin-bottom:1rem; position:relative;">
          <div>
             <h3 style="font-size:20px; color:#F26419; font-family:'Oswald',sans-serif; margin-bottom:5px; display:flex; align-items:center; gap:8px;">
               ${escapeHtml(activeTour.name)}
               ${canManage() ? `<button class="bc-btn small" id="edit-tour-btn" style="background:transparent; border:none; padding:0; font-size:14px; margin-left:10px;" title="Sửa thông tin giải">⚙️</button>` : ''}
             </h3>
             <div style="font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase;">
                Tình trạng: ${activeTour.status.toUpperCase()} | Sân thi đấu: ${activeTour.courtsCount || 0} sân
             </div>
          </div>"""

new_header = """       // Active Tour Header
       let courtNamesStr = activeTour.courtsCount ? `${activeTour.courtsCount} sân` : 'Chưa xếp sân';
       if (activeTour.courtIds && activeTour.courtIds.length > 0) {
          courtNamesStr = activeTour.courtIds.map(cid => state.courts.find(c => c.id === cid)?.name).filter(Boolean).join(', ');
       }

       wrap.appendChild(el(`<div class="bc-card" style="padding:15px; background:var(--card-bg); border:1px solid var(--card-border); margin-bottom:1rem; position:relative; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
             <div style="flex:1;">
                <h3 style="font-size:20px; color:#F26419; font-family:'Oswald',sans-serif; margin-bottom:5px; display:flex; align-items:center; gap:8px;">
                  ${escapeHtml(activeTour.name)}
                  ${canManage() ? `<button class="bc-btn small" id="edit-tour-btn" style="background:rgba(242, 100, 25, 0.1); border:1px solid rgba(242, 100, 25, 0.3); padding:2px 8px; font-size:12px; margin-left:10px; border-radius:4px; color:#F26419;" title="Chỉnh sửa toàn diện">⚙️ Sửa Giải</button>` : ''}
                </h3>
                <div style="font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; margin-bottom:10px;">
                   Tình trạng: ${activeTour.status.toUpperCase()} | Địa điểm: ${courtNamesStr}
                </div>
                ${activeTour.description ? `<div style="font-size:13px; color:var(--text-primary); white-space:pre-line; background:var(--input-bg); padding:10px; border-radius:8px; border-left:3px solid #F26419;">${escapeHtml(activeTour.description)}</div>` : ''}
             </div>
             ${activeTour.bannerUrl ? `<div style="margin-left:15px; flex-shrink:0;"><img src="${activeTour.bannerUrl}" style="width:120px; height:80px; object-fit:cover; border-radius:8px; border:1px solid var(--card-border);" /></div>` : ''}
          </div>
       </div>`));"""

js = js.replace(old_header, new_header)


# 4. Replace the old prompt edit logic with the new Edit Modal
old_edit_logic = """       setTimeout(() => {
          const editBtn = document.getElementById('edit-tour-btn');
          if (editBtn) {
             editBtn.onclick = async () => {
                const nn = prompt('Tên giải đấu:', activeTour.name);
                if (!nn || nn === activeTour.name) return;
                await mutateTournaments(tours => {
                   const t = tours.find(x => x.id === activeTour.id);
                   if (t) t.name = nn;
                   return tours;
                });
                render();
             };
          }"""

new_edit_logic = """       setTimeout(() => {
          const editBtn = document.getElementById('edit-tour-btn');
          if (editBtn) {
             editBtn.onclick = () => {
                const modal = el(`<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex; justify-content:center; align-items:center; padding:20px;">
                  <div class="bc-card" style="width:100%; max-width:500px; max-height:90vh; overflow-y:auto; background:var(--card-bg); padding:20px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                    <h3 style="margin-bottom:15px; color:var(--text-primary); font-family:'Oswald',sans-serif;">⚙️ Chỉnh sửa Giải Đấu</h3>
                    
                    <div style="margin-bottom:12px;">
                      <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">Tên giải đấu</label>
                      <input type="text" class="bc-input" id="ed-name" value="${escapeHtml(activeTour.name)}" style="width:100%;" />
                    </div>

                    <div style="margin-bottom:12px;">
                      <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">Ảnh Banner Mới (Bỏ trống nếu giữ nguyên)</label>
                      <input type="file" id="ed-banner-input" accept="image/*" class="bc-input" style="width:100%; font-size:12px; padding:6px;" />
                    </div>

                    <div style="margin-bottom:12px;">
                      <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">Mô tả / Điều lệ</label>
                      <textarea class="bc-input" id="ed-desc" rows="4" style="width:100%; resize:vertical;">${escapeHtml(activeTour.description || '')}</textarea>
                    </div>

                    <div style="margin-bottom:15px;">
                      <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">Địa điểm tổ chức (Chọn sân)</label>
                      <div style="border:1px solid var(--card-border); border-radius:8px; padding:10px; max-height:120px; overflow-y:auto; background:var(--input-bg);">
                        ${state.courts.map(c => `
                          <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:13px;">
                            <input type="checkbox" class="ed-court-chk" value="${c.id}" ${(activeTour.courtIds||[]).includes(c.id) ? 'checked' : ''} /> ${escapeHtml(c.name)}
                          </label>
                        `).join('') || '<div style="font-size:12px; color:var(--text-secondary);">Chưa có sân nào trong hệ thống.</div>'}
                      </div>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px; border-top:1px dashed var(--card-border); padding-top:15px;">
                      <button class="bc-btn outline" id="ed-cancel">Hủy</button>
                      <button class="bc-btn" id="ed-save" style="background:#4CAF50; border-color:#4CAF50; color:#FFF;">💾 Lưu Thay Đổi</button>
                    </div>
                  </div>
                </div>`);
                document.body.appendChild(modal);

                let newBannerB64 = activeTour.bannerUrl || '';
                const bInp = modal.querySelector('#ed-banner-input');
                bInp.onchange = (e) => {
                   const f = e.target.files[0];
                   if(!f) return;
                   compressImage(f, 800, 0.7, (b64) => { newBannerB64 = b64; });
                };

                modal.querySelector('#ed-cancel').onclick = () => modal.remove();
                modal.querySelector('#ed-save').onclick = async () => {
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
                };
             };
          }"""

js = js.replace(old_edit_logic, new_edit_logic)

with open('/Users/kietdmt/Documents/v7_temp.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("v7_temp.js patched successfully")

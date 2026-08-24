import re

with open('/Users/kietdmt/Documents/v4_temp.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Unlock registration tab
js = js.replace("""if (activeTour.status === 'registering') {""", """if (true) {""")
js = js.replace("""} else {
              wrap.appendChild(el(`<div class="bc-card" style="margin-bottom:1rem; padding:15px; color:#5D4037; background:#EFEBE9; text-align:center;">🔒 Giai đoạn đăng ký đã khép lại. Dưới đây là danh sách VĐV.</div>`));
          }""", """}""")

js = js.replace("""<h4 style="font-size:16px; color:#27500A; margin-bottom:12px; font-family:'Oswald',sans-serif;">TẠO PHIẾU ĐĂNG KÝ THAM GIA</h4>""",
"""<h4 style="font-size:16px; color:#27500A; margin-bottom:12px; font-family:'Oswald',sans-serif;">TẠO PHIẾU ĐĂNG KÝ THAM GIA</h4>
                  ${activeTour.status !== 'registering' ? `<div style="font-size:12px; color:#D32F2F; background:#FFEBEE; padding:8px; border-radius:4px; margin-bottom:10px; font-weight:bold;">⚠️ Lưu ý: Giải đang diễn ra. Mọi thao tác thêm/sửa VĐV ở đây đòi hỏi bạn phải sang tab Gắp Thăm bấm "Quay xe" để xếp lại lịch thi đấu!</div>` : ''}""")


# 2. Add Split button
js = js.replace("""<span style="color:#888; font-size:12px; margin:0 6px;">+</span> <strong style="font-size:13px; color:#333;">${escapeHtml(memberDisplayName(p2))}</strong> ${p2.gender==='Nữ'?'👩':'👨'}`""",
"""<span style="color:#888; font-size:12px; margin:0 6px;">+</span> <strong style="font-size:13px; color:#333;">${escapeHtml(memberDisplayName(p2))}</strong> ${p2.gender==='Nữ'?'👩':'👨'} ${canManage() ? `<button class="bc-btn small warning" id="split-reg-${r.id}" style="margin-left:8px; padding:2px 6px; font-size:10px;">✂️ Tách cặp</button>` : ''}`""")

# Add split logic near del-reg
js = js.replace("""const btn = document.getElementById(`del-reg-${r.id}`);""",
"""const sBtn = document.getElementById(`split-reg-${r.id}`);
                if (sBtn) sBtn.onclick = async () => {
                  if (!confirm('Bạn có chắc muốn tách cặp này thành 2 người Solo?')) return;
                  await mutateTournaments(tours => {
                     const tour = tours.find(t => t.id === activeTour.id);
                     if (tour) {
                        const tr = tour.registrations.find(x => x.id === r.id);
                        if (tr) {
                           tr.type = 'solo';
                           const m2Id = tr.m2;
                           tr.m2 = null;
                           if (m2Id) {
                              tour.registrations.push({ id: uid(), cat: tr.cat, type: 'solo', m1: m2Id, m2: null, createdAt: Date.now() });
                           }
                        }
                     }
                     return tours;
                  });
                  render();
                };
                const btn = document.getElementById(`del-reg-${r.id}`);""")


# 3. Replace pairing card with Matrix
old_pairing_card = """<h4 style="font-size:15px; color:#1B4332; margin-bottom:10px;">👥 BTC Cáp Kèo (Cho các VĐV đăng ký Solo)</h4>
              <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
                <div style="flex:1; min-width:140px;">
                  <select class="bc-select" id="pair-m1">
                    <option value="">- VĐV 1 -</option>
                    ${activeTour.registrations.filter(r => r.type==='solo').map(r => {
                      const m = state.members.find(x => x.id === r.m1);
                      return m ? `<option value="${r.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'} - ${r.cat})</option>` : '';
                    }).join('')}
                  </select>
                </div>
                <div style="flex:1; min-width:140px;">
                  <select class="bc-select" id="pair-m2">
                    <option value="">- VĐV 2 -</option>
                    ${activeTour.registrations.filter(r => r.type==='solo').map(r => {
                      const m = state.members.find(x => x.id === r.m1);
                      return m ? `<option value="${r.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'} - ${r.cat})</option>` : '';
                    }).join('')}
                  </select>
                </div>
                <div style="flex:1; min-width:120px;">
                  <select class="bc-select" id="pair-target-cat">
                    ${activeTour.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                  </select>
                </div>
                <button class="bc-btn" id="pair-merge-btn">Ghép cặp</button>
              </div>"""

new_pairing_card = """${(() => {
                const soloRegs = activeTour.registrations.filter(r => r.type === 'solo');
                return `<h4 style="font-size:15px; color:#1B4332; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                  <span>👥 MA TRẬN CÁP KÈO (${soloRegs.length} VĐV)</span>
                  ${soloRegs.length >= 2 ? `<div style="display:flex; gap:6px; align-items:center;">
                    <select class="bc-select" id="matrix-target-cat" style="font-size:12px; padding:4px 8px;">
                      ${activeTour.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                    <button class="bc-btn small" id="pair-merge-selected-btn" style="background:#1B4332; border-color:#1B4332; font-size:12px; padding:6px 12px;">🔗 Ghép cặp 2 VĐV đã chọn</button>
                  </div>` : ''}
                </h4>
                
                <div style="overflow-x:auto;">
                   <table class="bc-table" style="width:100%; font-size:13px; border-collapse:collapse;">
                     <thead><tr style="background:#E8F5E9; text-align:left;">
                       <th style="padding:8px; width:40px; text-align:center;">Chọn</th>
                       <th style="padding:8px;">Vận động viên</th>
                       <th style="padding:8px; text-align:center;">Giới tính</th>
                       <th style="padding:8px;">Hạng mục đăng ký</th>
                     </tr></thead>
                     <tbody>
                       ${soloRegs.length === 0 ? `<tr><td colspan="4" style="text-align:center; padding:15px; color:#666; font-style:italic;">Không có VĐV nào đang đợi ghép cặp.</td></tr>` : ''}
                       ${soloRegs.map(r => {
                          const m = state.members.find(x => x.id === r.m1);
                          return `<tr>
                            <td style="padding:8px; text-align:center;">
                               <input type="checkbox" class="matrix-chk" value="${r.id}" style="transform:scale(1.3); cursor:pointer;" />
                            </td>
                            <td style="padding:8px; font-weight:600;">${escapeHtml(m?memberDisplayName(m):'')}</td>
                            <td style="padding:8px; text-align:center;">${m?.gender==='Nữ'?'👩 Nữ':'👨 Nam'}</td>
                            <td style="padding:8px;"><span class="bc-badge" style="background:#E3F2FD; color:#1565C0;">${r.cat}</span></td>
                          </tr>`;
                       }).join('')}
                     </tbody>
                   </table>
                </div>`;
              })()}"""

js = js.replace(old_pairing_card, new_pairing_card)

# Replace old pair-merge logic
old_merge_logic = """document.getElementById('pair-merge-btn').onclick = async () => {
                const r1Id = document.getElementById('pair-m1').value;
                const r2Id = document.getElementById('pair-m2').value;
                const tCat = document.getElementById('pair-target-cat').value;
                if (!r1Id || !r2Id || r1Id === r2Id) return alert('Vui lòng chọn 2 VĐV hợp lệ!');"""
new_merge_logic = """const mergeBtn = document.getElementById('pair-merge-selected-btn');
              if (mergeBtn) mergeBtn.onclick = async () => {
                const checked = Array.from(document.querySelectorAll('.matrix-chk:checked')).map(x => x.value);
                if (checked.length !== 2) return alert('Vui lòng tick chọn chính xác 2 VĐV để ghép cặp!');
                const r1Id = checked[0];
                const r2Id = checked[1];
                const tCat = document.getElementById('matrix-target-cat').value;"""
js = js.replace(old_merge_logic, new_merge_logic)


# 4. Add Turn Number (Lượt đánh)
# In Group Stage
js = js.replace("""<select class="bc-select small-court-sel" data-mid="${m.id}" style="font-size:11px; padding:2px; background:#FFF9C4; border:1px solid #FBC02D;">""",
"""<input type="text" class="small-turn-inp" data-mid="${m.id}" value="${escapeHtml(m.turn||'')}" placeholder="Lượt (VD: 1)" style="width:70px; font-size:11px; padding:2px; border:1px solid #FBC02D; border-radius:4px; text-align:center; background:#FFF9C4; margin-right:4px;" />
                            <select class="bc-select small-court-sel" data-mid="${m.id}" style="font-size:11px; padding:2px; background:#FFF9C4; border:1px solid #FBC02D;">""")

js = js.replace("""<span style="font-size:11px; font-weight:bold; color:#F57F17; background:#FFFDE7; padding:2px 6px; border-radius:4px;">${m.courtId ? escapeHtml(m.courtId) : 'Chưa xếp sân'}</span>""",
"""<span style="font-size:11px; font-weight:bold; color:#F57F17; background:#FFFDE7; padding:2px 6px; border-radius:4px;">${m.turn ? `Lượt ${escapeHtml(m.turn)} - ` : ''}${m.courtId ? escapeHtml(m.courtId) : 'Chưa xếp sân'}</span>""")

js = js.replace("""document.querySelectorAll('.small-court-sel').forEach(sel => {""",
"""document.querySelectorAll('.small-turn-inp').forEach(inp => {
                   inp.onchange = async (e) => {
                      const mId = e.target.dataset.mid;
                      const turnVal = e.target.value.trim();
                      await mutateTournaments(tours => {
                         const match = tours.find(t=>t.id===activeTour.id).matches.find(x=>x.id===mId);
                         if (match) match.turn = turnVal;
                         return tours;
                      });
                   };
                });
                document.querySelectorAll('.small-court-sel').forEach(sel => {""")


# In Knockout Stage
js = js.replace("""<select class="bc-select k-court-sel" data-mid="${m.id}" data-cat="${cat}" style="font-size:10px; padding:2px; background:#E3F2FD; border:1px solid #90CAF9; width:90px;">""",
"""<input type="text" class="k-turn-inp" data-mid="${m.id}" data-cat="${cat}" value="${escapeHtml(m.turn||'')}" placeholder="Lượt" style="width:40px; font-size:10px; padding:2px; border:1px solid #90CAF9; border-radius:4px; text-align:center; background:#E3F2FD; margin-right:4px;" />
                                  <select class="bc-select k-court-sel" data-mid="${m.id}" data-cat="${cat}" style="font-size:10px; padding:2px; background:#E3F2FD; border:1px solid #90CAF9; width:90px;">""")

js = js.replace("""<span style="font-size:10px; font-weight:bold; color:#1976D2; background:#E3F2FD; padding:2px 6px; border-radius:4px;">${m.courtId ? escapeHtml(m.courtId) : 'Chưa xếp sân'}</span>""",
"""<span style="font-size:10px; font-weight:bold; color:#1976D2; background:#E3F2FD; padding:2px 6px; border-radius:4px;">${m.turn ? `Lượt ${escapeHtml(m.turn)} - ` : ''}${m.courtId ? escapeHtml(m.courtId) : 'Chưa xếp sân'}</span>""")


js = js.replace("""document.querySelectorAll('.k-court-sel').forEach(sel => {""",
"""document.querySelectorAll('.k-turn-inp').forEach(inp => {
                   inp.onchange = async (e) => {
                      const mId = e.target.dataset.mid;
                      const turnVal = e.target.value.trim();
                      const cCat = e.target.dataset.cat;
                      await mutateTournaments(tours => {
                         const match = tours.find(t=>t.id===activeTour.id).bracket[cCat].find(x=>x.id===mId);
                         if (match) match.turn = turnVal;
                         return tours;
                      });
                   };
                });
                document.querySelectorAll('.k-court-sel').forEach(sel => {""")


with open('/Users/kietdmt/Documents/v4_temp.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("v4_temp.js patched successfully")

import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update Registration Form
old_reg_form = """                  <h4 style="font-size:16px; color:var(--text-primary); margin-bottom:12px; font-family:'Oswald',sans-serif;">TẠO PHIẾU ĐĂNG KÝ THAM GIA</h4>
                  ${activeTour.status !== 'registering' ? `<div style="font-size:12px; color:#F26419; background:var(--tab-bg); padding:8px; border-radius:4px; margin-bottom:10px; font-weight:bold;">⚠️ Lưu ý: Giải đang diễn ra. Mọi thao tác thêm/sửa VĐV ở đây đòi hỏi bạn phải sang tab Gắp Thăm bấm "Quay xe" để xếp lại lịch thi đấu!</div>` : ''}
                  <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
                    ${isManager ? `
                    <div style="flex:1; min-width:140px;">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px; color:#F26419;">VĐV Ghi danh (Admin)</label>
                      <select class="bc-select" id="reg-m1" style="border-color:#F26419;">
                        <option value="${state.me.id}">-- Chính bạn --</option>
                        ${activeMembers.filter(m => m.id !== state.me.id).map(m => `<option value="${m.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'})</option>`).join('')}
                      </select>
                    </div>
                    ` : ''}
                    <div style="flex:1; min-width:140px;">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Chọn hạng mục</label>
                      <select class="bc-select" id="reg-cat">
                        ${activeTour.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                      </select>
                    </div>
                    <div style="flex:1.5; min-width:180px;">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Hình thức đăng ký</label>
                      <select class="bc-select" id="reg-type">
                        <option value="solo">Cá nhân (Tìm đồng đội)</option>
                        <option value="pair">Nguyên cặp (Đã có partner)</option>
                      </select>
                    </div>
                    <div style="flex:1.5; min-width:180px; display:none;" id="reg-partner-box">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Chọn Partner</label>
                      <select class="bc-select" id="reg-partner">
                        <option value="">-- Chọn thành viên --</option>
                        ${activeMembers.map(m => `<option value="${m.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'})</option>`).join('')}
                      </select>
                    </div>
                    <button class="bc-btn" id="reg-submit-btn" style="background:#27500A; border-color:var(--text-primary);">Ghi danh ngay!</button>
                  </div>"""

new_reg_form = """                  <h4 style="font-size:16px; color:var(--text-primary); margin-bottom:12px; font-family:'Oswald',sans-serif;">TẠO PHIẾU ĐĂNG KÝ THAM GIA</h4>
                  <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
                    ${isManager ? `
                    <div style="flex:1; min-width:140px;">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px; color:#F26419;">VĐV Ghi danh (Admin)</label>
                      <select class="bc-select" id="reg-m1" style="border-color:#F26419;">
                        <option value="${state.me.id}">-- Chính bạn --</option>
                        ${activeMembers.filter(m => m.id !== state.me.id).map(m => `<option value="${m.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'})</option>`).join('')}
                      </select>
                    </div>
                    ` : ''}
                    <div style="flex:1; min-width:140px;">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Chọn hạng mục</label>
                      <select class="bc-select" id="reg-cat">
                        ${activeTour.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                      </select>
                    </div>
                    <div style="flex:1; min-width:160px;">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Trình độ (Tự đánh giá)</label>
                      <select class="bc-select" id="reg-skill">
                        <option value="Chưa xác định">-- Chọn trình độ --</option>
                        <option value="Newbie">🐣 Newbie (Mới chơi)</option>
                        <option value="Beginner">🏸 Beginner (Biết đánh cơ bản)</option>
                        <option value="Intermediate">🔥 Intermediate (Khá tốt)</option>
                        <option value="Advanced">⚡ Advanced (Kinh nghiệm/Giỏi)</option>
                      </select>
                    </div>
                    <div style="flex:1.5; min-width:180px;">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Hình thức đăng ký</label>
                      <select class="bc-select" id="reg-type">
                        <option value="solo">Cá nhân (Tìm đồng đội)</option>
                        <option value="pair">Nguyên cặp (Đã có partner)</option>
                      </select>
                    </div>
                    <div style="flex:1.5; min-width:180px; display:none;" id="reg-partner-box">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Chọn Partner</label>
                      <select class="bc-select" id="reg-partner">
                        <option value="">-- Chọn thành viên --</option>
                        ${activeMembers.map(m => `<option value="${m.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'})</option>`).join('')}
                      </select>
                    </div>
                    <button class="bc-btn" id="reg-submit-btn" style="background:#27500A; border-color:var(--text-primary);">Ghi danh ngay!</button>
                  </div>"""

html = html.replace(old_reg_form, new_reg_form)

# 2. Update tour.registrations.push
old_push = """                    await mutateTournaments(tours => {
                      const tour = tours.find(t => t.id === activeTour.id);
                      if (tour) {
                         tour.registrations.push({ id: uid(), cat, type, m1: me.id, m2, createdAt: Date.now() });
                      }
                      return tours;
                    });"""

new_push = """                    const skill = document.getElementById('reg-skill') ? document.getElementById('reg-skill').value : '';
                    await mutateTournaments(tours => {
                      const tour = tours.find(t => t.id === activeTour.id);
                      if (tour) {
                         tour.registrations.push({ id: uid(), cat, type, m1: me.id, m2, skill, createdAt: Date.now() });
                      }
                      return tours;
                    });"""

html = html.replace(old_push, new_push)

# 3. Update Display in List
old_list = """                  <div>
                    <span class="bc-badge" style="background:var(--tab-bg); color:var(--text-primary); margin-right:8px;">${r.cat}</span>
                    <strong style="font-size:13px; color:var(--text-secondary);">${escapeHtml(p1?memberDisplayName(p1):'')}</strong> ${p1?.gender==='Nữ'?'👩':'👨'}
                    ${r.type === 'pair' && p2 ? `<span style="color:var(--text-secondary); font-size:12px; margin:0 6px;">+</span> <strong style="font-size:13px; color:var(--text-secondary);">${escapeHtml(memberDisplayName(p2))}</strong> ${p2.gender==='Nữ'?'👩':'👨'} ${canManage() ? `<button class="bc-btn small warning" id="split-reg-${r.id}" style="margin-left:8px; padding:2px 6px; font-size:10px;">✂️ Tách cặp</button>` : ''}` : `<span style="font-size:11px; color:#F26419; margin-left:8px; font-style:italic;">(Đang tìm partner 🤝)</span>`}
                  </div>"""

new_list = """                  <div>
                    <span class="bc-badge" style="background:var(--tab-bg); color:var(--text-primary); margin-right:8px;">${r.cat}</span>
                    <strong style="font-size:13px; color:var(--text-secondary);">${escapeHtml(p1?memberDisplayName(p1):'')}</strong> ${p1?.gender==='Nữ'?'👩':'👨'}
                    ${r.type === 'pair' && p2 ? `<span style="color:var(--text-secondary); font-size:12px; margin:0 6px;">+</span> <strong style="font-size:13px; color:var(--text-secondary);">${escapeHtml(memberDisplayName(p2))}</strong> ${p2.gender==='Nữ'?'👩':'👨'} ${canManage() ? `<button class="bc-btn small warning" id="split-reg-${r.id}" style="margin-left:8px; padding:2px 6px; font-size:10px;">✂️ Tách cặp</button>` : ''}` : `<span style="font-size:11px; color:#F26419; margin-left:8px; font-style:italic;">(Đang tìm partner 🤝)</span>`}
                    ${r.skill && r.skill !== 'Chưa xác định' ? `<span style="font-size:11px; margin-left:8px; background:#4CAF50; color:#FFF; padding:2px 6px; border-radius:4px; font-weight:600;">${r.skill}</span>` : ''}
                  </div>"""

html = html.replace(old_list, new_list)

# 4. Update Display in Matrix
old_matrix_th = """                       <th style="padding:8px; width:40px; text-align:center;">Chọn</th>
                       <th style="padding:8px;">Vận động viên</th>
                       <th style="padding:8px; text-align:center;">Giới tính</th>
                       <th style="padding:8px;">Hạng mục đăng ký</th>"""

new_matrix_th = """                       <th style="padding:8px; width:40px; text-align:center;">Chọn</th>
                       <th style="padding:8px;">Vận động viên</th>
                       <th style="padding:8px; text-align:center;">Giới tính</th>
                       <th style="padding:8px;">Trình độ</th>
                       <th style="padding:8px;">Hạng mục đăng ký</th>"""

html = html.replace(old_matrix_th, new_matrix_th)

old_matrix_td = """                            <td style="padding:8px; text-align:center;">
                               <input type="checkbox" class="matrix-chk" value="${r.id}" style="transform:scale(1.3); cursor:pointer;" />
                            </td>
                            <td style="padding:8px; font-weight:600;">${escapeHtml(m?memberDisplayName(m):'')}</td>
                            <td style="padding:8px; text-align:center;">${m?.gender==='Nữ'?'👩 Nữ':'👨 Nam'}</td>
                            <td style="padding:8px;">
                               <span class="bc-badge" style="background:var(--tab-bg); color:var(--text-primary); font-size:12px;">${r.cat}</span>
                            </td>"""

new_matrix_td = """                            <td style="padding:8px; text-align:center;">
                               <input type="checkbox" class="matrix-chk" value="${r.id}" style="transform:scale(1.3); cursor:pointer;" />
                            </td>
                            <td style="padding:8px; font-weight:600;">${escapeHtml(m?memberDisplayName(m):'')}</td>
                            <td style="padding:8px; text-align:center;">${m?.gender==='Nữ'?'👩 Nữ':'👨 Nam'}</td>
                            <td style="padding:8px;">${r.skill && r.skill !== 'Chưa xác định' ? `<span style="font-size:11px; background:#4CAF50; color:#FFF; padding:2px 6px; border-radius:4px;">${r.skill}</span>` : '-'}</td>
                            <td style="padding:8px;">
                               <span class="bc-badge" style="background:var(--tab-bg); color:var(--text-primary); font-size:12px;">${r.cat}</span>
                            </td>"""

html = html.replace(old_matrix_td, new_matrix_td)


with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html registration UI patched")

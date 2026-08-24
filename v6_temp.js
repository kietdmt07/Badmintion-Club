function renderTournament(){
    const wrap = el(`<div></div>`);
    
    const banner = el(`<div class="bc-card" style="
        background: linear-gradient(135deg, #FF3D00 0%, #FF8F00 100%);
        border: 1px solid rgba(255,255,255,0.3);
        padding: 1.5rem 1.4rem;
        position:relative; overflow:hidden; margin-bottom:1rem; box-shadow: 0 4px 15px rgba(255,61,0,0.3);">
      <div style="position:absolute;top:-20px;right:-10px;font-size:100px;opacity:0.15;line-height:1;pointer-events:none;">🏸</div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:32px; animation:crown-float 2.5s ease-in-out infinite; display:inline-block; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🔥</span>
        <div>
          <h2 style="color:#FFF; font-family:'Oswald',sans-serif; font-size:22px; margin:0; letter-spacing:0.05em; text-transform:uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">HỆ THỐNG GIẢI ĐẤU CLB</h2>
          <div style="color:rgba(255,255,255,0.9); font-size:12px; margin-top:2px;">Nơi tôn vinh những tay vợt xuất sắc nhất</div>
        </div>
      </div>
    </div>`);
    wrap.appendChild(banner);

    const activeTour = state.tournaments.find(t => t.status !== 'finished');
    const finishedTours = state.tournaments.filter(t => t.status === 'finished').sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));

    // CREATE NEW TOURNAMENT UI
    if (!activeTour) {
      if (canManage()) {
        state.tourSetup = state.tourSetup || {
          name: 'Giải Cầu Lông Mùa Hè',
          categories: ['Đôi Nam'],
          courtsCount: 4,
          selectedCourts: state.courts.slice(0, 4).map(c => c.id)
        };

        const setupCard = el(`<div class="bc-card" style="border: 2px dashed #FF8F00; margin-bottom:20px;">
          <h3 style="font-size:16px; color:#F26419; margin-bottom:15px; font-family:'Oswald', sans-serif;">🛠️ KHỞI TẠO GIẢI ĐẤU MỚI</h3>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
              <label style="font-size:13px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Tên giải đấu</label>
              <input class="bc-input" id="ts-name" value="${escapeHtml(state.tourSetup.name)}" placeholder="VD: Giải Cầu Lông Aron Smash 2026" />
            </div>
            <div style="display:flex; gap:16px; flex-wrap:wrap;">
              <div style="flex:1; min-width:140px;">
                <label style="font-size:13px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Số lượng sân thi đấu</label>
                <input type="number" class="bc-input" id="ts-courts-count" value="4" min="1" max="20" style="width:100%;" />
              </div>
            </div>
            <div style="border-top:1px dashed var(--card-border); padding-top:12px;">
              <label style="font-size:13px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Hạng mục thi đấu</label>
              <div style="display:flex; gap:16px; flex-wrap:wrap;">
                ${['Đôi Nam', 'Đôi Nữ', 'Đôi Nam Nữ'].map(cat => {
                  const checked = state.tourSetup.categories.includes(cat) ? 'checked' : '';
                  return `<label style="display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:600;">
                    <input type="checkbox" class="ts-cat-chk" value="${cat}" ${checked} /> 🏸 ${cat}
                  </label>`;
                }).join(' ')}
              </div>
            </div>
            <div style="text-align:right; margin-top:10px;">
              <button class="bc-btn" id="ts-start-btn" style="background:#FF3D00; border-color:#F26419; font-size:14px; padding:10px 20px;">
                Mở Cổng Đăng Ký 🚀
              </button>
            </div>
          </div>
        </div>`);
        wrap.appendChild(setupCard);

        setTimeout(() => {
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
                  content: `Ban chủ nhiệm vừa mở cổng đăng ký cho giải đấu **${name}**.\nCác VĐV hãy mau chóng vào Tab [Giải Đấu] để ghi danh và tìm đồng đội nhé!\n\nHạng mục: ${selCats.join(', ')}`,
                  pinned: true,
                  createdAt: Date.now()
               });
               return anns;
            });
            state.tourSetup = null;
            render();
          };
        }, 0);
      }
    }

    // ACTIVE TOURNAMENT TABS
    if (activeTour) {
       if (!state.tourActiveTab) {
          if (activeTour.status === 'registering') state.tourActiveTab = 'reg';
          else if (activeTour.status === 'grouping') state.tourActiveTab = 'grouping';
          else if (activeTour.status === 'playing') state.tourActiveTab = 'group';
          else if (activeTour.status === 'knockout') state.tourActiveTab = 'knockout';
       }
       if (activeTour.status === 'playing' && state.tourActiveTab === 'grouping') state.tourActiveTab = 'group';

       const isRegTab = state.tourActiveTab === 'reg';
       const isGroupingTab = state.tourActiveTab === 'grouping';
       const isGroupTab = state.tourActiveTab === 'group';
       const isKnockoutTab = state.tourActiveTab === 'knockout';

       const tabsUI = el(`<div style="display:flex; border-bottom:2px solid var(--card-border); margin-bottom:20px; position:sticky; top:0; background:var(--card-bg); z-index:10; overflow-x:auto;">
         <div class="bc-tab ${isRegTab ? 'active' : ''}" style="flex:1; text-align:center; padding:12px; font-weight:bold; cursor:pointer; color:${isRegTab?'#E65100':'#666'}; border-bottom:${isRegTab?'3px solid #E65100':'none'}; white-space:nowrap;" id="tt-reg">📝 Ghi Danh</div>
         ${activeTour.status === 'grouping' ? `<div class="bc-tab ${isGroupingTab ? 'active' : ''}" style="flex:1; text-align:center; padding:12px; font-weight:bold; cursor:pointer; color:${isGroupingTab?'#9C27B0':'#666'}; border-bottom:${isGroupingTab?'3px solid var(--card-border)':'none'}; white-space:nowrap;" id="tt-grouping">🎲 Gắp Thăm</div>` : ''}
         ${activeTour.status === 'playing' || activeTour.status === 'knockout' ? `<div class="bc-tab ${isGroupTab ? 'active' : ''}" style="flex:1; text-align:center; padding:12px; font-weight:bold; cursor:pointer; color:${isGroupTab?'#2E7D32':'#666'}; border-bottom:${isGroupTab?'3px solid #2E7D32':'none'}; white-space:nowrap;" id="tt-group">⚔️ Vòng Bảng</div>` : ''}
         ${activeTour.status === 'knockout' ? `<div class="bc-tab ${isKnockoutTab ? 'active' : ''}" style="flex:1; text-align:center; padding:12px; font-weight:bold; cursor:pointer; color:${isKnockoutTab?'#3F51B5':'#666'}; border-bottom:${isKnockoutTab?'3px solid #3F51B5':'none'}; white-space:nowrap;" id="tt-knockout">🏆 Nhánh Đấu</div>` : ''}
       </div>`);
       wrap.appendChild(tabsUI);

       setTimeout(() => {
          document.getElementById('tt-reg').onclick = () => { state.tourActiveTab = 'reg'; render(); };
          if(document.getElementById('tt-grouping')) document.getElementById('tt-grouping').onclick = () => { state.tourActiveTab = 'grouping'; render(); };
          if(document.getElementById('tt-group')) document.getElementById('tt-group').onclick = () => { state.tourActiveTab = 'group'; render(); };
          if(document.getElementById('tt-knockout')) document.getElementById('tt-knockout').onclick = () => { state.tourActiveTab = 'knockout'; render(); };
       }, 0);

       // Active Tour Header
       wrap.appendChild(el(`<div class="bc-card" style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:var(--card-bg)3E0; border:1px solid var(--card-border); margin-bottom:1rem; position:relative;">
          <div>
             <h3 style="font-size:20px; color:#F26419; font-family:'Oswald',sans-serif; margin-bottom:5px; display:flex; align-items:center; gap:8px;">
               ${escapeHtml(activeTour.name)}
               ${canManage() ? `<button class="bc-btn small" id="edit-tour-btn" style="background:transparent; border:none; padding:0; font-size:14px; margin-left:10px;" title="Sửa thông tin giải">⚙️</button>` : ''}
             </h3>
             <div style="font-size:12px; color:#F26419; font-weight:600;">Tình trạng: ${activeTour.status.toUpperCase()} | Sân thi đấu: ${activeTour.courtsCount || 4} sân</div>
          </div>
          ${canManage() || isOwner() ? `<div>
             <button class="bc-btn danger small" id="delete-tour-btn">🗑️ Xóa</button>
          </div>` : ''}
       </div>`));

       setTimeout(() => {
          const editBtn = document.getElementById('edit-tour-btn');
          if (editBtn) editBtn.onclick = () => {
             const newName = prompt('Nhập tên giải đấu mới:', activeTour.name);
             if (!newName) return;
             const newCountStr = prompt('Nhập số lượng sân (VD: 4):', activeTour.courtsCount || 4);
             const newCount = parseInt(newCountStr, 10);
             if (!newCount) return;
             mutateTournaments(tours => {
                const t = tours.find(x => x.id === activeTour.id);
                if (t) { t.name = newName; t.courtsCount = newCount; }
                return tours;
             }).then(() => render());
          };
          
          const delBtn = document.getElementById('delete-tour-btn');
          if (delBtn) delBtn.onclick = async () => {
             if(!confirm('Bạn có chắc chắn muốn xóa Giải đấu này? Toàn bộ đăng ký và kết quả sẽ biến mất vĩnh viễn!')) return;
             await mutateTournaments(tours => tours.filter(t => t.id !== activeTour.id));
             state.tourActiveTab = null;
             showToast('Đã xóa giải đấu', 'success');
             render();
          };
       }, 0);

       // ======================== TAB 1: REGISTRATION ========================
       if (isRegTab) {
          const activeMembers = state.members.filter(m => m.status === 'active');
          activeTour.registrations = activeTour.registrations || [];
          const myRegs = activeTour.registrations.filter(r => r.m1 === state.me?.id || r.m2 === state.me?.id);
          const isManager = canManage();

          if (true) {
              if (state.me) {
                if (myRegs.length > 0) {
                  wrap.appendChild(el(`<div class="bc-card" style="margin-bottom:1rem; text-align:center; padding:15px; color:var(--text-primary); background:var(--tab-bg); font-weight:600; font-size:14px; border:1px solid #27500A;">
                    🎉 Bạn đã ghi danh các hạng mục: ${myRegs.map(r => r.cat).join(', ')}. Chúc bạn thi đấu tốt! 💪
                  </div>`));
                }
                const regCard = el(`<div class="bc-card" style="margin-bottom:1rem; border:2px solid #27500A;">
                  <h4 style="font-size:16px; color:var(--text-primary); margin-bottom:12px; font-family:'Oswald',sans-serif;">TẠO PHIẾU ĐĂNG KÝ THAM GIA</h4>
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
                  </div>
                </div>`);
                wrap.appendChild(regCard);
                
                setTimeout(() => {
                  const typeSel = document.getElementById('reg-type');
                  const pBox = document.getElementById('reg-partner-box');
                  if(typeSel) typeSel.onchange = () => { pBox.style.display = typeSel.value==='pair'?'block':'none'; };
                  
                  document.getElementById('reg-submit-btn').onclick = async () => {
                    const cat = document.getElementById('reg-cat').value;
                    const type = document.getElementById('reg-type').value;
                    let m2 = null;
                    const m1_id = isManager ? (document.getElementById('reg-m1') ? document.getElementById('reg-m1').value : state.me.id) : state.me.id;
                    if (!m1_id) return alert('Vui lòng chọn VĐV cần đăng ký hộ!');
                    const me = state.members.find(m => m.id === m1_id);
                    if (!me) return;
                    if (activeTour.registrations.some(r => r.cat === cat && (r.m1 === m1_id || r.m2 === m1_id))) return alert(`VĐV này đã đăng ký hạng mục ${cat} rồi!`);
                    
                    if (type === 'pair') {
                      m2 = document.getElementById('reg-partner').value;
                      if (!m2) return alert('Vui lòng chọn Partner!');
                      if (m2 === m1_id) return alert('Không thể chọn chính mình làm Partner!');
                      const p2 = state.members.find(m => m.id === m2);
                      if (!p2) return;
                      if (activeTour.registrations.some(r => r.cat === cat && (r.m1 === p2.id || r.m2 === p2.id))) return alert(`Partner này đã đăng ký hạng mục ${cat} rồi!`);
                      
                      if (cat === 'Đôi Nam' && (me.gender === 'Nữ' || p2.gender === 'Nữ')) return alert('Đôi Nam yêu cầu 2 VĐV Nam!');
                      if (cat === 'Đôi Nữ' && ((me.gender||'Nam') === 'Nam' || (p2.gender||'Nam') === 'Nam')) return alert('Đôi Nữ yêu cầu 2 VĐV Nữ!');
                      if (cat === 'Đôi Nam Nữ') {
                        const g1 = me.gender || 'Nam';
                        const g2 = p2.gender || 'Nam';
                        if (g1 === g2) return alert('Đôi Nam Nữ yêu cầu 1 Nam và 1 Nữ!');
                      }
                    } else {
                      if (cat === 'Đôi Nam' && me.gender === 'Nữ') return alert('Bạn là Nữ, không thể đăng ký Đôi Nam!');
                      if (cat === 'Đôi Nữ' && (me.gender||'Nam') === 'Nam') return alert('Bạn là Nam, không thể đăng ký Đôi Nữ!');
                    }
                    
                    await mutateTournaments(tours => {
                      const tour = tours.find(t => t.id === activeTour.id);
                      if (tour) {
                         tour.registrations.push({ id: uid(), cat, type, m1: me.id, m2, createdAt: Date.now() });
                      }
                      return tours;
                    });
                    showToast('Đăng ký thành công!', 'success');
                    render();
                  };
                }, 0);
              }
          }

          const listCard = el(`<div class="bc-card" style="margin-bottom:1rem;">
            <h4 style="font-size:15px; color:var(--text-primary); margin-bottom:10px;">📋 Danh sách VĐV Ghi Danh (${activeTour.registrations.length} lượt)</h4>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${activeTour.registrations.length === 0 ? '<div class="bc-empty" style="padding:10px;">Chưa có ai đăng ký.</div>' : ''}
              ${activeTour.registrations.map(r => {
                const p1 = state.members.find(m => m.id === r.m1);
                const p2 = r.m2 ? state.members.find(m => m.id === r.m2) : null;
                return `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--card-bg); border:1px solid #E9ECEF; border-radius:6px;">
                  <div>
                    <span class="bc-badge" style="background:var(--tab-bg); color:var(--text-primary); margin-right:8px;">${r.cat}</span>
                    <strong style="font-size:13px; color:var(--text-secondary);">${escapeHtml(p1?memberDisplayName(p1):'')}</strong> ${p1?.gender==='Nữ'?'👩':'👨'}
                    ${r.type === 'pair' && p2 ? `<span style="color:var(--text-secondary); font-size:12px; margin:0 6px;">+</span> <strong style="font-size:13px; color:var(--text-secondary);">${escapeHtml(memberDisplayName(p2))}</strong> ${p2.gender==='Nữ'?'👩':'👨'} ${canManage() ? `<button class="bc-btn small warning" id="split-reg-${r.id}" style="margin-left:8px; padding:2px 6px; font-size:10px;">✂️ Tách cặp</button>` : ''}` : `<span style="font-size:11px; color:#F26419; margin-left:8px; font-style:italic;">(Đang tìm partner 🤝)</span>`}
                  </div>
                  ${canManage() && activeTour.status === 'registering' ? `<button class="bc-btn danger small" id="del-reg-${r.id}">Xóa</button>` : ''}
                </div>`;
              }).join('')}
            </div>
          </div>`);
          wrap.appendChild(listCard);
          
          if (canManage() && activeTour.status === 'registering') {
            const pairingCard = el(`<div class="bc-card" style="border: 2px solid #1B4332;">
              ${(() => {
                const soloRegs = activeTour.registrations.filter(r => r.type === 'solo');
                return `<h4 style="font-size:15px; color:var(--text-primary); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                  <span>👥 MA TRẬN CÁP KÈO (${soloRegs.length} VĐV)</span>
                  ${soloRegs.length >= 2 ? `<div style="display:flex; gap:6px; align-items:center;">
                    <select class="bc-select" id="matrix-target-cat" style="font-size:12px; padding:4px 8px;">
                      ${activeTour.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                    <button class="bc-btn small" id="pair-merge-selected-btn" style="background:#1B4332; border-color:var(--text-primary); font-size:12px; padding:6px 12px;">🔗 Ghép cặp 2 VĐV đã chọn</button>
                  </div>` : ''}
                </h4>
                
                <div style="overflow-x:auto;">
                   <table class="bc-table" style="width:100%; font-size:13px; border-collapse:collapse;">
                     <thead><tr style="background:var(--tab-bg); text-align:left;">
                       <th style="padding:8px; width:40px; text-align:center;">Chọn</th>
                       <th style="padding:8px;">Vận động viên</th>
                       <th style="padding:8px; text-align:center;">Giới tính</th>
                       <th style="padding:8px;">Hạng mục đăng ký</th>
                     </tr></thead>
                     <tbody>
                       ${soloRegs.length === 0 ? `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-secondary); font-style:italic;">Không có VĐV nào đang đợi ghép cặp.</td></tr>` : ''}
                       ${soloRegs.map(r => {
                          const m = state.members.find(x => x.id === r.m1);
                          return `<tr>
                            <td style="padding:8px; text-align:center;">
                               <input type="checkbox" class="matrix-chk" value="${r.id}" style="transform:scale(1.3); cursor:pointer;" />
                            </td>
                            <td style="padding:8px; font-weight:600;">${escapeHtml(m?memberDisplayName(m):'')}</td>
                            <td style="padding:8px; text-align:center;">${m?.gender==='Nữ'?'👩 Nữ':'👨 Nam'}</td>
                            <td style="padding:8px;"><span class="bc-badge" style="background:var(--tab-bg); color:var(--text-primary);">${r.cat}</span></td>
                          </tr>`;
                       }).join('')}
                     </tbody>
                   </table>
                </div>`;
              })()}

              <div style="margin-top:20px; text-align:right; border-top:1px dashed #CCC; padding-top:15px;">
                <button class="bc-btn danger" id="tour-to-grouping-btn" style="font-size:14px; padding:10px 20px;">
                  🎲 CHỐT DANH SÁCH & CHUYỂN SANG GẮP THĂM
                </button>
              </div>
            </div>`);
            wrap.appendChild(pairingCard);
            
            setTimeout(() => {
              activeTour.registrations.forEach(r => {
                const sBtn = document.getElementById(`split-reg-${r.id}`);
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
                const btn = document.getElementById(`del-reg-${r.id}`);
                if(btn) btn.onclick = async () => {
                  await mutateTournaments(tours => {
                     const tour = tours.find(t => t.id === activeTour.id);
                     if (tour) tour.registrations = tour.registrations.filter(x => x.id !== r.id);
                     return tours;
                  });
                  render();
                };
              });

              const mergeBtn = document.getElementById('pair-merge-selected-btn');
              if (mergeBtn) mergeBtn.onclick = async () => {
                const checked = Array.from(document.querySelectorAll('.matrix-chk:checked')).map(x => x.value);
                if (checked.length !== 2) return alert('Vui lòng tick chọn chính xác 2 VĐV để ghép cặp!');
                const r1Id = checked[0];
                const r2Id = checked[1];
                const tCat = document.getElementById('matrix-target-cat').value;
                
                const r1 = activeTour.registrations.find(x => x.id === r1Id);
                const r2 = activeTour.registrations.find(x => x.id === r2Id);
                const m1 = state.members.find(x => x.id === r1.m1);
                const m2 = state.members.find(x => x.id === r2.m1);
                
                if (tCat === 'Đôi Nam' && (m1.gender === 'Nữ' || m2.gender === 'Nữ')) return alert('Đôi Nam yêu cầu 2 VĐV Nam!');
                if (tCat === 'Đôi Nữ' && ((m1.gender||'Nam') === 'Nam' || (m2.gender||'Nam') === 'Nam')) return alert('Đôi Nữ yêu cầu 2 VĐV Nữ!');
                if (tCat === 'Đôi Nam Nữ') {
                  const g1 = m1.gender || 'Nam';
                  const g2 = m2.gender || 'Nam';
                  if (g1 === g2) return alert('Đôi Nam Nữ yêu cầu 1 Nam và 1 Nữ!');
                }
                
                await mutateTournaments(tours => {
                    const tour = tours.find(t => t.id === activeTour.id);
                    if (tour) {
                       const tr1 = tour.registrations.find(x => x.id === r1Id);
                       if (tr1) {
                          tr1.type = 'pair';
                          tr1.m2 = m2.id;
                          tr1.cat = tCat;
                       }
                       tour.registrations = tour.registrations.filter(x => x.id !== r2Id);
                    }
                    return tours;
                });
                showToast('Ghép cặp thành công!', 'success');
                render();
              };
              
              document.getElementById('tour-to-grouping-btn').onclick = async () => {
                if(!confirm('Xác nhận chốt danh sách đăng ký để tiến hành gắp thăm chia bảng?')) return;
                
                // ĐÁNH SỐ ĐỘI (TEAM NUMBERING)
                let globalTeamNumber = 1;
                const pairs = activeTour.registrations.filter(r => r.type === 'pair').map(r => {
                  const p1 = state.members.find(x => x.id === r.m1);
                  const p2 = state.members.find(x => x.id === r.m2);
                  const nameStr = `Đội ${globalTeamNumber}: ${p1.nickname||p1.name} & ${p2.nickname||p2.name}`;
                  globalTeamNumber++;
                  return {
                    id: 'P' + Date.now() + Math.random().toString().slice(2,8),
                    m1: r.m1,
                    m2: r.m2,
                    cat: r.cat,
                    name: nameStr
                  };
                });

                const groups = [];
                for (const cat of activeTour.categories) {
                   const catPairs = pairs.filter(p => p.cat === cat);
                   if (catPairs.length === 0) continue;
                   
                   const numGroups = Math.max(1, Math.floor(catPairs.length / 4) || (catPairs.length >= 3 ? 1 : 1));
                   const shuffled = [...catPairs].sort(() => Math.random() - 0.5);
                   for (let i = 0; i < numGroups; i++) {
                       const gId = 'G' + Date.now() + i + cat.replace(/\s/g,'');
                       const groupName = `Bảng ${String.fromCharCode(65 + i)}`;
                       const groupPairs = shuffled.filter((_, idx) => idx % numGroups === i);
                       groups.push({ id: gId, cat, name: groupName, pairs: groupPairs.map(p => p.id) });
                   }
                }

                await mutateTournaments(tours => {
                   const tour = tours.find(t => t.id === activeTour.id);
                   if (tour) {
                      tour.pairs = pairs;
                      tour.groups = groups;
                      tour.matches = []; // matches will be generated after grouping
                      tour.status = 'grouping';
                   }
                   return tours;
                });
                state.tourActiveTab = 'grouping';
                showToast('Chuyển sang bước Gắp thăm chia bảng!', 'success');
                render();
              };
            }, 0);
          }
       }

       // ======================== TAB 2: GROUPING ========================
       if (isGroupingTab) {
          const groupingContainer = el(`<div style="display:flex; flex-direction:column; gap:20px;"></div>`);
          
          groupingContainer.appendChild(el(`<div class="bc-card" style="background:var(--tab-bg); border:1px solid #CE93D8;">
             <h4 style="color:var(--text-primary); margin-bottom:5px;">🎲 BƯỚC 2: GẮP THĂM & ĐIỀU CHỈNH BẢNG ĐẤU</h4>
             <div style="font-size:13px; color:var(--text-primary);">BTC có thể thay đổi bảng đấu cho từng Đội trước khi chốt. Hệ thống đã gợi ý chia đều ngẫu nhiên bên dưới.</div>
          </div>`));

          activeTour.categories.forEach(cat => {
             const catGroups = activeTour.groups.filter(g => g.cat === cat);
             if (catGroups.length === 0) return;

             const catCard = el(`<div class="bc-card" style="border-left:4px solid #9C27B0;">
                <h4 style="color:var(--text-primary); margin-bottom:15px; font-size:16px;">🏸 Hạng mục: ${cat}</h4>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:15px;">
                   ${catGroups.map(g => {
                      return `<div style="border:1px solid #E1BEE7; border-radius:8px; background:var(--card-bg); padding:10px;">
                         <div style="font-weight:bold; color:var(--text-primary); margin-bottom:10px; border-bottom:1px solid #E1BEE7; padding-bottom:5px;">${g.name} (${g.pairs.length} Đội)</div>
                         <div style="display:flex; flex-direction:column; gap:8px;">
                            ${g.pairs.map(pId => {
                               const p = activeTour.pairs.find(x => x.id === pId);
                               return `<div style="display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); border: 1px solid var(--card-border); padding:6px 8px; border-radius:4px; font-size:13px;">
                                  <span style="font-weight:600;">${escapeHtml(p?.name)}</span>
                                  <select class="bc-select change-group-sel" data-pid="${pId}" data-cat="${cat}" style="padding:2px 4px; font-size:12px;">
                                     ${catGroups.map(cg => `<option value="${cg.id}" ${cg.id===g.id?'selected':''}>${cg.name}</option>`).join('')}
                                  </select>
                               </div>`;
                            }).join('')}
                            ${g.pairs.length === 0 ? '<div style="color:var(--text-secondary); font-size:12px; font-style:italic;">Bảng trống</div>' : ''}
                         </div>
                      </div>`;
                   }).join('')}
                </div>
             </div>`);
             groupingContainer.appendChild(catCard);
          });

          if (canManage()) {
             groupingContainer.appendChild(el(`<div style="text-align:center; margin-top:20px; padding-top:20px; border-top:1px dashed var(--card-border); display:flex; flex-direction:column; gap:10px; align-items:center;">
                <button class="bc-btn" id="tour-start-playing-btn" style="background:#7B1FA2; border-color:var(--text-primary); font-size:16px; padding:12px 25px; box-shadow:0 4px 10px rgba(123,31,162,0.3);">⚡ PHÁT SINH LỊCH THI ĐẤU VÀ BẮT ĐẦU!</button>
                <button class="bc-btn danger" id="tour-rollback-btn" style="background:transparent; color:#F26419; border:none; font-size:13px; text-decoration:underline;">↩️ Quay xe: Hủy gắp thăm, trở về bước Ghi danh</button>
             </div>`));

             setTimeout(() => {
                document.querySelectorAll('.change-group-sel').forEach(sel => {
                   sel.onchange = async (e) => {
                      const pId = e.target.dataset.pid;
                      const targetGId = e.target.value;
                      await mutateTournaments(tours => {
                         const tour = tours.find(t => t.id === activeTour.id);
                         if (tour) {
                            // Xóa khỏi bảng cũ
                            tour.groups.forEach(g => {
                               g.pairs = g.pairs.filter(x => x !== pId);
                            });
                            // Thêm vào bảng mới
                            const newGroup = tour.groups.find(g => g.id === targetGId);
                            if (newGroup) newGroup.pairs.push(pId);
                         }
                         return tours;
                      });
                      render();
                   };
                });

                const rollbackBtn = document.getElementById('tour-rollback-btn');
                if (rollbackBtn) rollbackBtn.onclick = async () => {
                   if (!confirm('Bạn có chắc muốn hủy kết quả chia bảng hiện tại và quay lại màn hình Ghi danh (thêm/sửa VĐV)?')) return;
                   await mutateTournaments(tours => {
                      const t = tours.find(x => x.id === activeTour.id);
                      if (t) {
                         t.status = 'registering';
                         t.groups = [];
                         t.matches = [];
                         t.bracket = null;
                      }
                      return tours;
                   });
                   state.tourActiveTab = 'reg';
                   showToast('Đã quay lại bước Ghi danh!', 'success');
                   render();
                };
                
                document.getElementById('tour-start-playing-btn').onclick = async () => {
                   if (!confirm('Xác nhận chốt bảng và sinh lịch thi đấu? Không thể quay lại bước này.')) return;
                   
                   const matches = [];
                   activeTour.groups.forEach(g => {
                      const gPairs = g.pairs;
                      for (let a = 0; a < gPairs.length; a++) {
                         for (let b = a + 1; b < gPairs.length; b++) {
                            matches.push({
                               id: 'M' + Date.now() + a + b + g.id.slice(-5),
                               groupId: g.id,
                               cat: g.cat,
                               p1: gPairs[a],
                               p2: gPairs[b],
                               score1: null,
                               score2: null,
                               status: 'pending',
                               courtId: null,
                               startTime: null,
                               endTime: null
                            });
                         }
                      }
                   });

                   await mutateTournaments(tours => {
                      const t = tours.find(x => x.id === activeTour.id);
                      if (t) {
                         t.matches = matches;
                         t.status = 'playing';
                      }
                      return tours;
                   });
                   state.tourActiveTab = 'group';
                   showToast('Đã phát sinh lịch thi đấu thành công!', 'success');
                   render();
                };
             }, 0);
          }

          wrap.appendChild(groupingContainer);
       }

       // ======================== TAB 3: GROUP STAGE ========================
       if (isGroupTab) {
          const groupsContainer = el(`<div style="display:flex; flex-direction:column; gap:20px;"></div>`);
          
          const courtOptions = Array.from({length: activeTour.courtsCount || 4}, (_, i) => {
             return `<option value="Sân ${i+1}">Sân ${i+1}</option>`;
          }).join('');

          (activeTour.groups || []).forEach(g => {
             const gMatches = (activeTour.matches || []).filter(m => m.groupId === g.id);
             
             const standings = (g.pairs || []).map(pId => {
                const pair = activeTour.pairs.find(p => p.id === pId);
                let played = 0, won = 0, lost = 0, diff = 0;
                gMatches.forEach(m => {
                   if (m.status === 'finished' && (m.p1 === pId || m.p2 === pId)) {
                      played++;
                      const isP1 = m.p1 === pId;
                      const myScore = isP1 ? m.score1 : m.score2;
                      const oppScore = isP1 ? m.score2 : m.score1;
                      if (myScore > oppScore) won++; else if (myScore < oppScore) lost++;
                      diff += (myScore - oppScore);
                   }
                });
                return { pId, name: pair?.name, played, won, lost, diff, points: won * 3 };
             }).sort((a, b) => b.points - a.points || b.diff - a.diff);

             const groupCard = el(`<div class="bc-card" style="border-left: 4px solid #FF8F00;">
               <h4 style="color:#F26419; font-size:16px; margin-bottom:10px;">🏆 ${escapeHtml(g.name)} (${g.cat})</h4>
               <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:flex-start;">
                 
                 <div style="flex:1; min-width:300px;">
                   <table class="bc-table" style="font-size:12px; width:100%; border-collapse:collapse;">
                     <thead><tr style="background:var(--card-bg); text-align:left;">
                       <th style="padding:8px;">VT</th><th style="padding:8px;">Đội</th><th style="padding:8px;">Trận</th><th style="padding:8px;">T/B</th><th style="padding:8px;">HS</th><th style="padding:8px;">Điểm</th>
                     </tr></thead>
                     <tbody>
                       ${standings.map((s, i) => `<tr style="border-bottom:1px solid #EEE;">
                         <td style="padding:8px; font-weight:bold; color:${i<2?'#2E7D32':'#666'}">${i+1}</td>
                         <td style="padding:8px; font-weight:600;">${escapeHtml(s.name)}</td>
                         <td style="padding:8px;">${s.played}</td>
                         <td style="padding:8px;">${s.won}/${s.lost}</td>
                         <td style="padding:8px;">${s.diff > 0 ? '+'+s.diff : s.diff}</td>
                         <td style="padding:8px; font-weight:bold;">${s.points}</td>
                       </tr>`).join('')}
                     </tbody>
                   </table>
                 </div>

                 <div style="flex:1.5; min-width:320px; display:flex; flex-direction:column; gap:12px;">
                   ${gMatches.map(m => {
                     const p1 = activeTour.pairs.find(x => x.id === m.p1);
                     const p2 = activeTour.pairs.find(x => x.id === m.p2);
                     let durationText = '';
                     if (m.startTime && m.endTime) {
                        const mins = Math.round((m.endTime - m.startTime) / 60000);
                        durationText = `<span style="font-size:10px; color:var(--text-secondary);">⏱️ ${mins} phút</span>`;
                     } else if (m.startTime && m.status === 'live') {
                        const mins = Math.floor((Date.now() - m.startTime) / 60000);
                        durationText = `<span style="font-size:10px; color:#F26419; animation: pulse 1s infinite;">⏱️ Đang đánh (${mins}p)</span>`;
                     }

                     const isP1Win = m.status === 'finished' && m.score1 > m.score2;
                     const isP2Win = m.status === 'finished' && m.score2 > m.score1;

                     return `<div style="border:1px solid ${m.status==='live'?'#D32F2F':'var(--card-border)'}; border-radius:8px; padding:10px; background:${m.status==='finished'?'var(--tab-bg)':(m.status==='live'?'rgba(211, 47, 47, 0.1)':'var(--card-bg)')}; position:relative;">
                       <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px dashed #CCC; padding-bottom:4px;">
                          ${canManage() ? `
                            <input type="text" class="small-turn-inp" data-mid="${m.id}" value="${escapeHtml(m.turn||'')}" placeholder="Lượt (VD: 1)" style="width:70px; font-size:11px; padding:2px; border:1px solid var(--card-border); border-radius:4px; text-align:center; background:var(--card-bg)9C4; margin-right:4px;" />
                            <select class="bc-select small-court-sel" data-mid="${m.id}" style="font-size:11px; padding:2px; background:var(--card-bg)9C4; border:1px solid var(--card-border);">
                              <option value="">-- Chọn Sân --</option>
                              ${courtOptions.replace(`value="${m.courtId}"`, `value="${m.courtId}" selected`)}
                            </select>
                          ` : `<span style="font-size:11px; font-weight:bold; color:#F26419; background:var(--card-bg)DE7; padding:2px 6px; border-radius:4px;">${m.turn ? `Lượt ${escapeHtml(m.turn)} - ` : ''}${m.courtId ? escapeHtml(m.courtId) : 'Chưa xếp sân'}</span>`}
                          ${durationText}
                       </div>
                       
                       <div style="display:flex; justify-content:space-between; align-items:center;">
                         <div style="flex:1; font-size:13px; font-weight:${isP1Win ? 'bold':'600'}; color:${isP1Win?'#4CAF50':'var(--text-primary)'}">
                            ${isP1Win ? '🏆 ' : ''}${escapeHtml(p1?.name)}
                         </div>
                         <div style="padding:0 10px; white-space:nowrap;">
                            ${canManage() ? 
                              `<input type="number" id="s1-${m.id}" value="${m.score1!==null?m.score1:''}" style="width:40px; text-align:center; border: 1px solid var(--card-border); border-radius:4px; padding:4px;" /> - 
                               <input type="number" id="s2-${m.id}" value="${m.score2!==null?m.score2:''}" style="width:40px; text-align:center; border: 1px solid var(--card-border); border-radius:4px; padding:4px;" />` 
                              : `<span style="font-size:16px; font-weight:bold; color:var(--text-primary);">${m.score1!==null?m.score1:'-'} : ${m.score2!==null?m.score2:'-'}</span>`
                            }
                         </div>
                         <div style="flex:1; font-size:13px; text-align:right; font-weight:${isP2Win ? 'bold':'600'}; color:${isP2Win?'#4CAF50':'var(--text-primary)'}">
                            ${escapeHtml(p2?.name)}${isP2Win ? ' 🏆' : ''}
                         </div>
                       </div>
                       ${canManage() ? `
                         <div style="text-align:center; margin-top:8px; display:flex; gap:6px; justify-content:center;">
                           ${m.status === 'pending' ? `<button class="bc-btn small" id="start-match-${m.id}" style="background:#4CAF50; border-color:#4CAF50; color:#FFF; font-size:11px; padding:4px 10px;">▶️ Bắt Đầu</button>` : ''}
                           <button class="bc-btn small" id="update-match-${m.id}" style="background:#0288D1; border-color:var(--text-primary); color:#FFF; font-size:11px; padding:4px 10px;">Lưu Tỷ số</button>
                         </div>
                       ` : ''}
                     </div>`;
                   }).join('')}
                 </div>

               </div>
             </div>`);
             groupsContainer.appendChild(groupCard);

             setTimeout(() => {
                gMatches.forEach(m => {
                   const startBtn = document.getElementById(`start-match-${m.id}`);
                   if (startBtn) {
                      startBtn.onclick = async () => {
                         await mutateTournaments(tours => {
                            const match = tours.find(t=>t.id===activeTour.id).matches.find(x=>x.id===m.id);
                            match.status = 'live';
                            match.startTime = Date.now();
                            return tours;
                         });
                         render();
                      };
                   }

                   const btn = document.getElementById(`update-match-${m.id}`);
                   if (btn) {
                      btn.onclick = async () => {
                         const s1Str = document.getElementById(`s1-${m.id}`).value;
                         const s2Str = document.getElementById(`s2-${m.id}`).value;
                         let s1 = s1Str === '' ? null : parseInt(s1Str, 10);
                         let s2 = s2Str === '' ? null : parseInt(s2Str, 10);
                         
                         let status = m.status;
                         let eTime = m.endTime;
                         let sTime = m.startTime;
                         
                         if (s1 !== null && s2 !== null) {
                            status = 'finished';
                            if (!eTime) eTime = Date.now();
                            if (!sTime) sTime = Date.now() - 15*60000; // fake 15 mins if not started
                         }
                         else if (s1 !== null || s2 !== null) status = 'live';
                         else status = 'pending';

                         await mutateTournaments(tours => {
                            const match = tours.find(t=>t.id===activeTour.id).matches.find(x=>x.id===m.id);
                            match.score1 = s1;
                            match.score2 = s2;
                            match.status = status;
                            match.startTime = sTime;
                            match.endTime = eTime;
                            return tours;
                         });
                         render();
                      };
                   }
                });

                document.querySelectorAll('.small-turn-inp').forEach(inp => {
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
                document.querySelectorAll('.small-court-sel').forEach(sel => {
                   sel.onchange = async (e) => {
                      const mId = e.target.dataset.mid;
                      const cId = e.target.value;
                      await mutateTournaments(tours => {
                         const match = tours.find(t=>t.id===activeTour.id).matches.find(x=>x.id===mId);
                         if (match) match.courtId = cId;
                         return tours;
                      });
                   };
                });
             }, 0);
          });
          wrap.appendChild(groupsContainer);

          if (canManage() && (activeTour.status === 'playing' || activeTour.status === 'knockout')) {
             wrap.appendChild(el(`<div style="text-align:center; margin-top:30px; padding-top:20px; border-top:2px dashed var(--card-border);">
                <button class="bc-btn danger" id="tour-to-knockout-btn" style="padding:12px 25px; font-size:16px; background:#D32F2F; border-color:#F26419; box-shadow:0 4px 10px rgba(211,47,47,0.3);">${activeTour.status === 'knockout' ? '🔄 TÁI TÍNH TOÁN & TẠO LẠI NHÁNH ĐẤU' : '🏆 CHỐT VÒNG BẢNG & TẠO NHÁNH ĐẤU KNOCKOUT'}</button>
             </div>`));

             setTimeout(() => {
                const btn = document.getElementById('tour-to-knockout-btn');
                if (btn) btn.onclick = async () => {
                   if (!confirm('Chốt vòng bảng? Hệ thống sẽ tự động tạo sơ đồ thi đấu loại trực tiếp dựa trên số lượng đội đi tiếp.')) return;
                   
                   const bracket = {}; 
                   for (const cat of activeTour.categories) {
                      const catGroups = activeTour.groups.filter(g => g.cat === cat);
                      if (catGroups.length === 0) continue;
                      
                      let advancingPairs = [];
                      catGroups.forEach(g => {
                         const gMatches = activeTour.matches.filter(m => m.groupId === g.id);
                         const standings = g.pairs.map(pId => {
                            let won = 0, diff = 0;
                            gMatches.forEach(m => {
                               if (m.status === 'finished' && (m.p1 === pId || m.p2 === pId)) {
                                  const isP1 = m.p1 === pId;
                                  const myScore = isP1 ? m.score1 : m.score2;
                                  const oppScore = isP1 ? m.score2 : m.score1;
                                  if (myScore > oppScore) won++;
                                  diff += (myScore - oppScore);
                               }
                            });
                            return { pId, points: won * 3, diff };
                         }).sort((a, b) => b.points - a.points || b.diff - a.diff);
                         
                         // Lấy 2 đội đứng đầu mỗi bảng
                         advancingPairs.push(...standings.slice(0, 2).map((s, idx) => ({ pId: s.pId, groupRank: idx + 1, gId: g.id })));
                      });
                      
                      // DYNAMIC BRACKET GENERATOR
                      // Sắp xếp theo hạng (Nhất bảng, rồi tới Nhì bảng)
                      advancingPairs.sort((a, b) => a.groupRank - b.groupRank);
                      const teams = advancingPairs.map(x => x.pId);
                      
                      // Xác định số slot (power of 2)
                      let size = 2;
                      if (teams.length > 2 && teams.length <= 4) size = 4;
                      if (teams.length > 4) size = 8;
                      
                      // Bổ sung null (Bye) cho đủ slot
                      while (teams.length < size) {
                         teams.push(null);
                      }

                      // Seed mapping (cơ bản để đội mạnh không gặp nhau sớm)
                      const seedMap = {
                         2: [0, 1],
                         4: [0, 3, 1, 2],
                         8: [0, 7, 3, 4, 1, 6, 2, 5]
                      };
                      const layout = seedMap[size];
                      const bracketMatches = [];
                      
                      // Tạo các trận đấu vòng đầu tiên (Quarter-finals hoặc Semi-finals)
                      let firstRoundName = size === 8 ? 'Tứ kết' : (size === 4 ? 'Bán kết' : 'Chung kết');
                      let nextRoundName = size === 8 ? 'Bán kết' : 'Chung kết';
                      
                      let prevRoundMatches = [];
                      const rSuffix = cat.replace(/\s/g,'');
                      
                      for (let i = 0; i < size/2; i++) {
                         const p1 = teams[layout[i*2]];
                         const p2 = teams[layout[i*2 + 1]];
                         const mId = 'M_' + firstRoundName.replace(/\s/g,'') + '_' + i + '_' + rSuffix;
                         let status = 'pending';
                         let s1 = null, s2 = null;
                         if (!p2 && p1) { status = 'finished'; s1 = 21; s2 = 0; } // Bye win
                         if (!p1 && p2) { status = 'finished'; s1 = 0; s2 = 21; } // Bye win
                         
                         const matchObj = {
                            id: mId, round: firstRoundName, name: `${firstRoundName} ${i+1}`,
                            p1, p2, score1: s1, score2: s2, status, winnerTo: null,
                            courtId: null, startTime: null, endTime: null
                         };
                         bracketMatches.push(matchObj);
                         prevRoundMatches.push(matchObj);
                      }

                      // Tạo các vòng tiếp theo cho đến Chung kết
                      while (prevRoundMatches.length > 1) {
                         const curRoundMatches = [];
                         const isFinal = prevRoundMatches.length === 2;
                         const cRoundName = isFinal ? 'Chung kết' : nextRoundName;
                         
                         for (let i = 0; i < prevRoundMatches.length / 2; i++) {
                            const pMatch1 = prevRoundMatches[i*2];
                            const pMatch2 = prevRoundMatches[i*2 + 1];
                            const mId = 'M_' + cRoundName.replace(/\s/g,'') + '_' + i + '_' + rSuffix;
                            
                            // Auto forward if prev match was a Bye win
                            let p1 = null, p2 = null;
                            if (pMatch1.status === 'finished') p1 = pMatch1.score1 > pMatch1.score2 ? pMatch1.p1 : pMatch1.p2;
                            if (pMatch2.status === 'finished') p2 = pMatch2.score1 > pMatch2.score2 ? pMatch2.p1 : pMatch2.p2;
                            
                            const matchObj = {
                               id: mId, round: cRoundName, name: isFinal ? 'Chung kết' : `${cRoundName} ${i+1}`,
                               p1, p2, score1: null, score2: null, status: 'pending', winnerTo: null,
                               courtId: null, startTime: null, endTime: null
                            };
                            bracketMatches.push(matchObj);
                            curRoundMatches.push(matchObj);
                            
                            pMatch1.winnerTo = mId;
                            pMatch2.winnerTo = mId;
                         }
                         prevRoundMatches = curRoundMatches;
                         nextRoundName = 'Chung kết';
                      }

                      bracket[cat] = bracketMatches;
                   }

                   await mutateTournaments(tours => {
                      const t = tours.find(x => x.id === activeTour.id);
                      if (t) {
                         t.bracket = bracket;
                         t.status = 'knockout';
                      }
                      return tours;
                   });
                   state.tourActiveTab = 'knockout';
                   showToast('Tạo nhánh đấu thành công!', 'success');
                   render();
                };
             }, 0);
          }
       }

       // ======================== TAB 4: KNOCKOUT ========================
       if (isKnockoutTab) {
          const bracketContainer = el(`<div style="display:flex; flex-direction:column; gap:30px;"></div>`);
          
          const courtOptions = Array.from({length: activeTour.courtsCount || 4}, (_, i) => {
             return `<option value="Sân ${i+1}">Sân ${i+1}</option>`;
          }).join('');

          Object.keys(activeTour.bracket || {}).forEach(cat => {
             const matches = activeTour.bracket[cat];
             // Group by round
             const rounds = [...new Set(matches.map(m => m.round))];
             // Giả sử có Tứ kết -> Bán kết -> Chung kết
             const order = ['Tứ kết', 'Bán kết', 'Chung kết'];
             rounds.sort((a,b) => order.indexOf(a) - order.indexOf(b));

             const catCard = el(`<div class="bc-card" style="border: 2px solid #3F51B5; border-radius:12px; overflow:hidden; padding:0;">
                <div style="background:#3F51B5; color:#FFF; padding:10px 15px; font-weight:bold; font-size:16px;">🏸 Hạng mục: ${cat}</div>
                <div style="padding:20px; display:flex; justify-content:space-around; align-items:flex-start; flex-wrap:wrap; gap:30px; background:var(--card-bg); overflow-x:auto;">
                   
                   ${rounds.map(roundName => {
                      const rMatches = matches.filter(m => m.round === roundName);
                      const isFinal = roundName === 'Chung kết';
                      return `<div style="display:flex; flex-direction:column; gap:40px; flex:1; min-width:280px; position:relative;">
                        ${rMatches.map(m => {
                           const p1 = activeTour.pairs.find(x => x.id === m.p1);
                           const p2 = activeTour.pairs.find(x => x.id === m.p2);
                           
                           const isP1Win = m.status === 'finished' && m.score1 > m.score2;
                           const isP2Win = m.status === 'finished' && m.score2 > m.score1;
                           
                           let durationText = '';
                           if (m.startTime && m.endTime) {
                              const mins = Math.round((m.endTime - m.startTime) / 60000);
                              durationText = `<span style="font-size:10px; color:var(--text-secondary);">⏱️ ${mins} phút</span>`;
                           } else if (m.startTime && m.status === 'live') {
                              const mins = Math.floor((Date.now() - m.startTime) / 60000);
                              durationText = `<span style="font-size:10px; color:#F26419; animation: pulse 1s infinite;">⏱️ Đang đánh (${mins}p)</span>`;
                           }

                           let nextMatchInfo = '';
                           if (m.winnerTo) {
                              const nm = matches.find(x => x.id === m.winnerTo);
                              if (nm) nextMatchInfo = `<div style="font-size:11px; color:var(--text-primary); margin-top:5px; text-align:center; font-style:italic;">👉 Thắng vào: ${nm.name}</div>`;
                           }

                           return `<div style="border:${isFinal?'2px solid #FFD700':'1px solid #CCC'}; border-radius:10px; padding:15px; background:${isFinal?'#FFFDE7':(m.status==='finished'?'#F5F5F5':(m.status==='live'?'#E8EAF6':'#FFF'))}; box-shadow:${isFinal?'0 6px 15px rgba(255,215,0,0.3)':'0 2px 5px rgba(0,0,0,0.1)'}; position:relative; transform: ${isFinal?'scale(1.05)':'scale(1)'};">
                             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px dashed ${isFinal?'var(--card-border)':'#EEE'}; padding-bottom:6px;">
                                <div style="font-size:13px; color:${isFinal?'#F57F17':'#666'}; text-transform:uppercase; font-weight:bold;">${isFinal?'🏆 ':''}${m.name}</div>
                                ${canManage() ? `
                                  <input type="text" class="k-turn-inp" data-mid="${m.id}" data-cat="${cat}" value="${escapeHtml(m.turn||'')}" placeholder="Lượt" style="width:40px; font-size:10px; padding:2px; border:1px solid var(--card-border); border-radius:4px; text-align:center; background:var(--tab-bg); margin-right:4px;" />
                                  <select class="bc-select k-court-sel" data-mid="${m.id}" data-cat="${cat}" style="font-size:10px; padding:2px; background:var(--input-bg); border:1px solid var(--input-border); color:var(--input-color); width:90px;">
                                    <option value="">-- Chọn Sân --</option>
                                    ${courtOptions.replace(`value="${m.courtId}"`, `value="${m.courtId}" selected`)}
                                  </select>
                                ` : `<span style="font-size:10px; font-weight:bold; color:var(--text-primary); background:var(--tab-bg); padding:2px 6px; border-radius:4px;">${m.turn ? `Lượt ${escapeHtml(m.turn)} - ` : ''}${m.courtId ? escapeHtml(m.courtId) : 'Chưa xếp sân'}</span>`}
                                ${durationText}
                             </div>
                             
                             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                <span style="font-size:14px; font-weight:${isP1Win?'bold':'600'}; color:${isP1Win?'#4CAF50':'var(--text-primary)'}">${isP1Win?'🏆 ':''}${p1 ? escapeHtml(p1.name) : '<span style="color:var(--text-secondary);font-style:italic;">Đang chờ nhánh dưới...</span>'}</span>
                                ${canManage() && p1 && p2 ? `<input type="number" id="k-s1-${m.id}" value="${m.score1!==null?m.score1:''}" style="width:45px;text-align:center;border:1px solid ${isFinal?'var(--card-border)':'#999'};border-radius:4px;padding:4px; font-weight:bold;"/>` : `<strong style="font-size:18px; color:${isFinal?'#D84315':'#000'};">${m.score1!==null?m.score1:'-'}</strong>`}
                             </div>
                             <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:14px; font-weight:${isP2Win?'bold':'600'}; color:${isP2Win?'#4CAF50':'var(--text-primary)'}">${p2 ? escapeHtml(p2.name) : '<span style="color:var(--text-secondary);font-style:italic;">Đang chờ nhánh dưới...</span>'}${isP2Win?' 🏆':''}</span>
                                ${canManage() && p1 && p2 ? `<input type="number" id="k-s2-${m.id}" value="${m.score2!==null?m.score2:''}" style="width:45px;text-align:center;border:1px solid ${isFinal?'var(--card-border)':'#999'};border-radius:4px;padding:4px; font-weight:bold;"/>` : `<strong style="font-size:18px; color:${isFinal?'#D84315':'#000'};">${m.score2!==null?m.score2:'-'}</strong>`}
                             </div>
                             
                             ${canManage() && p1 && p2 ? `
                             <div style="text-align:center; margin-top:12px; display:flex; gap:6px; justify-content:center;">
                               ${m.status === 'pending' ? `<button class="bc-btn small" id="k-start-${m.id}" style="background:#4CAF50; border-color:#4CAF50; color:#FFF; font-size:11px; padding:4px 10px;">▶️ Bắt Đầu</button>` : ''}
                               <button class="bc-btn small" id="k-update-${m.id}" style="background:#3F51B5; border-color:var(--text-primary); color:#FFF; font-size:11px; padding:4px 10px;">Lưu Tỷ số</button>
                             </div>` : ''}

                             ${nextMatchInfo}
                           </div>`;
                        }).join('')}
                      </div>`;
                   }).join(`
                      <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; margin:0 -10px; color:#CCC;">
                         <div style="width:30px; height:2px; background:#CCC;"></div>
                      </div>
                   `)}

                </div>
             </div>`);
             bracketContainer.appendChild(catCard);

             setTimeout(() => {
                matches.forEach(m => {
                   const startBtn = document.getElementById(`k-start-${m.id}`);
                   if (startBtn) {
                      startBtn.onclick = async () => {
                         await mutateTournaments(tours => {
                            const match = tours.find(t=>t.id===activeTour.id).bracket[cat].find(x=>x.id===m.id);
                            match.status = 'live';
                            match.startTime = Date.now();
                            return tours;
                         });
                         render();
                      };
                   }

                   const btn = document.getElementById(`k-update-${m.id}`);
                   if (btn) {
                      btn.onclick = async () => {
                         const s1Str = document.getElementById(`k-s1-${m.id}`).value;
                         const s2Str = document.getElementById(`k-s2-${m.id}`).value;
                         let s1 = s1Str === '' ? null : parseInt(s1Str, 10);
                         let s2 = s2Str === '' ? null : parseInt(s2Str, 10);
                         
                         let status = m.status;
                         let eTime = m.endTime;
                         let sTime = m.startTime;
                         
                         if (s1 !== null && s2 !== null) {
                            status = 'finished';
                            if (!eTime) eTime = Date.now();
                            if (!sTime) sTime = Date.now() - 20*60000;
                         }
                         else if (s1 !== null || s2 !== null) status = 'live';
                         else status = 'pending';

                         await mutateTournaments(tours => {
                            const t = tours.find(x => x.id === activeTour.id);
                            if (t) {
                               const tCatMatches = t.bracket[cat];
                               const tMatch = tCatMatches.find(x => x.id === m.id);
                               tMatch.score1 = s1;
                               tMatch.score2 = s2;
                               tMatch.status = status;
                               tMatch.startTime = sTime;
                               tMatch.endTime = eTime;
                               
                               if (tMatch.winnerTo) {
                                  const nextMatch = tCatMatches.find(x => x.id === tMatch.winnerTo);
                                  if (nextMatch) {
                                     if (s1 !== null && s2 !== null && s1 !== s2) {
                                        const winnerId = s1 > s2 ? tMatch.p1 : tMatch.p2;
                                        if (nextMatch.p1 === tMatch.p1 || nextMatch.p1 === tMatch.p2) nextMatch.p1 = winnerId;
                                        else if (nextMatch.p2 === tMatch.p1 || nextMatch.p2 === tMatch.p2) nextMatch.p2 = winnerId;
                                        else if (!nextMatch.p1) nextMatch.p1 = winnerId;
                                        else if (!nextMatch.p2) nextMatch.p2 = winnerId;
                                     }
                                  }
                               }
                            }
                            return tours;
                         });
                         render();
                      };
                   }
                });

                document.querySelectorAll('.k-turn-inp').forEach(inp => {
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
                document.querySelectorAll('.k-court-sel').forEach(sel => {
                   sel.onchange = async (e) => {
                      const mId = e.target.dataset.mid;
                      const cId = e.target.value;
                      const cCat = e.target.dataset.cat;
                      await mutateTournaments(tours => {
                         const match = tours.find(t=>t.id===activeTour.id).bracket[cCat].find(x=>x.id===mId);
                         if (match) match.courtId = cId;
                         return tours;
                      });
                   };
                });
             }, 0);
          });
          wrap.appendChild(bracketContainer);

          if (canManage() && activeTour.status !== 'finished') {
             wrap.appendChild(el(`<div style="text-align:center; margin-top:30px; padding-top:20px; border-top:2px dashed #3F51B5;">
                <button class="bc-btn" id="tour-finish-btn" style="background:#FFD700; border:2px solid #F57F17; color:#F26419; font-size:18px; padding:15px 30px; font-weight:bold; box-shadow:0 4px 10px rgba(0,0,0,0.2);">🎉 BẾ MẠC & TRAO THƯỞNG XP</button>
             </div>`));

             setTimeout(() => {
                const fbtn = document.getElementById('tour-finish-btn');
                if(fbtn) fbtn.onclick = async () => {
                   let allDone = true;
                   Object.keys(activeTour.bracket || {}).forEach(cat => {
                      const m = activeTour.bracket[cat].find(x => x.round === 'Chung kết');
                      if (!m || m.status !== 'finished') allDone = false;
                   });
                   if (!allDone) {
                      if(!confirm('Cảnh báo: Có hạng mục chưa đấu xong Chung kết. Bạn vẫn muốn Bế mạc sớm?')) return;
                   } else {
                      if(!confirm('Xác nhận bế mạc giải đấu? Hệ thống sẽ cộng XP thưởng cho các VĐV chiến thắng!')) return;
                   }
                   
                   const updates = {}; 
                   Object.keys(activeTour.bracket || {}).forEach(cat => {
                      const matches = activeTour.bracket[cat];
                      const finalMatch = matches.find(m => m.round === 'Chung kết');
                      if (finalMatch && finalMatch.status === 'finished') {
                         const winnerPairId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p1 : finalMatch.p2;
                         const runnerUpPairId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p2 : finalMatch.p1;
                         const wPair = activeTour.pairs.find(p => p.id === winnerPairId);
                         const rPair = activeTour.pairs.find(p => p.id === runnerUpPairId);
                         if (wPair) {
                            updates[wPair.m1] = (updates[wPair.m1] || 0) + 500;
                            if (wPair.m2) updates[wPair.m2] = (updates[wPair.m2] || 0) + 500;
                         }
                         if (rPair) {
                            updates[rPair.m1] = (updates[rPair.m1] || 0) + 300;
                            if (rPair.m2) updates[rPair.m2] = (updates[rPair.m2] || 0) + 300;
                         }
                      }
                   });

                   await mutateTournaments(tours => {
                      const t = tours.find(x => x.id === activeTour.id);
                      if (t) t.status = 'finished';
                      return tours;
                   });

                   for (const mId in updates) {
                      const bonus = updates[mId];
                      await mutateKey('bc_members', mems => {
                         const idx = mems.findIndex(m => m.id === mId);
                         if (idx > -1) {
                            mems[idx].xp = (mems[idx].xp || 0) + bonus;
                            mems[idx].xpHistory = mems[idx].xpHistory || [];
                            mems[idx].xpHistory.push({
                               date: new Date().toISOString(),
                               amount: bonus,
                               reason: 'Thưởng Thành tích Giải đấu: ' + activeTour.name,
                               by: state.me.username
                            });
                         }
                         return mems;
                      });
                   }
                   
                   await mutateKey('bc_announcements', anns => {
                      let champs = [];
                      Object.keys(activeTour.bracket || {}).forEach(cat => {
                         const matches = activeTour.bracket[cat];
                         const finalMatch = matches.find(m => m.round === 'Chung kết');
                         if (finalMatch && finalMatch.status === 'finished') {
                            const winnerPairId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p1 : finalMatch.p2;
                            const wPair = activeTour.pairs.find(p => p.id === winnerPairId);
                            if (wPair) champs.push(`${cat}: ${wPair.name}`);
                         }
                      });
                      anns.unshift({
                         id: uid(),
                         category: 'tournament',
                         title: `🏆 TÂN VƯƠNG XUẤT HIỆN: Giải ${activeTour.name}`,
                         content: `Giải đấu **${activeTour.name}** đã chính thức khép lại!\nXin chúc mừng các nhà vô địch:\n**${champs.join('\n')}** 🎉\n\nPhần thưởng XP đã được phân phát. Mọi người có thể xem lại kết quả tại Lịch sử Giải đấu.`,
                         pinned: true,
                         createdAt: Date.now()
                      });
                      return anns;
                   });
                   showToast('Đã bế mạc và cộng thưởng XP thành công!', 'success');
                   render();
                };
             }, 0);
          }
       }
    }

    // TOURNAMENT HISTORY
    if (finishedTours.length > 0) {
      wrap.appendChild(el(`<div class="bc-card" style="margin-top:2rem; background:var(--tab-bg); border:2px solid var(--card-border); padding:20px;">
        <h3 style="font-size:18px; color:var(--text-primary); margin-bottom:15px; font-family:'Oswald',sans-serif; text-transform:uppercase;">📚 Lịch sử Giải đấu (Hall of Fame)</h3>
        <div style="display:flex; flex-direction:column; gap:15px;">
           ${finishedTours.map(t => {
              const isViewing = state.viewingTourId === t.id;
              
              let podiumHtml = '';
              if (isViewing) {
                 let catPodiums = [];
                 Object.keys(t.bracket || {}).forEach(cat => {
                    const matches = t.bracket[cat];
                    const finalMatch = matches.find(m => m.round === 'Chung kết');
                    if (!finalMatch || finalMatch.status !== 'finished') return;

                    const winnerId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p1 : finalMatch.p2;
                    const runnerId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p2 : finalMatch.p1;
                    const wPair = t.pairs.find(p => p.id === winnerId);
                    const rPair = t.pairs.find(p => p.id === runnerId);

                    catPodiums.push(`<div style="margin-bottom:15px; text-align:center;">
                       <strong style="color:#F26419; font-size:14px;">${cat}</strong>
                       <div style="font-size:13px; margin-top:5px;">🥇 Vô địch: <strong>${escapeHtml(wPair?.name||'')}</strong></div>
                       <div style="font-size:13px;">🥈 Á quân: <strong>${escapeHtml(rPair?.name||'')}</strong></div>
                    </div>`);
                 });
                 podiumHtml = `<div style="margin-top:15px; padding-top:15px; border-top:1px dashed var(--card-border);">
                    <h4 style="text-align:center; margin-bottom:10px; color:var(--text-primary);">🎉 BẢNG VÀNG THÀNH TÍCH</h4>
                    ${catPodiums.join('')}
                 </div>`;
              }

              return `<div style="background:var(--card-bg); border:1px solid var(--card-border); border-radius:8px; padding:15px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                 <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                       <strong style="font-size:15px; color:var(--text-primary);">${escapeHtml(t.name)}</strong>
                       <div style="font-size:11px; color:var(--text-secondary);">Bế mạc: ${new Date(t.createdAt).toLocaleDateString()} | ${t.pairs?.length||0} cặp VĐV</div>
                    </div>
                    <div style="display:flex; gap:10px;">
                       <button class="bc-btn small" id="view-tour-${t.id}" style="background:#1976D2; border-color:var(--text-primary);">${isViewing ? 'Đóng' : 'Xem kết quả'}</button>
                       ${isOwner() ? `<button class="bc-btn small danger" id="del-tour-${t.id}">Xóa</button>` : ''}
                    </div>
                 </div>
                 ${podiumHtml}
              </div>`;
           }).join('')}
        </div>
      </div>`));

      setTimeout(() => {
         finishedTours.forEach(t => {
            const vbtn = document.getElementById(`view-tour-${t.id}`);
            if (vbtn) vbtn.onclick = () => {
               if (state.viewingTourId === t.id) state.viewingTourId = null;
               else state.viewingTourId = t.id;
               render();
            };
            const dbtn = document.getElementById(`del-tour-${t.id}`);
            if (dbtn) dbtn.onclick = async () => {
               if(!confirm(`Bạn là Owner và có quyền xóa giải đấu. Xác nhận xóa VĨNH VIỄN giải [${t.name}] khỏi Lịch sử?`)) return;
               await mutateTournaments(tours => tours.filter(x => x.id !== t.id));
               render();
            };
         });
      }, 0);
    }

    return wrap;
}


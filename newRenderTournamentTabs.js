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
          <h3 style="font-size:16px; color:#D84315; margin-bottom:15px; font-family:'Oswald', sans-serif;">🛠️ KHỞI TẠO GIẢI ĐẤU MỚI</h3>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
              <label style="font-size:13px; font-weight:600; color:#4E342E; display:block; margin-bottom:4px;">Tên giải đấu</label>
              <input class="bc-input" id="ts-name" value="${escapeHtml(state.tourSetup.name)}" placeholder="VD: Giải Cầu Lông Aron Smash 2026" />
            </div>
            <div style="display:flex; gap:16px; flex-wrap:wrap;">
              <div style="flex:1; min-width:140px;">
                <label style="font-size:13px; font-weight:600; color:#4E342E; display:block; margin-bottom:4px;">Số lượng sân</label>
                <select class="bc-select" id="ts-courts-count">
                  <option value="2" ${state.tourSetup.courtsCount===2?'selected':''}>2 Sân</option>
                  <option value="3" ${state.tourSetup.courtsCount===3?'selected':''}>3 Sân</option>
                  <option value="4" ${state.tourSetup.courtsCount===4?'selected':''}>4 Sân</option>
                </select>
              </div>
              <div style="flex:2; min-width:200px;">
                <label style="font-size:13px; font-weight:600; color:#4E342E; display:block; margin-bottom:4px;">Chọn sân thi đấu</label>
                <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:6px;">
                  ${state.courts.map(c => {
                    const checked = state.tourSetup.selectedCourts.includes(c.id) ? 'checked' : '';
                    return `<label style="display:inline-flex; align-items:center; gap:4px; font-size:12px;">
                      <input type="checkbox" class="ts-court-chk" value="${c.id}" ${checked} /> ${escapeHtml(c.name)}
                    </label>`;
                  }).join(' ')}
                </div>
              </div>
            </div>
            <div style="border-top:1px dashed #E3E0D6; padding-top:12px;">
              <label style="font-size:13px; font-weight:600; color:#4E342E; display:block; margin-bottom:4px;">Hạng mục thi đấu</label>
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
              <button class="bc-btn" id="ts-start-btn" style="background:#FF3D00; border-color:#FF3D00; font-size:14px; padding:10px 20px;">
                Mở Cổng Đăng Ký 🚀
              </button>
            </div>
          </div>
        </div>`);
        wrap.appendChild(setupCard);

        setTimeout(() => {
          document.getElementById('ts-start-btn').onclick = async () => {
            const name = document.getElementById('ts-name').value.trim();
            const count = parseInt(document.getElementById('ts-courts-count').value, 10);
            const selCourts = Array.from(document.querySelectorAll('.ts-court-chk:checked')).map(x => x.value);
            const selCats = Array.from(document.querySelectorAll('.ts-cat-chk:checked')).map(x => x.value);
            
            if (!name) return alert('Vui lòng nhập tên giải đấu!');
            if (selCourts.length === 0) return alert('Vui lòng chọn ít nhất 1 sân!');
            if (selCats.length === 0) return alert('Vui lòng chọn ít nhất 1 hạng mục thi đấu!');
            
            const newTour = {
              id: uid(),
              name,
              categories: selCats,
              courtsCount: count,
              selectedCourts: selCourts,
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
            state.tourSetup = null;
            render();
          };
        }, 0);
      }
    }

    // ACTIVE TOURNAMENT TABS
    if (activeTour) {
       // Set default tab based on status if not set
       if (!state.tourActiveTab) {
          if (activeTour.status === 'registering') state.tourActiveTab = 'reg';
          else if (activeTour.status === 'playing') state.tourActiveTab = 'group';
          else if (activeTour.status === 'knockout') state.tourActiveTab = 'knockout';
       }

       const isRegTab = state.tourActiveTab === 'reg';
       const isGroupTab = state.tourActiveTab === 'group';
       const isKnockoutTab = state.tourActiveTab === 'knockout';

       const tabsUI = el(`<div style="display:flex; border-bottom:2px solid #E0E0E0; margin-bottom:20px; position:sticky; top:0; background:#FAFAFA; z-index:10;">
         <div class="bc-tab ${isRegTab ? 'active' : ''}" style="flex:1; text-align:center; padding:12px; font-weight:bold; cursor:pointer; color:${isRegTab?'#E65100':'#666'}; border-bottom:${isRegTab?'3px solid #E65100':'none'};" id="tt-reg">📝 Ghi Danh</div>
         ${activeTour.status === 'playing' || activeTour.status === 'knockout' ? `<div class="bc-tab ${isGroupTab ? 'active' : ''}" style="flex:1; text-align:center; padding:12px; font-weight:bold; cursor:pointer; color:${isGroupTab?'#2E7D32':'#666'}; border-bottom:${isGroupTab?'3px solid #2E7D32':'none'};" id="tt-group">⚔️ Vòng Bảng</div>` : ''}
         ${activeTour.status === 'knockout' ? `<div class="bc-tab ${isKnockoutTab ? 'active' : ''}" style="flex:1; text-align:center; padding:12px; font-weight:bold; cursor:pointer; color:${isKnockoutTab?'#3F51B5':'#666'}; border-bottom:${isKnockoutTab?'3px solid #3F51B5':'none'};" id="tt-knockout">🏆 Nhánh Đấu (Knockout)</div>` : ''}
       </div>`);
       wrap.appendChild(tabsUI);

       setTimeout(() => {
          document.getElementById('tt-reg').onclick = () => { state.tourActiveTab = 'reg'; render(); };
          if(document.getElementById('tt-group')) document.getElementById('tt-group').onclick = () => { state.tourActiveTab = 'group'; render(); };
          if(document.getElementById('tt-knockout')) document.getElementById('tt-knockout').onclick = () => { state.tourActiveTab = 'knockout'; render(); };
       }, 0);

       // Active Tour Header
       wrap.appendChild(el(`<div class="bc-card" style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:#FFF3E0; border:1px solid #FFB74D; margin-bottom:1rem;">
          <div>
             <h3 style="font-size:20px; color:#E65100; font-family:'Oswald',sans-serif; margin-bottom:5px;">${escapeHtml(activeTour.name)}</h3>
             <div style="font-size:12px; color:#F57C00; font-weight:600;">Tình trạng: ${activeTour.status.toUpperCase()}</div>
          </div>
          ${canManage() || state.me?.role === 'owner' ? `<div>
             <button class="bc-btn danger small" id="delete-tour-btn">🗑️ Xóa</button>
          </div>` : ''}
       </div>`));

       setTimeout(() => {
          const delBtn = document.getElementById('delete-tour-btn');
          if (delBtn) delBtn.onclick = async () => {
             if(!confirm('Bạn có chắc chắn muốn xóa Giải đấu này? Toàn bộ đăng ký và kết quả sẽ biến mất vĩnh viễn!')) return;
             await mutateTournaments(tours => {
                return tours.filter(t => t.id !== activeTour.id);
             });
             state.tourActiveTab = null;
             showToast('Đã xóa giải đấu', 'success');
             render();
          };
       }, 0);

       // TAB 1: REGISTRATION
       if (isRegTab) {
          const activeMembers = state.members.filter(m => m.status === 'active');
          activeTour.registrations = activeTour.registrations || [];
          const myRegs = activeTour.registrations.filter(r => r.m1 === state.me?.id || r.m2 === state.me?.id);
          const isManager = canManage();

          if (activeTour.status === 'registering') {
              if (state.me) {
                if (myRegs.length > 0) {
                  wrap.appendChild(el(`<div class="bc-card" style="margin-bottom:1rem; text-align:center; padding:15px; color:#27500A; background:#EAF3DE; font-weight:600; font-size:14px; border:1px solid #27500A;">
                    🎉 Bạn đã ghi danh các hạng mục: ${myRegs.map(r => r.cat).join(', ')}. Chúc bạn thi đấu tốt! 💪
                  </div>`));
                }
                const regCard = el(`<div class="bc-card" style="margin-bottom:1rem; border:2px solid #27500A;">
                  <h4 style="font-size:16px; color:#27500A; margin-bottom:12px; font-family:'Oswald',sans-serif;">TẠO PHIẾU ĐĂNG KÝ THAM GIA</h4>
                  <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
                    ${isManager ? `
                    <div style="flex:1; min-width:140px;">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px; color:#E65100;">VĐV Ghi danh (Admin)</label>
                      <select class="bc-select" id="reg-m1" style="border-color:#E65100;">
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
                    <button class="bc-btn" id="reg-submit-btn" style="background:#27500A; border-color:#27500A;">Ghi danh ngay!</button>
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
          } else {
              wrap.appendChild(el(`<div class="bc-card" style="margin-bottom:1rem; padding:15px; color:#5D4037; background:#EFEBE9; text-align:center;">🔒 Giai đoạn đăng ký đã khép lại. Dưới đây là danh sách VĐV.</div>`));
          }

          const listCard = el(`<div class="bc-card" style="margin-bottom:1rem;">
            <h4 style="font-size:15px; color:#1B4332; margin-bottom:10px;">📋 Danh sách VĐV Ghi Danh (${activeTour.registrations.length} lượt)</h4>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${activeTour.registrations.length === 0 ? '<div class="bc-empty" style="padding:10px;">Chưa có ai đăng ký.</div>' : ''}
              ${activeTour.registrations.map(r => {
                const p1 = state.members.find(m => m.id === r.m1);
                const p2 = r.m2 ? state.members.find(m => m.id === r.m2) : null;
                return `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#F8F9FA; border:1px solid #E9ECEF; border-radius:6px;">
                  <div>
                    <span class="bc-badge" style="background:#E3F2FD; color:#1565C0; margin-right:8px;">${r.cat}</span>
                    <strong style="font-size:13px; color:#333;">${escapeHtml(p1?memberDisplayName(p1):'')}</strong> ${p1?.gender==='Nữ'?'👩':'👨'}
                    ${r.type === 'pair' && p2 ? `<span style="color:#888; font-size:12px; margin:0 6px;">+</span> <strong style="font-size:13px; color:#333;">${escapeHtml(memberDisplayName(p2))}</strong> ${p2.gender==='Nữ'?'👩':'👨'}` : `<span style="font-size:11px; color:#E65100; margin-left:8px; font-style:italic;">(Đang tìm partner 🤝)</span>`}
                  </div>
                  ${canManage() && activeTour.status === 'registering' ? `<button class="bc-btn danger small" id="del-reg-${r.id}">Xóa</button>` : ''}
                </div>`;
              }).join('')}
            </div>
          </div>`);
          wrap.appendChild(listCard);
          
          if (canManage() && activeTour.status === 'registering') {
            const pairingCard = el(`<div class="bc-card" style="border: 2px solid #1B4332;">
              <h4 style="font-size:15px; color:#1B4332; margin-bottom:10px;">👥 BTC Cáp Kèo (Cho các VĐV đăng ký Solo)</h4>
              <div style="font-size:12px; color:#666; margin-bottom:10px;">Chọn 2 VĐV từ danh sách đăng ký lẻ để ghép thành 1 cặp chính thức. Các cặp đã "Đăng ký nguyên cặp" sẽ được gom tự động khi chốt.</div>
              
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
              </div>

              <div style="margin-top:20px; text-align:right; border-top:1px dashed #CCC; padding-top:15px;">
                <button class="bc-btn danger" id="tour-lock-reg-btn" style="font-size:14px; padding:10px 20px;">
                  🔒 CHỐT DANH SÁCH & BẮT ĐẦU CHIA BẢNG
                </button>
              </div>
            </div>`);
            wrap.appendChild(pairingCard);
            
            setTimeout(() => {
              activeTour.registrations.forEach(r => {
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

              document.getElementById('pair-merge-btn').onclick = async () => {
                const r1Id = document.getElementById('pair-m1').value;
                const r2Id = document.getElementById('pair-m2').value;
                const tCat = document.getElementById('pair-target-cat').value;
                if (!r1Id || !r2Id || r1Id === r2Id) return alert('Vui lòng chọn 2 VĐV hợp lệ!');
                
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
              
              document.getElementById('tour-lock-reg-btn').onclick = async () => {
                if(!confirm('Xác nhận chốt danh sách đăng ký? Hệ thống sẽ chuyển sang giai đoạn thi đấu!')) return;
                
                const pairs = activeTour.registrations.filter(r => r.type === 'pair').map((r, i) => {
                  const p1 = state.members.find(x => x.id === r.m1);
                  const p2 = state.members.find(x => x.id === r.m2);
                  return {
                    id: 'P' + Date.now() + i,
                    m1: r.m1,
                    m2: r.m2,
                    cat: r.cat,
                    name: `${p1.nickname||p1.name} & ${p2.nickname||p2.name}`
                  };
                });

                const groups = [];
                const matches = [];
                for (const cat of activeTour.categories) {
                   const catPairs = pairs.filter(p => p.cat === cat);
                   if (catPairs.length === 0) continue;
                   
                   const numGroups = Math.max(1, Math.floor(catPairs.length / 4));
                   const shuffled = [...catPairs].sort(() => Math.random() - 0.5);
                   for (let i = 0; i < numGroups; i++) {
                       const gId = 'G' + Date.now() + i + cat.replace(/\s/g,'');
                       const groupName = `Bảng ${String.fromCharCode(65 + i)} - ${cat}`;
                       const groupPairs = shuffled.filter((_, idx) => idx % numGroups === i);
                       groups.push({ id: gId, cat, name: groupName, pairs: groupPairs.map(p => p.id) });
                       
                       for (let a = 0; a < groupPairs.length; a++) {
                          for (let b = a + 1; b < groupPairs.length; b++) {
                             matches.push({
                                id: 'M' + Date.now() + a + b + gId,
                                groupId: gId,
                                cat: cat,
                                p1: groupPairs[a].id,
                                p2: groupPairs[b].id,
                                score1: null,
                                score2: null,
                                status: 'pending'
                             });
                          }
                       }
                   }
                }

                const remainingSolo = activeTour.registrations.filter(r => r.type === 'solo').length;
                if (remainingSolo > 0) alert(`Lưu ý: Có ${remainingSolo} VĐV đăng ký lẻ chưa được ghép cặp và sẽ KHÔNG được đưa vào danh sách thi đấu.`);
                
                await mutateTournaments(tours => {
                   const tour = tours.find(t => t.id === activeTour.id);
                   if (tour) {
                      tour.pairs = pairs;
                      tour.groups = groups;
                      tour.matches = matches;
                      tour.status = 'playing';
                   }
                   return tours;
                });
                state.tourActiveTab = 'group';
                showToast('Đã chốt danh sách thi đấu và chia bảng!', 'success');
                render();
              };
            }, 0);
          }
       }

       // TAB 2: GROUP STAGE
       if (isGroupTab) {
          const groupsContainer = el(`<div style="display:flex; flex-direction:column; gap:20px;"></div>`);
          
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
               <h4 style="color:#FF6F00; font-size:16px; margin-bottom:10px;">🏆 ${escapeHtml(g.name)}</h4>
               <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:flex-start;">
                 
                 <div style="flex:1; min-width:300px;">
                   <table class="bc-table" style="font-size:12px; width:100%; border-collapse:collapse;">
                     <thead><tr style="background:#F5F5F5; text-align:left;">
                       <th style="padding:8px;">VT</th><th style="padding:8px;">Cặp đấu</th><th style="padding:8px;">Trận</th><th style="padding:8px;">T/B</th><th style="padding:8px;">HS</th><th style="padding:8px;">Điểm</th>
                     </tr></thead>
                     <tbody>
                       ${standings.map((s, i) => `<tr style="border-bottom:1px solid #EEE;">
                         <td style="padding:8px; font-weight:bold; color:${i<2?'#2E7D32':'#666'}">${i+1}</td>
                         <td style="padding:8px;">${escapeHtml(s.name)}</td>
                         <td style="padding:8px;">${s.played}</td>
                         <td style="padding:8px;">${s.won}/${s.lost}</td>
                         <td style="padding:8px;">${s.diff > 0 ? '+'+s.diff : s.diff}</td>
                         <td style="padding:8px; font-weight:bold;">${s.points}</td>
                       </tr>`).join('')}
                     </tbody>
                   </table>
                 </div>

                 <div style="flex:1.5; min-width:320px; display:flex; flex-direction:column; gap:10px;">
                   ${gMatches.map(m => {
                     const p1 = activeTour.pairs.find(x => x.id === m.p1);
                     const p2 = activeTour.pairs.find(x => x.id === m.p2);
                     return `<div style="border:1px solid #E0E0E0; border-radius:8px; padding:10px; background:${m.status==='finished'?'#F5F5F5':'#FFF'}; position:relative;">
                       ${m.status === 'live' ? `<span style="position:absolute; top:-8px; left:10px; background:#D32F2F; color:#FFF; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; animation: pulse 1.5s infinite;">LIVE</span>` : ''}
                       <div style="display:flex; justify-content:space-between; align-items:center;">
                         <div style="flex:1; font-size:13px; font-weight:${m.score1 > m.score2 ? 'bold':'normal'};">${escapeHtml(p1?.name)}</div>
                         <div style="padding:0 10px; white-space:nowrap;">
                            ${canManage() ? 
                              `<input type="number" id="s1-${m.id}" value="${m.score1!==null?m.score1:''}" style="width:40px; text-align:center; border:1px solid #CCC; border-radius:4px; padding:4px;" /> - 
                               <input type="number" id="s2-${m.id}" value="${m.score2!==null?m.score2:''}" style="width:40px; text-align:center; border:1px solid #CCC; border-radius:4px; padding:4px;" />` 
                              : `<span style="font-size:16px; font-weight:bold; color:#1565C0;">${m.score1!==null?m.score1:'-'} : ${m.score2!==null?m.score2:'-'}</span>`
                            }
                         </div>
                         <div style="flex:1; font-size:13px; text-align:right; font-weight:${m.score2 > m.score1 ? 'bold':'normal'};">${escapeHtml(p2?.name)}</div>
                       </div>
                       ${canManage() ? `
                         <div style="text-align:center; margin-top:8px;">
                           <button class="bc-btn small" id="update-match-${m.id}" style="background:#0288D1; border-color:#0288D1; color:#FFF; font-size:11px; padding:4px 10px;">Lưu Tỷ số</button>
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
                   const btn = document.getElementById(`update-match-${m.id}`);
                   if (btn) {
                      btn.onclick = async () => {
                         const s1Str = document.getElementById(`s1-${m.id}`).value;
                         const s2Str = document.getElementById(`s2-${m.id}`).value;
                         let s1 = s1Str === '' ? null : parseInt(s1Str, 10);
                         let s2 = s2Str === '' ? null : parseInt(s2Str, 10);
                         
                         let status = m.status;
                         if (s1 !== null && s2 !== null) status = 'finished';
                         else if (s1 !== null || s2 !== null) status = 'live';
                         else status = 'pending';

                         await mutateTournaments(tours => {
                            const t = tours.find(x => x.id === activeTour.id);
                            if (t) {
                               const match = t.matches.find(x => x.id === m.id);
                               if (match) {
                                  match.score1 = s1;
                                  match.score2 = s2;
                                  match.status = status;
                               }
                            }
                            return tours;
                         });
                         render();
                      };
                   }
                });
             }, 0);
          });
          wrap.appendChild(groupsContainer);

          if (canManage() && activeTour.status === 'playing') {
             wrap.appendChild(el(`<div style="text-align:center; margin-top:30px; padding-top:20px; border-top:2px dashed #4CAF50;">
                <button class="bc-btn danger" id="tour-to-knockout-btn" style="padding:12px 25px; font-size:16px; background:#D32F2F; border-color:#D32F2F; box-shadow:0 4px 10px rgba(211,47,47,0.3);">🏆 CHỐT VÒNG BẢNG & TẠO NHÁNH ĐẤU KNOCKOUT</button>
             </div>`));

             setTimeout(() => {
                const btn = document.getElementById('tour-to-knockout-btn');
                if (btn) btn.onclick = async () => {
                   if (!confirm('Chốt vòng bảng? Hệ thống sẽ tạo sơ đồ thi đấu loại trực tiếp.')) return;
                   
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
                         
                         advancingPairs.push(...standings.slice(0, 2).map((s, idx) => ({ pId: s.pId, groupRank: idx + 1, gId: g.id })));
                      });
                      
                      if (catGroups.length === 1) {
                         const g = catGroups[0];
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
                         advancingPairs = standings.slice(0, 4).map((s, idx) => ({ pId: s.pId, groupRank: idx + 1, gId: g.id }));
                      }
                      
                      advancingPairs.sort((a, b) => a.groupRank - b.groupRank);
                      let final4 = advancingPairs.slice(0, 4).map(x => x.pId);
                      if (final4.length === 3) final4.push(null); 
                      
                      if (final4.length >= 2) {
                         bracket[cat] = [
                            { id: 'K1'+cat.replace(/\s/g,''), round: 'Bán kết', name: 'Bán kết 1', p1: final4[0], p2: final4[3] || null, score1: null, score2: null, status: 'pending', winnerTo: 'KF'+cat.replace(/\s/g,'') },
                            { id: 'K2'+cat.replace(/\s/g,''), round: 'Bán kết', name: 'Bán kết 2', p1: final4[1], p2: final4[2] || null, score1: null, score2: null, status: 'pending', winnerTo: 'KF'+cat.replace(/\s/g,'') },
                            { id: 'KF'+cat.replace(/\s/g,''), round: 'Chung kết', name: 'Chung kết', p1: null, p2: null, score1: null, score2: null, status: 'pending', winnerTo: null }
                         ];
                         if (!final4[3]) {
                            bracket[cat][0].status = 'finished';
                            bracket[cat][0].score1 = 21; bracket[cat][0].score2 = 0;
                            bracket[cat][2].p1 = final4[0];
                         }
                      } else if (final4.length === 1) {
                         bracket[cat] = [
                            { id: 'KF'+cat.replace(/\s/g,''), round: 'Chung kết', name: 'Chung kết', p1: final4[0], p2: null, score1: null, score2: null, status: 'pending', winnerTo: null }
                         ];
                      }
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

       // TAB 3: KNOCKOUT
       if (isKnockoutTab) {
          const bracketContainer = el(`<div style="display:flex; flex-direction:column; gap:30px;"></div>`);
          Object.keys(activeTour.bracket || {}).forEach(cat => {
             const matches = activeTour.bracket[cat];
             const semis = matches.filter(m => m.round === 'Bán kết');
             const finals = matches.filter(m => m.round === 'Chung kết');
             
             const catCard = el(`<div class="bc-card" style="border: 2px solid #3F51B5; border-radius:12px; overflow:hidden; padding:0;">
                <div style="background:#3F51B5; color:#FFF; padding:10px 15px; font-weight:bold; font-size:16px;">🏸 ${cat}</div>
                <div style="padding:20px; display:flex; justify-content:space-around; align-items:center; flex-wrap:wrap; gap:30px; background:linear-gradient(to right, #FAFAFA, #FFF);">
                   
                   ${semis.length > 0 ? `<div style="display:flex; flex-direction:column; gap:40px; flex:1; min-width:280px;">
                     ${semis.map(m => {
                        const p1 = activeTour.pairs.find(x => x.id === m.p1);
                        const p2 = activeTour.pairs.find(x => x.id === m.p2);
                        return `<div style="border:1px solid #CCC; border-radius:8px; padding:12px; background:${m.status==='finished'?'#F5F5F5':'#FFF'}; box-shadow:0 2px 5px rgba(0,0,0,0.1); position:relative;">
                          <div style="font-size:12px; color:#666; margin-bottom:8px; text-transform:uppercase; font-weight:bold; border-bottom:1px solid #EEE; padding-bottom:5px;">${m.name}</div>
                          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                             <span style="font-size:14px; font-weight:${m.score1>m.score2?'bold':'normal'}; color:${m.score1>m.score2?'#2E7D32':'#333'}">${p1 ? escapeHtml(p1.name) : '---'}</span>
                             ${canManage() && p1 && p2 ? `<input type="number" id="k-s1-${m.id}" value="${m.score1!==null?m.score1:''}" style="width:45px;text-align:center;border:1px solid #999;border-radius:4px;padding:4px;"/>` : `<strong style="font-size:16px;">${m.score1!==null?m.score1:'-'}</strong>`}
                          </div>
                          <div style="display:flex; justify-content:space-between; align-items:center;">
                             <span style="font-size:14px; font-weight:${m.score2>m.score1?'bold':'normal'}; color:${m.score2>m.score1?'#2E7D32':'#333'}">${p2 ? escapeHtml(p2.name) : '---'}</span>
                             ${canManage() && p1 && p2 ? `<input type="number" id="k-s2-${m.id}" value="${m.score2!==null?m.score2:''}" style="width:45px;text-align:center;border:1px solid #999;border-radius:4px;padding:4px;"/>` : `<strong style="font-size:16px;">${m.score2!==null?m.score2:'-'}</strong>`}
                          </div>
                          ${canManage() && p1 && p2 ? `<div style="text-align:center; margin-top:12px;"><button class="bc-btn small" id="k-update-${m.id}" style="background:#3F51B5; border-color:#3F51B5;">Lưu</button></div>` : ''}
                        </div>`;
                     }).join('')}
                   </div>` : ''}

                   <div style="display:flex; flex-direction:column; gap:40px; flex:1.2; min-width:300px;">
                     ${finals.map(m => {
                        const p1 = activeTour.pairs.find(x => x.id === m.p1);
                        const p2 = activeTour.pairs.find(x => x.id === m.p2);
                        return `<div style="border:2px solid #FFD700; border-radius:10px; padding:20px; background:#FFFDE7; box-shadow:0 6px 15px rgba(255,215,0,0.3); transform: scale(1.05);">
                          <div style="font-size:16px; color:#F57F17; margin-bottom:12px; text-transform:uppercase; font-weight:bold; text-align:center; border-bottom:1px dashed #FBC02D; padding-bottom:8px;">🏆 ${m.name}</div>
                          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                             <span style="font-size:15px; font-weight:${m.score1>m.score2?'bold':'normal'}; color:${m.score1>m.score2?'#D84315':'#333'}">${p1 ? escapeHtml(p1.name) : '<span style="color:#999;font-style:italic;">Đang chờ nhánh dưới...</span>'}</span>
                             ${canManage() && p1 && p2 ? `<input type="number" id="k-s1-${m.id}" value="${m.score1!==null?m.score1:''}" style="width:50px;text-align:center;border:1px solid #FBC02D;border-radius:4px;padding:6px;font-size:16px;"/>` : `<strong style="font-size:20px; color:#D84315;">${m.score1!==null?m.score1:'-'}</strong>`}
                          </div>
                          <div style="display:flex; justify-content:space-between; align-items:center;">
                             <span style="font-size:15px; font-weight:${m.score2>m.score1?'bold':'normal'}; color:${m.score2>m.score1?'#D84315':'#333'}">${p2 ? escapeHtml(p2.name) : '<span style="color:#999;font-style:italic;">Đang chờ nhánh dưới...</span>'}</span>
                             ${canManage() && p1 && p2 ? `<input type="number" id="k-s2-${m.id}" value="${m.score2!==null?m.score2:''}" style="width:50px;text-align:center;border:1px solid #FBC02D;border-radius:4px;padding:6px;font-size:16px;"/>` : `<strong style="font-size:20px; color:#D84315;">${m.score2!==null?m.score2:'-'}</strong>`}
                          </div>
                          ${canManage() && p1 && p2 ? `<div style="text-align:center; margin-top:15px;"><button class="bc-btn" id="k-update-${m.id}" style="background:#F57F17; border-color:#F57F17; padding:8px 20px; font-size:14px;">Lưu Chung Kết</button></div>` : ''}
                        </div>`;
                     }).join('')}
                   </div>

                </div>
             </div>`);
             bracketContainer.appendChild(catCard);

             setTimeout(() => {
                matches.forEach(m => {
                   const btn = document.getElementById(`k-update-${m.id}`);
                   if (btn) {
                      btn.onclick = async () => {
                         const s1Str = document.getElementById(`k-s1-${m.id}`).value;
                         const s2Str = document.getElementById(`k-s2-${m.id}`).value;
                         let s1 = s1Str === '' ? null : parseInt(s1Str, 10);
                         let s2 = s2Str === '' ? null : parseInt(s2Str, 10);
                         let status = (s1 !== null && s2 !== null) ? 'finished' : 'pending';

                         await mutateTournaments(tours => {
                            const t = tours.find(x => x.id === activeTour.id);
                            if (t) {
                               const tCatMatches = t.bracket[cat];
                               const tMatch = tCatMatches.find(x => x.id === m.id);
                               tMatch.score1 = s1;
                               tMatch.score2 = s2;
                               tMatch.status = status;
                               
                               if (tMatch.winnerTo) {
                                  const nextMatch = tCatMatches.find(x => x.id === tMatch.winnerTo);
                                  if (nextMatch) {
                                     // if changed score, recalculate winner
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
             }, 0);
          });
          wrap.appendChild(bracketContainer);

          if (canManage() && activeTour.status !== 'finished') {
             wrap.appendChild(el(`<div style="text-align:center; margin-top:30px; padding-top:20px; border-top:2px dashed #3F51B5;">
                <button class="bc-btn" id="tour-finish-btn" style="background:#FFD700; border:2px solid #F57F17; color:#D84315; font-size:18px; padding:15px 30px; font-weight:bold; box-shadow:0 4px 10px rgba(0,0,0,0.2);">🎉 BẾ MẠC & TRAO THƯỞNG XP</button>
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
                   showToast('Đã bế mạc và cộng thưởng XP thành công!', 'success');
                   render();
                };
             }, 0);
          }
       }
    }

    // TOURNAMENT HISTORY
    if (finishedTours.length > 0) {
      wrap.appendChild(el(`<div class="bc-card" style="margin-top:2rem; background:#E3F2FD; border:2px solid #90CAF9; padding:20px;">
        <h3 style="font-size:18px; color:#1565C0; margin-bottom:15px; font-family:'Oswald',sans-serif; text-transform:uppercase;">📚 Lịch sử Giải đấu (Hall of Fame)</h3>
        <div style="display:flex; flex-direction:column; gap:15px;">
           ${finishedTours.map(t => {
              const isViewing = state.viewingTourId === t.id;
              
              // Generate Podium for this tour
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
                       <strong style="color:#D84315; font-size:14px;">${cat}</strong>
                       <div style="font-size:13px; margin-top:5px;">🥇 Vô địch: <strong>${escapeHtml(wPair?.name||'')}</strong></div>
                       <div style="font-size:13px;">🥈 Á quân: <strong>${escapeHtml(rPair?.name||'')}</strong></div>
                    </div>`);
                 });
                 podiumHtml = `<div style="margin-top:15px; padding-top:15px; border-top:1px dashed #90CAF9;">
                    <h4 style="text-align:center; margin-bottom:10px; color:#1565C0;">🎉 BẢNG VÀNG THÀNH TÍCH</h4>
                    ${catPodiums.join('')}
                 </div>`;
              }

              return `<div style="background:#FFF; border:1px solid #BBDEFB; border-radius:8px; padding:15px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                 <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                       <strong style="font-size:15px; color:#0D47A1;">${escapeHtml(t.name)}</strong>
                       <div style="font-size:11px; color:#666;">Bế mạc: ${new Date(t.createdAt).toLocaleDateString()} | ${t.pairs?.length||0} cặp VĐV</div>
                    </div>
                    <div style="display:flex; gap:10px;">
                       <button class="bc-btn small" id="view-tour-${t.id}" style="background:#1976D2; border-color:#1976D2;">${isViewing ? 'Đóng' : 'Xem kết quả'}</button>
                       ${state.me?.role === 'owner' ? `<button class="bc-btn small danger" id="del-tour-${t.id}">Xóa</button>` : ''}
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

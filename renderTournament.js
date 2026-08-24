
  function renderTournament(){
    const wrap = el(`<div></div>`);
    
    // Header Banner hoành tráng
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

    if (!activeTour) {
      if (!canManage()) {
        wrap.appendChild(el(`<div class="bc-empty">Hiện tại chưa có giải đấu nào đang diễn ra. Hãy luyện tập chờ giải mới nhé!</div>`));
        return wrap;
      }

      state.tourSetup = state.tourSetup || {
        name: 'Giải Cầu Lông Mùa Hè',
        categories: ['Đôi Nam'],
        courtsCount: 4,
        selectedCourts: state.courts.slice(0, 4).map(c => c.id)
      };

      const setupCard = el(`<div class="bc-card" style="border: 2px dashed #FF8F00;">
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
        document.getElementById('ts-start-btn').onclick = () => {
          const name = document.getElementById('ts-name').value.trim();
          const count = parseInt(document.getElementById('ts-courts-count').value, 10);
          const selCourts = Array.from(document.querySelectorAll('.ts-court-chk:checked')).map(x => x.value);
          const selCats = Array.from(document.querySelectorAll('.ts-cat-chk:checked')).map(x => x.value);
          
          if (!name) return alert('Vui lòng nhập tên giải đấu!');
          if (selCourts.length === 0) return alert('Vui lòng chọn ít nhất 1 sân!');
          if (selCats.length === 0) return alert('Vui lòng chọn ít nhất 1 hạng mục thi đấu!');
          
          state.tournaments.push({
            id: uid(),
            name,
            categories: selCats,
            courtsCount: count,
            selectedCourts: selCourts,
            status: 'registering',
            registrations: [],
            pairs: [],
            groups: [],
            bracket: null,
            createdAt: new Date().toISOString()
          });
          state.tourSetup = null;
          render();
        };
      }, 0);
      return wrap;
    }

    if (activeTour.status === 'registering') {
      wrap.appendChild(el(`<div class="bc-card" style="text-align:center; padding:20px; background:#FFF3E0; border:1px solid #FFB74D; margin-bottom:1rem;">
        <h3 style="font-size:20px; color:#E65100; font-family:'Oswald',sans-serif; margin-bottom:5px;">${escapeHtml(activeTour.name)}</h3>
        <div style="font-size:14px; color:#F57C00; font-weight:600;">CỔNG ĐĂNG KÝ ĐANG MỞ! Nhanh tay ghi danh nào các chiến thủ!</div>
      </div>`));

      const activeMembers = state.members.filter(m => m.status === 'active');
      activeTour.registrations = activeTour.registrations || [];
      const isRegistered = activeTour.registrations.some(r => r.m1 === state.me?.id || r.m2 === state.me?.id);

      if (state.me && !isRegistered) {
        const regCard = el(`<div class="bc-card" style="margin-bottom:1rem; border:2px solid #27500A;">
          <h4 style="font-size:16px; color:#27500A; margin-bottom:12px; font-family:'Oswald',sans-serif;">TẠO PHIẾU ĐĂNG KÝ THAM GIA</h4>
          <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
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
                ${activeMembers.filter(m => m.id !== state.me.id).map(m => `<option value="${m.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'})</option>`).join('')}
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
          
          document.getElementById('reg-submit-btn').onclick = () => {
            const cat = document.getElementById('reg-cat').value;
            const type = document.getElementById('reg-type').value;
            let m2 = null;
            const me = state.members.find(m => m.id === state.me.id);
            if (!me) return;
            
            if (type === 'pair') {
              m2 = document.getElementById('reg-partner').value;
              if (!m2) return alert('Vui lòng chọn Partner!');
              const p2 = state.members.find(m => m.id === m2);
              if (!p2) return;
              
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
            
            activeTour.registrations.push({ id: uid(), cat, type, m1: me.id, m2, createdAt: Date.now() });
            showToast('Đăng ký thành công!', 'success');
            render();
          };
        }, 0);
      } else if (isRegistered) {
        wrap.appendChild(el(`<div class="bc-card" style="margin-bottom:1rem; text-align:center; padding:15px; color:#27500A; background:#EAF3DE; font-weight:600; font-size:14px; border:1px solid #27500A;">
          🎉 Bạn đã đăng ký tham gia giải đấu! Hãy chuẩn bị thể lực thật tốt nhé! 💪
        </div>`));
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
              ${canManage() ? `<button class="bc-btn danger small" id="del-reg-${r.id}">Xóa</button>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`);
      wrap.appendChild(listCard);
      
      if (canManage()) {
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
            if(btn) btn.onclick = () => {
              activeTour.registrations = activeTour.registrations.filter(x => x.id !== r.id);
              render();
            };
          });

          document.getElementById('pair-merge-btn').onclick = () => {
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
            
            r1.type = 'pair';
            r1.m2 = m2.id;
            r1.cat = tCat;
            activeTour.registrations = activeTour.registrations.filter(x => x.id !== r2Id);
            showToast('Ghép cặp thành công!', 'success');
            render();
          };
          
          document.getElementById('tour-lock-reg-btn').onclick = () => {
            if(!confirm('Xác nhận chốt danh sách đăng ký? Hệ thống sẽ chuyển sang giai đoạn thi đấu!')) return;
            activeTour.pairs = activeTour.registrations.filter(r => r.type === 'pair').map((r, i) => {
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
            const remainingSolo = activeTour.registrations.filter(r => r.type === 'solo').length;
            if (remainingSolo > 0) alert(`Lưu ý: Có ${remainingSolo} VĐV đăng ký lẻ chưa được ghép cặp và sẽ KHÔNG được đưa vào danh sách thi đấu.`);
            activeTour.status = 'playing';
            showToast('Đã chốt danh sách thi đấu!', 'success');
            render();
          };
        }, 0);
      }
      return wrap;
    }

    if (activeTour.status === 'playing') {
      wrap.appendChild(el(`<div class="bc-card" style="text-align:center; padding:15px; background:#E8F5E9; border:1px solid #4CAF50; margin-bottom:1rem;">
        <h3 style="font-size:20px; color:#2E7D32; font-family:'Oswald',sans-serif; margin-bottom:5px;">VÒNG BẢNG - ${escapeHtml(activeTour.name)}</h3>
      </div>`));
      
      wrap.appendChild(el(`<div class="bc-card">Phần Vòng bảng song song sẽ được thi công trong task tiếp theo...</div>`));
    }
    
    return wrap;
  }

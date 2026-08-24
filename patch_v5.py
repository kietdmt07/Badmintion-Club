import re

with open('/Users/kietdmt/Documents/v5_temp.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Show the "CHỐT VÒNG BẢNG" button even in knockout mode.
js = js.replace("""if (canManage() && activeTour.status === 'playing') {""",
"""if (canManage() && (activeTour.status === 'playing' || activeTour.status === 'knockout')) {""")

js = js.replace("""<button class="bc-btn danger" id="tour-to-knockout-btn" style="padding:12px 25px; font-size:16px; background:#D32F2F; border-color:#D32F2F; box-shadow:0 4px 10px rgba(211,47,47,0.3);">🏆 CHỐT VÒNG BẢNG & TẠO NHÁNH ĐẤU KNOCKOUT</button>""",
"""<button class="bc-btn danger" id="tour-to-knockout-btn" style="padding:12px 25px; font-size:16px; background:#D32F2F; border-color:#D32F2F; box-shadow:0 4px 10px rgba(211,47,47,0.3);">${activeTour.status === 'knockout' ? '🔄 TÁI TÍNH TOÁN & TẠO LẠI NHÁNH ĐẤU' : '🏆 CHỐT VÒNG BẢNG & TẠO NHÁNH ĐẤU KNOCKOUT'}</button>""")

# 2. Update the button handler to check for ties.
old_logic = """                   if (!confirm('Chốt vòng bảng? Hệ thống sẽ tự động tạo sơ đồ thi đấu loại trực tiếp dựa trên số lượng đội đi tiếp.')) return;
                   
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
                               if (m.score1 === null || m.score2 === null) return;
                               if (m.p1 === pId) {
                                  if (m.score1 > m.score2) won++;
                                  diff += (m.score1 - m.score2);
                               }
                               if (m.p2 === pId) {
                                  if (m.score2 > m.score1) won++;
                                  diff += (m.score2 - m.score1);
                               }
                            });
                            return { pId, points: won * 3, diff };
                         }).sort((a, b) => b.points - a.points || b.diff - a.diff);
                         
                         // Lấy 2 đội đứng đầu mỗi bảng
                         advancingPairs.push(...standings.slice(0, 2).map((s, idx) => ({ pId: s.pId, groupRank: idx + 1, gId: g.id })));
                      });
                      
                      // DYNAMIC BRACKET GENERATOR"""

new_logic = """                   const msg = activeTour.status === 'knockout' ? 'Sơ đồ thi đấu cũ sẽ bị XÓA và tính toán lại từ đầu. Xác nhận Tái tính toán?' : 'Chốt vòng bảng? Hệ thống sẽ tự động tạo sơ đồ thi đấu loại trực tiếp dựa trên số lượng đội đi tiếp.';
                   if (!confirm(msg)) return;
                   
                   let hasTieError = false;
                   const bracket = {}; 
                   for (const cat of activeTour.categories) {
                      const catGroups = activeTour.groups.filter(g => g.cat === cat);
                      if (catGroups.length === 0) continue;
                      
                      let advancingPairs = [];
                      for (const g of catGroups) {
                         const gMatches = activeTour.matches.filter(m => m.groupId === g.id);
                         const standings = g.pairs.map(pId => {
                            let won = 0, diff = 0;
                            gMatches.forEach(m => {
                               if (m.score1 === null || m.score2 === null) return;
                               if (m.p1 === pId) {
                                  if (m.score1 > m.score2) won++;
                                  diff += (m.score1 - m.score2);
                               }
                               if (m.p2 === pId) {
                                  if (m.score2 > m.score1) won++;
                                  diff += (m.score2 - m.score1);
                               }
                            });
                            return { pId, points: won * 3, diff };
                         }).sort((a, b) => b.points - a.points || b.diff - a.diff);
                         
                         for (let i = 0; i < 2 && i < standings.length - 1; i++) {
                             if (standings[i].points === standings[i+1].points && standings[i].diff === standings[i+1].diff) {
                                 const p1Name = activeTour.pairs.find(x => x.id === standings[i].pId)?.name || 'Đội A';
                                 const p2Name = activeTour.pairs.find(x => x.id === standings[i+1].pId)?.name || 'Đội B';
                                 alert(`🛑 CẢNH BÁO TẠI BẢNG ${g.name}:\\n\\n[${p1Name}] và [${p2Name}] đang BẰNG ĐIỂM (${standings[i].points}đ) và BẰNG HIỆU SỐ (${standings[i].diff}).\\n\\nHệ thống đã chặn quá trình tạo nhánh đấu vì không thể xếp hạng ngẫu nhiên. Xin vui lòng tự xét tiêu chí đối đầu hoặc bốc thăm ở ngoài, sau đó sửa lại tỷ số 1 trận đấu tương ứng (thêm/bớt 1 điểm) để phân định thứ hạng rõ ràng!`);
                                 hasTieError = true;
                                 break;
                             }
                         }
                         if (hasTieError) break;
                         
                         // Lấy 2 đội đứng đầu mỗi bảng
                         advancingPairs.push(...standings.slice(0, 2).map((s, idx) => ({ pId: s.pId, groupRank: idx + 1, gId: g.id })));
                      }
                      
                      if (hasTieError) break;
                      
                      // DYNAMIC BRACKET GENERATOR"""

js = js.replace(old_logic, new_logic)

# Wrap mutateTournaments inside if (!hasTieError)
js = js.replace("""                   await mutateTournaments(tours => {
                      const t = tours.find(x => x.id === activeTour.id);
                      if (t) {
                         t.bracket = bracket;
                         t.status = 'knockout';
                      }
                      return tours;
                   });
                   state.tourActiveTab = 'knockout';
                   showToast('Đã chốt vòng bảng & tạo sơ đồ Knockout!', 'success');
                   render();
                };""",
"""                   if (!hasTieError) {
                      await mutateTournaments(tours => {
                         const t = tours.find(x => x.id === activeTour.id);
                         if (t) {
                            t.bracket = bracket;
                            t.status = 'knockout';
                         }
                         return tours;
                      });
                      state.tourActiveTab = 'knockout';
                      showToast('Đã chốt vòng bảng & tạo sơ đồ Knockout!', 'success');
                      render();
                   }
                };""")


with open('/Users/kietdmt/Documents/v5_temp.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("v5_temp.js patched successfully")

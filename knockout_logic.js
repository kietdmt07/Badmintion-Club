      if (canManage()) {
         wrap.appendChild(el(`<div style="text-align:center; margin-top:30px; padding-top:20px; border-top:2px dashed #4CAF50;">
            <button class="bc-btn danger" id="tour-to-knockout-btn" style="padding:12px 25px; font-size:16px; background:#D32F2F; border-color:#D32F2F; box-shadow:0 4px 10px rgba(211,47,47,0.3);">🏆 CHỐT VÒNG BẢNG & TẠO NHÁNH ĐẤU KNOCKOUT</button>
         </div>`));

         setTimeout(() => {
            const btn = document.getElementById('tour-to-knockout-btn');
            if (btn) btn.onclick = async () => {
               if (!confirm('Bạn có chắc chắn muốn chốt vòng bảng? Hệ thống sẽ chọn ra các đội đứng đầu mỗi bảng để bốc thăm thi đấu loại trực tiếp.')) return;
               
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
                     // Not enough teams, dummy final
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
               showToast('Tạo nhánh đấu thành công!', 'success');
               render();
            };
         }, 0);
      }
    }

    if (activeTour.status === 'knockout') {
      wrap.appendChild(el(`<div class="bc-card" style="text-align:center; padding:15px; background:#E8EAF6; border:1px solid #3F51B5; margin-bottom:1rem;">
        <h3 style="font-size:20px; color:#1A237E; font-family:'Oswald',sans-serif; margin-bottom:5px;">VÒNG LOẠI TRỰC TIẾP - ${escapeHtml(activeTour.name)}</h3>
      </div>`));

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
                    const isFinished = m.status === 'finished';
                    return `<div style="border:1px solid #CCC; border-radius:8px; padding:12px; background:${isFinished?'#F5F5F5':'#FFF'}; box-shadow:0 2px 5px rgba(0,0,0,0.1); position:relative;">
                      <div style="font-size:12px; color:#666; margin-bottom:8px; text-transform:uppercase; font-weight:bold; border-bottom:1px solid #EEE; padding-bottom:5px;">${m.name}</div>
                      
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                         <span style="font-size:14px; font-weight:${m.score1>m.score2?'bold':'normal'}; color:${m.score1>m.score2?'#2E7D32':'#333'}">${p1 ? escapeHtml(p1.name) : '---'}</span>
                         ${canManage() && !isFinished && p1 && p2 ? `<input type="number" id="k-s1-${m.id}" value="${m.score1||''}" style="width:45px;text-align:center;border:1px solid #999;border-radius:4px;padding:4px;"/>` : `<strong style="font-size:16px;">${m.score1!==null?m.score1:'-'}</strong>`}
                      </div>
                      <div style="display:flex; justify-content:space-between; align-items:center;">
                         <span style="font-size:14px; font-weight:${m.score2>m.score1?'bold':'normal'}; color:${m.score2>m.score1?'#2E7D32':'#333'}">${p2 ? escapeHtml(p2.name) : '---'}</span>
                         ${canManage() && !isFinished && p1 && p2 ? `<input type="number" id="k-s2-${m.id}" value="${m.score2||''}" style="width:45px;text-align:center;border:1px solid #999;border-radius:4px;padding:4px;"/>` : `<strong style="font-size:16px;">${m.score2!==null?m.score2:'-'}</strong>`}
                      </div>
                      ${canManage() && !isFinished && p1 && p2 ? `<div style="text-align:center; margin-top:12px;"><button class="bc-btn small" id="k-update-${m.id}" style="background:#3F51B5; border-color:#3F51B5;">Chốt Tỷ số</button></div>` : ''}
                    </div>`;
                 }).join('')}
               </div>
               
               <div style="flex:0.1; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:40px;">
                  <div style="width:40px; height:3px; background:#3F51B5;"></div>
               </div>` : ''}

               <div style="display:flex; flex-direction:column; gap:40px; flex:1.2; min-width:300px;">
                 ${finals.map(m => {
                    const p1 = activeTour.pairs.find(x => x.id === m.p1);
                    const p2 = activeTour.pairs.find(x => x.id === m.p2);
                    const isFinished = m.status === 'finished';
                    return `<div style="border:2px solid #FFD700; border-radius:10px; padding:20px; background:#FFFDE7; box-shadow:0 6px 15px rgba(255,215,0,0.3); transform: scale(1.05);">
                      <div style="font-size:16px; color:#F57F17; margin-bottom:12px; text-transform:uppercase; font-weight:bold; text-align:center; border-bottom:1px dashed #FBC02D; padding-bottom:8px;">🏆 ${m.name}</div>
                      
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                         <span style="font-size:15px; font-weight:${m.score1>m.score2?'bold':'normal'}; color:${m.score1>m.score2?'#D84315':'#333'}">${p1 ? escapeHtml(p1.name) : '<span style="color:#999;font-style:italic;">Đang chờ nhánh dưới...</span>'}</span>
                         ${canManage() && !isFinished && p1 && p2 ? `<input type="number" id="k-s1-${m.id}" value="${m.score1||''}" style="width:50px;text-align:center;border:1px solid #FBC02D;border-radius:4px;padding:6px;font-size:16px;"/>` : `<strong style="font-size:20px; color:#D84315;">${m.score1!==null?m.score1:'-'}</strong>`}
                      </div>
                      <div style="display:flex; justify-content:space-between; align-items:center;">
                         <span style="font-size:15px; font-weight:${m.score2>m.score1?'bold':'normal'}; color:${m.score2>m.score1?'#D84315':'#333'}">${p2 ? escapeHtml(p2.name) : '<span style="color:#999;font-style:italic;">Đang chờ nhánh dưới...</span>'}</span>
                         ${canManage() && !isFinished && p1 && p2 ? `<input type="number" id="k-s2-${m.id}" value="${m.score2||''}" style="width:50px;text-align:center;border:1px solid #FBC02D;border-radius:4px;padding:6px;font-size:16px;"/>` : `<strong style="font-size:20px; color:#D84315;">${m.score2!==null?m.score2:'-'}</strong>`}
                      </div>
                      ${canManage() && !isFinished && p1 && p2 ? `<div style="text-align:center; margin-top:15px;"><button class="bc-btn" id="k-update-${m.id}" style="background:#F57F17; border-color:#F57F17; padding:8px 20px; font-size:14px; box-shadow:0 2px 5px rgba(245,127,23,0.3);">Chốt Vô Địch</button></div>` : ''}
                      ${isFinished ? `<div style="text-align:center; margin-top:15px; font-weight:bold; color:#2E7D32; font-size:16px; animation:crown-float 2s infinite;">👑 ĐỘI VÔ ĐỊCH: ${m.score1>m.score2?escapeHtml(p1.name):escapeHtml(p2.name)}</div>` : ''}
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
                     const s1 = parseInt(document.getElementById(`k-s1-${m.id}`).value, 10);
                     const s2 = parseInt(document.getElementById(`k-s2-${m.id}`).value, 10);
                     if (isNaN(s1) || isNaN(s2) || s1 === s2) return alert('Vui lòng nhập tỷ số hợp lệ (không hòa)!');
                     
                     if (!confirm(`Xác nhận tỷ số ${s1} - ${s2}?`)) return;

                     await mutateTournaments(tours => {
                        const t = tours.find(x => x.id === activeTour.id);
                        if (t) {
                           const tCatMatches = t.bracket[cat];
                           const tMatch = tCatMatches.find(x => x.id === m.id);
                           tMatch.score1 = s1;
                           tMatch.score2 = s2;
                           tMatch.status = 'finished';
                           
                           if (tMatch.winnerTo) {
                              const nextMatch = tCatMatches.find(x => x.id === tMatch.winnerTo);
                              if (nextMatch) {
                                 const winnerId = s1 > s2 ? tMatch.p1 : tMatch.p2;
                                 if (!nextMatch.p1) nextMatch.p1 = winnerId;
                                 else if (!nextMatch.p2) nextMatch.p2 = winnerId;
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

      if (canManage()) {
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

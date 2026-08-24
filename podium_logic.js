    if (activeTour.status === 'finished') {
      wrap.appendChild(el(`<div class="bc-card" style="text-align:center; padding:15px; background:linear-gradient(135deg, #FFD700 0%, #FF8F00 100%); border:2px solid #FF6F00; margin-bottom:2rem; box-shadow:0 4px 15px rgba(255,143,0,0.4); position:relative; overflow:hidden;">
        <h3 style="font-size:24px; color:#FFF; font-family:'Oswald',sans-serif; margin-bottom:5px; text-transform:uppercase; text-shadow:0 2px 4px rgba(0,0,0,0.3);">🎉 TỔNG KẾT & VINH DANH 🎉</h3>
        <div style="font-size:14px; color:#FFF; font-weight:bold;">${escapeHtml(activeTour.name)}</div>
        <div style="position:absolute; top:-20px; left:-10px; font-size:100px; opacity:0.2;">🏆</div>
        <div style="position:absolute; top:-20px; right:-10px; font-size:100px; opacity:0.2;">🎊</div>
      </div>`));

      const podiumContainer = el(`<div style="display:flex; flex-direction:column; gap:40px; margin-bottom:2rem;"></div>`);
      
      Object.keys(activeTour.bracket || {}).forEach(cat => {
         const matches = activeTour.bracket[cat];
         const finalMatch = matches.find(m => m.round === 'Chung kết');
         const semis = matches.filter(m => m.round === 'Bán kết');
         if (!finalMatch || finalMatch.status !== 'finished') return;

         const winnerId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p1 : finalMatch.p2;
         const runnerId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p2 : finalMatch.p1;
         
         const wPair = activeTour.pairs.find(p => p.id === winnerId);
         const rPair = activeTour.pairs.find(p => p.id === runnerId);

         // Find 3rd places from semis losers
         let thirdPlaces = [];
         semis.forEach(m => {
            if (m.status === 'finished') {
               const loserId = m.score1 < m.score2 ? m.p1 : m.p2;
               const lPair = activeTour.pairs.find(p => p.id === loserId);
               if (lPair) thirdPlaces.push(lPair);
            }
         });
         
         const catPodium = el(`<div class="bc-card" style="border-radius:12px; background:#FFF; border:1px solid #E0E0E0; padding:30px 10px; text-align:center; position:relative; overflow:hidden;">
            <h4 style="font-size:18px; color:#1A237E; font-weight:bold; margin-bottom:30px; text-transform:uppercase;">HẠNG MỤC: ${cat}</h4>
            
            <div style="display:flex; justify-content:center; align-items:flex-end; gap:10px; height:200px;">
               
               <!-- Hạng 2 -->
               <div style="display:flex; flex-direction:column; align-items:center; width:30%; z-index:2;">
                  <div style="font-size:40px; margin-bottom:10px;">🥈</div>
                  <div style="font-weight:bold; font-size:14px; color:#616161; margin-bottom:10px; min-height:40px;">${rPair ? escapeHtml(rPair.name) : '---'}</div>
                  <div style="width:100%; height:120px; background:linear-gradient(to top, #E0E0E0, #F5F5F5); border:1px solid #BDBDBD; border-bottom:none; display:flex; justify-content:center; align-items:flex-start; padding-top:10px;">
                     <strong style="font-size:24px; color:#757575;">2</strong>
                  </div>
               </div>

               <!-- Hạng 1 -->
               <div style="display:flex; flex-direction:column; align-items:center; width:35%; z-index:3;">
                  <div style="font-size:50px; margin-bottom:10px; animation:crown-float 2s infinite;">🏆</div>
                  <div style="font-weight:bold; font-size:16px; color:#F57F17; margin-bottom:10px; min-height:40px;">${wPair ? escapeHtml(wPair.name) : '---'}</div>
                  <div style="width:100%; height:160px; background:linear-gradient(to top, #FFD700, #FFF9C4); border:1px solid #FBC02D; border-bottom:none; display:flex; justify-content:center; align-items:flex-start; padding-top:10px; box-shadow:0 -5px 15px rgba(255,215,0,0.5);">
                     <strong style="font-size:32px; color:#F57F17;">1</strong>
                  </div>
               </div>

               <!-- Hạng 3 -->
               <div style="display:flex; flex-direction:column; align-items:center; width:30%; z-index:1;">
                  <div style="font-size:35px; margin-bottom:10px;">🥉</div>
                  <div style="font-weight:bold; font-size:13px; color:#8D6E63; margin-bottom:10px; min-height:40px;">${thirdPlaces.map(p=>escapeHtml(p.name)).join('<br/>&<br/>') || '---'}</div>
                  <div style="width:100%; height:90px; background:linear-gradient(to top, #D7CCC8, #EFEBE9); border:1px solid #A1887F; border-bottom:none; display:flex; justify-content:center; align-items:flex-start; padding-top:10px;">
                     <strong style="font-size:20px; color:#5D4037;">3</strong>
                  </div>
               </div>

            </div>
         </div>`);
         podiumContainer.appendChild(catPodium);
      });

      wrap.appendChild(podiumContainer);
    }

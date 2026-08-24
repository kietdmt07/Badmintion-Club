import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add "Thêm Bảng" and "Sửa/Xóa Bảng" UI
old_cat_card = """             const catCard = el(`<div class="bc-card" style="border-left:4px solid #9C27B0;">
                <h4 style="color:var(--text-primary); margin-bottom:15px; font-size:16px;">🏸 Hạng mục: ${cat}</h4>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:15px;">
                   ${catGroups.map(g => {
                      return `<div style="border:1px solid #E1BEE7; border-radius:8px; background:var(--card-bg); padding:10px;">
                         <div style="font-weight:bold; color:var(--text-primary); margin-bottom:10px; border-bottom:1px solid #E1BEE7; padding-bottom:5px;">${g.name} (${g.pairs.length} Đội)</div>"""

new_cat_card = """             const catCard = el(`<div class="bc-card" style="border-left:4px solid #9C27B0;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                   <h4 style="color:var(--text-primary); margin:0; font-size:16px;">🏸 Hạng mục: ${cat}</h4>
                   ${canManage() ? `<button class="bc-btn small add-group-btn" data-cat="${cat}" style="background:#4CAF50; border-color:#4CAF50; color:#FFF; padding:4px 8px; font-size:12px;">+ Thêm Bảng</button>` : ''}
                </div>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:15px;">
                   ${catGroups.map(g => {
                      return `<div style="border:1px solid #E1BEE7; border-radius:8px; background:var(--card-bg); padding:10px;">
                         <div style="font-weight:bold; color:var(--text-primary); margin-bottom:10px; border-bottom:1px solid #E1BEE7; padding-bottom:5px; display:flex; justify-content:space-between; align-items:center;">
                            <span>${escapeHtml(g.name)} (${g.pairs.length} Đội)</span>
                            ${canManage() ? `<div style="display:flex; gap:4px;">
                               <button class="bc-btn small edit-group-btn" data-gid="${g.id}" style="padding:2px 6px; font-size:10px; background:transparent; border:1px solid #9C27B0; color:#9C27B0;">✏️</button>
                               <button class="bc-btn small danger del-group-btn" data-gid="${g.id}" style="padding:2px 6px; font-size:10px; background:transparent; border:1px solid #D32F2F; color:#D32F2F;">🗑️</button>
                            </div>` : ''}
                         </div>"""

if old_cat_card in html:
    html = html.replace(old_cat_card, new_cat_card)
else:
    print("WARNING: old_cat_card not found!")


# 2. Add event listeners for the new buttons
old_events = """             setTimeout(() => {
                document.querySelectorAll('.change-group-sel').forEach(sel => {
                   sel.onchange = async (e) => {
                      const pId = e.target.dataset.pid;
                      const targetGId = e.target.value;"""

new_events = """             setTimeout(() => {
                document.querySelectorAll('.add-group-btn').forEach(btn => {
                   btn.onclick = async (e) => {
                      const cat = e.target.dataset.cat;
                      const gName = prompt(`Nhập tên Bảng mới cho ${cat}:`, `Bảng Mới`);
                      if (!gName) return;
                      await mutateTournaments(tours => {
                         const tour = tours.find(t => t.id === activeTour.id);
                         if (tour) {
                            tour.groups.push({ id: 'G' + Date.now() + cat.replace(/\\s/g,''), cat, name: gName, pairs: [] });
                         }
                         return tours;
                      });
                      render();
                   };
                });
                
                document.querySelectorAll('.edit-group-btn').forEach(btn => {
                   btn.onclick = async (e) => {
                      const gId = e.currentTarget.dataset.gid;
                      const tour = state.tournaments.find(t => t.id === activeTour.id);
                      const g = tour.groups.find(x => x.id === gId);
                      if(!g) return;
                      const newName = prompt('Đổi tên bảng:', g.name);
                      if(!newName) return;
                      await mutateTournaments(tours => {
                         const t = tours.find(x => x.id === activeTour.id);
                         if (t) {
                            const group = t.groups.find(x => x.id === gId);
                            if (group) group.name = newName;
                         }
                         return tours;
                      });
                      render();
                   };
                });
                
                document.querySelectorAll('.del-group-btn').forEach(btn => {
                   btn.onclick = async (e) => {
                      const gId = e.currentTarget.dataset.gid;
                      const tour = state.tournaments.find(t => t.id === activeTour.id);
                      const g = tour.groups.find(x => x.id === gId);
                      if(!g) return;
                      if(g.pairs.length > 0) return alert('Bảng này đang chứa Đội, vui lòng chuyển các Đội sang bảng khác trước khi xóa!');
                      if(!confirm(`Xóa ${g.name}?`)) return;
                      await mutateTournaments(tours => {
                         const t = tours.find(x => x.id === activeTour.id);
                         if (t) t.groups = t.groups.filter(x => x.id !== gId);
                         return tours;
                      });
                      render();
                   };
                });

                document.querySelectorAll('.change-group-sel').forEach(sel => {
                   sel.onchange = async (e) => {
                      const pId = e.target.dataset.pid;
                      const targetGId = e.target.value;"""

if old_events in html:
    html = html.replace(old_events, new_events)
else:
    print("WARNING: old_events not found!")

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html grouping features patched")

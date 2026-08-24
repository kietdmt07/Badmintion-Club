import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Inject HTML IDs and ✏️ icons
old_html = """      <div style="display:flex; gap:14px; margin-top:10px; font-size:13px; color:#6b7a73; flex-wrap:wrap;">
        <span><span class="bc-badge" style="background:#EAF3DE; color:#27500A;">${yes.length}${s.max ? '/'+s.max : ''} tham gia</span></span>
        <span><span class="bc-badge" style="background:#E6F1FB; color:#0C447C;">${s.locked ? 'Cố định thực tế: ' + fixedPlaying : 'Cố định hiện có: ' + totalFixed}</span></span>
        <span><span class="bc-badge" style="background:#FFF2E6; color:#B25E00;">${s.locked ? 'Vãng lai thực tế: ' + casualPlaying : 'Vãng lai hiện có: ' + totalCasual}${!s.locked && s.maxCasual ? ' (Nhận tối đa ' + s.maxCasual + ')' : ''}</span></span>"""

new_html = """      <div style="display:flex; gap:14px; margin-top:10px; font-size:13px; color:#6b7a73; flex-wrap:wrap;">
        <span ${canManage() && !s.locked ? `style="cursor:pointer;" id="edit-max-${s.id}" title="Click để sửa số lượng tham gia tối đa"` : ''}><span class="bc-badge" style="background:#EAF3DE; color:#27500A;">${yes.length}${s.max ? '/'+s.max : ''} tham gia ${canManage() && !s.locked ? '✏️' : ''}</span></span>
        <span><span class="bc-badge" style="background:#E6F1FB; color:#0C447C;">${s.locked ? 'Cố định thực tế: ' + fixedPlaying : 'Cố định hiện có: ' + totalFixed}</span></span>
        <span ${canManage() && !s.locked ? `style="cursor:pointer;" id="edit-maxCasual-${s.id}" title="Click để sửa số vãng lai tối đa"` : ''}><span class="bc-badge" style="background:#FFF2E6; color:#B25E00;">${s.locked ? 'Vãng lai thực tế: ' + casualPlaying : 'Vãng lai hiện có: ' + totalCasual}${!s.locked && s.maxCasual ? ' (Nhận tối đa ' + s.maxCasual + ')' : ''} ${canManage() && !s.locked ? '✏️' : ''}</span></span>"""

html = html.replace(old_html, new_html)

# 2. Inject JS Event Listeners
old_js = """    if (canManage()) {
      const lockBtn = card.querySelector(`#lock-${s.id}`);
      lockBtn.onclick = () => { s.locked = !s.locked; saveSessions(); render(); };
      const remindBtn = card.querySelector(`#remind-vote-${s.id}`);
      if (remindBtn) {
        remindBtn.onclick = () => showRemindVoteDialog(s);
      }
    }"""

new_js = """    if (canManage()) {
      const lockBtn = card.querySelector(`#lock-${s.id}`);
      lockBtn.onclick = () => { s.locked = !s.locked; saveSessions(); render(); };
      const remindBtn = card.querySelector(`#remind-vote-${s.id}`);
      if (remindBtn) {
        remindBtn.onclick = () => showRemindVoteDialog(s);
      }
      if (!s.locked) {
        const editMaxBtn = card.querySelector(`#edit-max-${s.id}`);
        if (editMaxBtn) editMaxBtn.onclick = () => {
           const newVal = prompt('Nhập số lượng TỔNG tham gia tối đa (để trống nếu không giới hạn):', s.max || '');
           if (newVal === null) return;
           s.max = newVal ? parseInt(newVal, 10) : null;
           saveSessions();
           render();
        };

        const editMaxCasualBtn = card.querySelector(`#edit-maxCasual-${s.id}`);
        if (editMaxCasualBtn) editMaxCasualBtn.onclick = () => {
           const newVal = prompt('Nhập số VÃNG LAI tối đa (để trống nếu không giới hạn):', s.maxCasual || '');
           if (newVal === null) return;
           s.maxCasual = newVal ? parseInt(newVal, 10) : null;
           saveSessions();
           render();
        };
      }
    }"""

html = html.replace(old_js, new_js)

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html schedule edit limits patched")

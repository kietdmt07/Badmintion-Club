import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_sync = """        if (modifiedKeys.includes('bc_announcements')) state.announcements = dbMap['bc_announcements'] || [];
        
        resolveMe();"""

new_sync = """        if (modifiedKeys.includes('bc_announcements')) state.announcements = dbMap['bc_announcements'] || [];
        if (modifiedKeys.includes('bc_tournaments')) {
           state.tournaments = dbMap['bc_tournaments'] || state.settings.tournaments || [];
        }
        
        resolveMe();"""

if old_sync in html:
    html = html.replace(old_sync, new_sync)
else:
    print("WARNING: old_sync not found!")

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html patched live sync")

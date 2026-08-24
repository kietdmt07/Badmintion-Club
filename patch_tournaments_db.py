import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update loadAll to load bc_tournaments
old_load = """      state.settings.mailServer = Object.assign({
        enabled: false, host: 'smtp.gmail.com', port: 465, username: '', password: '', senderEmail: '', senderName: ''
      }, settingsRaw.mailServer || {});
      state.tournaments = state.settings.tournaments || [];"""

new_load = """      state.settings.mailServer = Object.assign({
        enabled: false, host: 'smtp.gmail.com', port: 465, username: '', password: '', senderEmail: '', senderName: ''
      }, settingsRaw.mailServer || {});
      state.tournaments = dbMap['bc_tournaments'] || state.settings.tournaments || [];"""

html = html.replace(old_load, new_load)

# Also need to fix it in refreshUnmaskedSettings maybe?
old_refresh = """        if (modifiedKeys.includes('bc_settings')) {
          const { data, error } = await sb.from('bc_data').select('value').eq('key', 'bc_settings').maybeSingle();
          if (data && data.value) {
            state.settings = Object.assign(state.settings || {}, data.value);
            state.settings.mailServer = Object.assign(state.settings.mailServer || {}, data.value.mailServer || {});
          }
        }"""
# Wait, I don't need to change refreshUnmaskedSettings for bc_tournaments unless I want live sync for it. 
# There's a checkPendingAction() and live sync channel.
# Let's check where live sync happens for bc_settings and add bc_tournaments.

# 2. Rewrite mutateTournaments
old_mutate = """  async function mutateTournaments(mutator){
    const ok = await mutateKey('bc_settings', latestSettings => {
      const updatedSettings = Object.assign({}, latestSettings || {});
      let curTours = updatedSettings.tournaments || [];
      if (!Array.isArray(curTours)) {
        if (curTours && typeof curTours === 'object' && curTours.id) {
          curTours = [curTours];
        } else {
          curTours = [];
        }
      }
      const updatedTours = mutator(curTours);
      if (updatedTours === null) return null;
      updatedSettings.tournaments = updatedTours;
      return updatedSettings;
    }, {});
    
    if (ok) {
      state.settings = ok;
      state.tournaments = state.settings.tournaments || [];
      if (!Array.isArray(state.tournaments)) {
        state.tournaments = [];
      }
      return true;
    }
    return false;
  }"""

new_mutate = """  async function mutateTournaments(mutator){
    const ok = await mutateKey('bc_tournaments', latestTours => {
      let curTours = latestTours;
      // Nếu bc_tournaments trên DB chưa có gì (hoặc mảng rỗng) nhưng bc_settings có tournaments cũ, thì migrate sang
      if (!curTours || (Array.isArray(curTours) && curTours.length === 0)) {
         if (state.settings && state.settings.tournaments && state.settings.tournaments.length > 0) {
            curTours = JSON.parse(JSON.stringify(state.settings.tournaments));
         }
      }
      if (!Array.isArray(curTours)) {
        if (curTours && typeof curTours === 'object' && curTours.id) {
          curTours = [curTours];
        } else {
          curTours = [];
        }
      }
      const updatedTours = mutator(curTours);
      if (updatedTours === null) return null;
      return updatedTours;
    }, []);
    
    if (ok) {
      state.tournaments = ok;
      if (!Array.isArray(state.tournaments)) {
        state.tournaments = [];
      }
      return true;
    }
    return false;
  }"""

html = html.replace(old_mutate, new_mutate)

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html patched mutateTournaments")

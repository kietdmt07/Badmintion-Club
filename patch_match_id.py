import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_match_gen = """                   const matches = [];
                   activeTour.groups.forEach(g => {
                      const gPairs = g.pairs;
                      for (let a = 0; a < gPairs.length; a++) {
                         for (let b = a + 1; b < gPairs.length; b++) {
                            matches.push({
                               id: 'M' + Date.now() + a + b + g.id.slice(-5),"""

new_match_gen = """                   const matches = [];
                   activeTour.groups.forEach(g => {
                      const gPairs = g.pairs;
                      for (let a = 0; a < gPairs.length; a++) {
                         for (let b = a + 1; b < gPairs.length; b++) {
                            matches.push({
                               id: uid(),"""

if old_match_gen in html:
    html = html.replace(old_match_gen, new_match_gen)
else:
    print("WARNING: old_match_gen not found!")

# There's also match generation in knockout stage. Let's check it.
old_ko_match_gen = """                      const mId = 'KO' + Date.now() + i;"""
new_ko_match_gen = """                      const mId = uid();"""
html = html.replace(old_ko_match_gen, new_ko_match_gen)


with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html match ID generation patched")

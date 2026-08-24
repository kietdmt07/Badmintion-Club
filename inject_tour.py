import sys

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = -1
for i, l in enumerate(lines):
    if 'function renderTournament()' in l:
        start = i
        break

if start == -1:
    sys.exit("renderTournament not found")

braces = 0
end = -1
for i in range(start, len(lines)):
    braces += lines[i].count('{')
    braces -= lines[i].count('}')
    if braces == 0:
        end = i
        break

with open('/Users/kietdmt/Documents/renderTournament.js', 'r', encoding='utf-8') as f:
    new_tour_code = f.read()

lines[start:end+1] = [new_tour_code + "\n"]

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)

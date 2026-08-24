import re

with open('/Users/kietdmt/Documents/v5_temp.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Text colors
js = re.sub(r'color:\s*#(333|4E342E|666|888|999|000|222)', 'color:var(--text-secondary)', js)
js = re.sub(r'color:\s*#(1565C0|0D47A1|1976D2|3F51B5|0288D1)', 'color:var(--text-primary)', js) # Blueish to primary
js = re.sub(r'color:\s*#(27500A|1B4332|4A148C|7B1FA2|8E24AA|9C27B0)', 'color:var(--text-primary)', js) # Green/Purple to primary
js = re.sub(r'color:\s*#(E65100|F57C00|FF3D00|FF6F00|F57F17|D84315|D32F2F)', 'color:#F26419', js) # Accent/Warning

# Backgrounds
js = re.sub(r'background:\s*#(FFF|FFFFFF|FAFAFA|F5F5F5|F8F9FA)', 'background:var(--card-bg)', js)
js = re.sub(r'background:\s*#(E3F2FD|E8F5E9|FFF3E0|FFF9C4|FFFDE7|FFEBEE|F3E5F5|EAF3DE)', 'background:var(--tab-bg)', js)

# Borders
js = re.sub(r'border:([^;]*)#(FFB74D|90CAF9|E3E0D6|E0E0E0|FBC02D|BBDEFB|4CAF50|9C27B0)', r'border:\1var(--card-border)', js)
js = re.sub(r'border-top:([^;]*)#(FFB74D|90CAF9|E3E0D6|E0E0E0|FBC02D|BBDEFB|4CAF50|9C27B0)', r'border-top:\1var(--card-border)', js)
js = re.sub(r'border-bottom:([^;]*)#(FFB74D|90CAF9|E3E0D6|E0E0E0|FBC02D|BBDEFB|4CAF50|9C27B0)', r'border-bottom:\1var(--card-border)', js)

# Specific cases
js = js.replace('background:var(--tab-bg); color:var(--text-primary);', 'background:var(--tab-bg); color:var(--text-primary);')
js = js.replace('background:var(--card-bg); color:var(--text-primary);', 'background:var(--card-bg); color:var(--text-primary);')

# Make inputs and selects use theme vars
js = js.replace('background:var(--tab-bg); border:1px solid var(--card-border);', 'background:var(--input-bg); border:1px solid var(--input-border); color:var(--input-color);')

with open('/Users/kietdmt/Documents/v5_temp.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("v5_temp.js theme patched successfully")

import re

with open('/Users/kietdmt/Documents/v6_temp.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. The glaring white backgrounds in Knockout
js = js.replace('background:linear-gradient(to right, #FAFAFA, #FFF);', 'background:var(--card-bg);')
js = js.replace('background:linear-gradient(to right, var(--card-bg), var(--card-bg));', 'background:var(--card-bg);')

# 2. Hardcoded text colors inside match cards (might be #333 or similar)
js = re.sub(r'color:\s*#(333|4E342E|666|888|999|000|222)', 'color:var(--text-primary)', js)

# 3. Match Card items
js = js.replace('background:#FFF', 'background:var(--card-bg)')
js = js.replace('background:#FAFAFA', 'background:var(--card-bg)')
js = js.replace('background:#F5F5F5', 'background:var(--card-bg)')

# 4. Inputs inside match cards
js = js.replace('background:#FFF9C4', 'background:var(--input-bg); color:var(--input-color)')
js = js.replace('background:#E3F2FD', 'background:var(--input-bg); color:var(--input-color)')
js = js.replace('background:#FFFDE7', 'background:var(--input-bg); color:var(--input-color)')
js = js.replace('background:#E8EAF6', 'background:var(--input-bg); color:var(--input-color)')

# Fix borders
js = re.sub(r'border([^:]*):\s*1px solid #(CCC|E0E0E0|E3E0D6|BBDEFB|90CAF9|FBC02D)', r'border\1: 1px solid var(--card-border)', js)
js = re.sub(r'border([^:]*):\s*2px solid #(CCC|E0E0E0|E3E0D6|BBDEFB|90CAF9|FBC02D)', r'border\1: 2px solid var(--card-border)', js)

with open('/Users/kietdmt/Documents/v6_temp.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("v6_temp.js theme patched 2 successfully")

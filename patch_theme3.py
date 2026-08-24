import re

with open('/Users/kietdmt/Documents/v6_temp.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the ternary operators for background
js = js.replace("background:${m.status==='finished'?'#F5F5F5':(m.status==='live'?'#FFEBEE':'#FFF')}", "background:${m.status==='finished'?'var(--tab-bg)':(m.status==='live'?'rgba(211, 47, 47, 0.1)':'var(--card-bg)')}")

# Fix the text colors in ternary
js = js.replace("color:${isP1Win?'#2E7D32':'#333'}", "color:${isP1Win?'#4CAF50':'var(--text-primary)'}")
js = js.replace("color:${isP2Win?'#2E7D32':'#333'}", "color:${isP2Win?'#4CAF50':'var(--text-primary)'}")

# In knockout, it might have spaces
js = js.replace("color:${isP1Win ? '#2E7D32' : '#333'}", "color:${isP1Win ? '#4CAF50' : 'var(--text-primary)'}")
js = js.replace("color:${isP2Win ? '#2E7D32' : '#333'}", "color:${isP2Win ? '#4CAF50' : 'var(--text-primary)'}")

with open('/Users/kietdmt/Documents/v6_temp.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("v6_temp.js theme patched 3 successfully")

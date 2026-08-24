import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix tabs inline colors
pattern = r'color:\s*\$\{is[a-zA-Z]+Tab\?\'#[0-9A-Fa-f]+\':\'(#[0-9A-Fa-f]+|var\(--text-secondary\))\'\};\s*border-bottom:\s*\$\{is[a-zA-Z]+Tab\?\'[^\']+\':\'none\'\};'
html = re.sub(pattern, '', html)

# Some might not have spaces, so we catch them too
pattern2 = r'color:\$\{is[a-zA-Z]+Tab\?\'[^\']+\':\'[^\']+\'\}; border-bottom:\$\{is[a-zA-Z]+Tab\?\'[^\']+\':\'none\'\};'
html = re.sub(pattern2, '', html)

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html tabs patched successfully")

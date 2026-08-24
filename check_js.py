import subprocess
with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

js_parts = html.split('<script>')
if len(js_parts) > 1:
    js = js_parts[1].split('</script>')[0]
    with open('/Users/kietdmt/Documents/temp.js', 'w', encoding='utf-8') as f:
        f.write(js)
    try:
        res = subprocess.run(['/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Resources/jsc', '-e', 'checkSyntax("/Users/kietdmt/Documents/temp.js")'], capture_output=True, text=True)
        print("Syntax check output:", res.stdout)
        print("Errors:", res.stderr)
    except Exception as e:
        print("Error running jsc", e)

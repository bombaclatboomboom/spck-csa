import re, glob, collections

css = ""
for f in glob.glob('static/css/*.css'):
    css += open(f, encoding='utf-8', errors='ignore').read()
inline = ""
for f in glob.glob('templates/**/*.html', recursive=True):
    inline += " ".join(re.findall(r'<style[^>]*>(.*?)</style>', open(f, encoding='utf-8').read(), re.S))
allcss = re.sub(r'/\*.*?\*/', '', css + inline, flags=re.S)

# 1) CSS variables used but never defined
defined = set(re.findall(r'(--[\w-]+)\s*:', allcss))
used = collections.Counter(re.findall(r'var\(\s*(--[\w-]+)', allcss))
for f in glob.glob('templates/**/*.html', recursive=True):
    used.update(re.findall(r'var\(\s*(--[\w-]+)', open(f, encoding='utf-8').read()))
missing = {v: c for v, c in used.items() if v not in defined}
print("UNDEFINED CSS VARIABLES:", len(missing), missing)

# 2) classes used in templates but never defined in any CSS
defcls = set(re.findall(r'\.([A-Za-z_][\w-]*)', allcss))
bad = collections.defaultdict(set)
for f in glob.glob('templates/**/*.html', recursive=True):
    t = re.sub(r'<style.*?</style>|<script.*?</script>', '', open(f, encoding='utf-8').read(), flags=re.S)
    for m in re.finditer(r'class="([^"{%]*)"', t):
        for c in m.group(1).split():
            if c not in defcls:
                bad[f].add(c)
print("UNDEFINED CLASSES:", sum(len(v) for v in bad.values()))
for f, v in bad.items():
    print(" ", f, sorted(v))

# 3) shared classes defined only in one page's inline <style> but used on other pages
print("Also check: no class used on 2+ pages may live only in a page-level <style>.")

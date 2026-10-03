import os
import re

os.makedirs("Dashboard new/calendar", exist_ok=True)

# 1. Extract JS
with open("Dashboard new/app.js", "r") as f:
    app_js = f.read()

# Match from /* ── Calendar Picker Component ── */ up to just before const app = {data:null...
cal_match = re.search(r'/\*\s*──\s*Calendar Picker Component\s*──\s*\*/.*?(?=\nconst app = {)', app_js, flags=re.DOTALL)
if cal_match:
    calendar_js = cal_match.group(0)
    # Remove it from app.js
    new_app_js = app_js[:cal_match.start()] + app_js[cal_match.end():]
    with open("Dashboard new/app.js", "w") as f:
        f.write(new_app_js)
    with open("Dashboard new/calendar/calendar.js", "w") as f:
        f.write(calendar_js)
    print("Extracted calendar.js")
else:
    print("Could not find calendar JS block")

# 2. Extract CSS
with open("Dashboard new/styles.css", "r") as f:
    styles_css = f.read()

# Find the calendar CSS block. It seems to start with .cal-dropdown or /* Calendar */
# Let's search for .cal-dropdown...
cal_css_match = re.search(r'\.cal-dropdown.*?\.cal-day\[aria-disabled="true"\]\{color:#a8c1df;pointer-events:none\}', styles_css, flags=re.DOTALL)
if cal_css_match:
    calendar_css = cal_css_match.group(0)
    new_styles_css = styles_css[:cal_css_match.start()] + styles_css[cal_css_match.end():]
    with open("Dashboard new/styles.css", "w") as f:
        f.write(new_styles_css)
    with open("Dashboard new/calendar/calendar.css", "w") as f:
        f.write(calendar_css)
    print("Extracted calendar.css")
else:
    # Try a broader match if the specific end rule changed
    cal_css_match2 = re.search(r'\.cal-dropdown.*?(?=\n\n|\n[a-zA-Z\.#][^\{]+\{)', styles_css, flags=re.DOTALL)
    if cal_css_match2:
         # Need to be careful. Let's just grep all .cal- rules
         cal_rules = re.findall(r'\.cal-[^\{]+\{[^\}]+\}', styles_css)
         if cal_rules:
             calendar_css = "\n".join(cal_rules)
             for rule in cal_rules:
                 styles_css = styles_css.replace(rule, "")
             with open("Dashboard new/styles.css", "w") as f:
                 f.write(styles_css)
             with open("Dashboard new/calendar/calendar.css", "w") as f:
                 f.write(calendar_css)
             print("Extracted calendar.css (using fallback regex)")
         else:
             print("Could not find calendar CSS")

# 3. Update build.py
with open("/Users/admin/.gemini/antigravity/scratch/build.py", "r") as f:
    build_py = f.read()

# Add calendar CSS read
build_py = build_py.replace(
    'mobile_css = ""',
    'calendar_css = ""\nif os.path.exists(os.path.join(base, "calendar/calendar.css")):\n    with open(os.path.join(base, "calendar/calendar.css")) as f:\n        calendar_css = f.read()\n\nmobile_css = ""'
)

# Add calendar CSS inject
build_py = build_py.replace(
    'if mobile_css:\n    html = re.sub(r\'<link[^>]*href=[\\"\\\']mobile\\.css[\\"\\\'][^>]*>\', f\'<style>\\n{mobile_css}\\n</style>\', html)',
    'if calendar_css:\n    html = re.sub(r\'<link[^>]*href=[\\"\\\']calendar/calendar\\.css[\\"\\\'][^>]*>\', f\'<style>\\n{calendar_css}\\n</style>\', html)\nif mobile_css:\n    html = re.sub(r\'<link[^>]*href=[\\"\\\']mobile\\.css[\\"\\\'][^>]*>\', f\'<style>\\n{mobile_css}\\n</style>\', html)'
)

# Add calendar JS read
build_py = build_py.replace(
    'mobile_js = ""',
    'calendar_js = ""\nif os.path.exists(os.path.join(base, "calendar/calendar.js")):\n    with open(os.path.join(base, "calendar/calendar.js")) as f:\n        calendar_js = f.read()\n\nmobile_js = ""'
)

# Add calendar JS inject
build_py = build_py.replace(
    '{mobile_js}',
    '{calendar_js}\n{mobile_js}'
)

# Remove script tags from output
build_py = build_py.replace(
    '|task-workspace\\.js|hub-access\\.js',
    '|task-workspace\\.js|hub-access\\.js|calendar/calendar\\.js'
)

with open("/Users/admin/.gemini/antigravity/scratch/build.py", "w") as f:
    f.write(build_py)
print("Updated build.py")

# 4. Update index.html
with open("Dashboard new/index.html", "r") as f:
    idx = f.read()

idx = idx.replace('<script src="app.js"></script>', '<script src="calendar/calendar.js"></script>\n<script src="app.js"></script>')
idx = idx.replace('<link rel="stylesheet" href="styles.css">', '<link rel="stylesheet" href="styles.css">\n<link rel="stylesheet" href="calendar/calendar.css">')

with open("Dashboard new/index.html", "w") as f:
    f.write(idx)
print("Updated index.html")

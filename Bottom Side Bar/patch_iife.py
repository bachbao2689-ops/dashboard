import re

with open("Deploy/ManagerApp.user.html", "r") as f:
    html = f.read()

# The IIFE starts with `(function(){` and ends with `})();`
iife_match = re.search(r'\(function\(\)\{\s*if\(\$\(\'login-gate\'\)\)return;.*?\}\)\(\);', html, flags=re.DOTALL)
if not iife_match:
    print("Could not find IIFE in ManagerApp.user.html")
    exit(1)
user_iife = iife_match.group(0)

with open("Dashboard new/app.js", "r") as f:
    app_js = f.read()

old_iife_match = re.search(r'\(function\(\)\{\s*if\(\$\(\'login-gate\'\)\)return;.*?\}\)\(\);', app_js, flags=re.DOTALL)
if not old_iife_match:
    print("Could not find IIFE in app.js")
    exit(1)

new_app_js = app_js[:old_iife_match.start()] + user_iife + app_js[old_iife_match.end():]

with open("Dashboard new/app.js", "w") as f:
    f.write(new_app_js)

print("Updated IIFE in app.js")

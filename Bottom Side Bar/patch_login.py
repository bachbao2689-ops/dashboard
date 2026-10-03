import re

with open("Deploy/ManagerApp.user.html", "r") as f:
    html = f.read()

# Extract from function loginRemembered to initLoginGate();
login_match = re.search(r'function loginRemembered\(\).*?initLoginGate\(\);', html, flags=re.DOTALL)
if not login_match:
    print("Could not find login logic in ManagerApp.user.html")
    exit(1)
user_login = login_match.group(0)

with open("Dashboard new/app.js", "r") as f:
    app_js = f.read()

old_iife_match = re.search(r'\(function\(\)\{\s*if\(\$\(\'login-gate\'\)\)return;.*?\}\)\(\);', app_js, flags=re.DOTALL)
if not old_iife_match:
    print("Could not find IIFE in app.js")
    exit(1)

new_app_js = app_js[:old_iife_match.start()] + user_login + app_js[old_iife_match.end():]

with open("Dashboard new/app.js", "w") as f:
    f.write(new_app_js)

print("Updated login logic in app.js")

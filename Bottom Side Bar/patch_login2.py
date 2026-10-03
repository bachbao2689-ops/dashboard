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

# Find the block in app.js
old_login_match = re.search(r'function loginRemembered\(\).*?initLoginGate\(\);', app_js, flags=re.DOTALL)
if not old_login_match:
    print("Could not find old login logic in app.js")
    # let's try just initLoginGate
    old_login_match = re.search(r'function initLoginGate\(\).*?initLoginGate\(\);', app_js, flags=re.DOTALL)
    if not old_login_match:
        print("Still could not find it.")
        exit(1)

new_app_js = app_js[:old_login_match.start()] + user_login + app_js[old_login_match.end():]

with open("Dashboard new/app.js", "w") as f:
    f.write(new_app_js)

print("Updated login logic in app.js")

import re

with open("Deploy/ManagerApp.user.html", "r") as f:
    html = f.read()

# find login-card inside ManagerApp.user.html
match = re.search(r'<div class="login-card">.*?</div>\s*</form>\s*</div>', html, flags=re.DOTALL)
if match:
    user_login_card = match.group(0)
    
    with open("Dashboard new/index.html", "r") as f:
        idx = f.read()
    
    old_match = re.search(r'<div class="login-card">.*?</div>\s*</form>\s*</div>', idx, flags=re.DOTALL)
    if old_match:
        new_idx = idx[:old_match.start()] + user_login_card + idx[old_match.end():]
        with open("Dashboard new/index.html", "w") as f:
            f.write(new_idx)
        print("Updated login-card in index.html")
    else:
        print("Could not find login-card in index.html")
        # Maybe it's in app.js? Yes, initLoginGate generates it dynamically!
        with open("Dashboard new/app.js", "r") as f:
            app_js = f.read()
        old_match = re.search(r'<div class="login-card">.*?</div>\s*</form>\s*</div>', app_js, flags=re.DOTALL)
        if old_match:
            new_app = app_js[:old_match.start()] + user_login_card + app_js[old_match.end():]
            with open("Dashboard new/app.js", "w") as f:
                f.write(new_app)
            print("Updated login-card in app.js")
        else:
            print("Could not find login-card in app.js either")

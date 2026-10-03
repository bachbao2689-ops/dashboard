import re

with open("Deploy/ManagerApp.user.html", "r") as f:
    html = f.read()

# Extract full CSS
css_match = re.search(r'<style>\s*(.*?)\s*</style>', html, flags=re.DOTALL)
if css_match:
    full_css = css_match.group(1)
    
    # We want to extract just the new rules added by the user.
    # The new rules in the diff were mostly related to `.login-` and `.activity-panel` etc.
    # Let's just find the login-gate.login-existing block
    login_css_match = re.search(r'\.login-gate\.login-existing.*?(?=@media\(max-width:600px\)\{\.login-gate\{padding:10px!important\}).*?\}', full_css, flags=re.DOTALL)
    
    if login_css_match:
        added_login_css = login_css_match.group(0)
        with open("Dashboard new/styles.css", "a") as f:
            f.write("\n" + added_login_css + "\n")
        print("Appended login CSS to styles.css")

    # Extract the other block
    right_stack_match = re.search(r'\.right-stack\{gap:14px;.*?(?=\})\}', full_css, flags=re.DOTALL)
    if right_stack_match:
        with open("Dashboard new/styles.css", "a") as f:
            f.write("\n" + right_stack_match.group(0) + "\n")
        print("Appended right-stack CSS to styles.css")

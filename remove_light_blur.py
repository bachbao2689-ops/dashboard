import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

# Pattern to match the light mode drawer styles and remove background-image
pattern_campaign = r'(\.shadow-drawer-campaign\s*\{[^}]*)background-image:\s*radial-gradient[^;]+;\s*'
css = re.sub(pattern_campaign, r'\1', css)

pattern_project = r'(\.shadow-drawer-project\s*\{[^}]*)background-image:\s*radial-gradient[^;]+;\s*'
css = re.sub(pattern_project, r'\1', css)

pattern_task = r'(\.shadow-drawer-task\s*\{[^}]*)background-image:\s*radial-gradient[^;]+;\s*'
css = re.sub(pattern_task, r'\1', css)

pattern_subtask = r'(\.shadow-drawer-subtask\s*\{[^}]*)background-image:\s*radial-gradient[^;]+;\s*'
css = re.sub(pattern_subtask, r'\1', css)

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

print("Removed light mode background blur")

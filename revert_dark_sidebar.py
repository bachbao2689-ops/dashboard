import re
with open('Dev/src/styles/theme.css', 'r') as f:
    content = f.read()

# Restore .dark .sidebar-link-active
pattern_active = re.compile(r'\.dark \.sidebar-link-active \{.*?\}')
original_active = ".dark .sidebar-link-active { color: #85df7d; background: linear-gradient(105deg, #4eb64824, #4eb64808); border-color: #4eb64865; box-shadow: inset 0 1px 0 #adf1a610, 0 4px 16px #0002; }"
content = pattern_active.sub(original_active, content)

# Restore .dark .sidebar-link-active::before
pattern_before = re.compile(r'\.dark \.sidebar-link-active::before \{.*?\}')
original_before = ".dark .sidebar-link-active::before { content: ''; position: absolute; left: 0; top: 25%; bottom: 25%; width: 3px; border-radius: 4px; background: #4eb648; }"
content = pattern_before.sub(original_before, content)

with open('Dev/src/styles/theme.css', 'w') as f:
    f.write(content)

print("Reverted dark mode sidebar active style")

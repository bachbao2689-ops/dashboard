import re
with open('Dev/src/styles/theme.css', 'r') as f:
    content = f.read()

# Revert and fix properly
content = re.sub(r'(\.dark \.sidebar-link-active\s*\{[^}]*background:\s*)#ffffff(;)', r'\g<1>transparent\2', content)

with open('Dev/src/styles/theme.css', 'w') as f:
    f.write(content)

print("sidebar background fixed")

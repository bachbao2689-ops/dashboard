import re
with open('Dev/src/styles/theme.css', 'r') as f:
    content = f.read()

# Update light mode
content = re.sub(
    r'(\.sidebar-link-active\s*\{[^}]*background:\s*)color-mix[^;]+(;)',
    r'\g<1>#ffffff\2',
    content
)

# Update dark mode
content = re.sub(
    r'(\.dark \.sidebar-link-active\s*\{[^}]*background:\s*)color-mix[^;]+(;)',
    r'\g<1>transparent\2',
    content
)

with open('Dev/src/styles/theme.css', 'w') as f:
    f.write(content)

print("sidebar background updated")

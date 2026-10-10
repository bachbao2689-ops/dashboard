import re
with open('Dev/src/styles/theme.css', 'r') as f:
    content = f.read()

# Fix dark mode sidebar-link-active
pattern = re.compile(r'\.dark \.sidebar-link-active\s*\{[^}]+\}')
new_dark = """.dark .sidebar-link-active { color: #60a5fa; background: color-mix(in srgb, #60a5fa 12%, transparent); border-color: color-mix(in srgb, #60a5fa 40%, transparent); box-shadow: none; }"""

content = pattern.sub(new_dark, content)

# Also fix the before pseudo-element which was green (#4eb648)
content = re.sub(r'(\.dark \.sidebar-link-active::before\s*\{.*?background:\s*)#4eb648(;.*?})', r'\g<1>#60a5fa\2', content)

with open('Dev/src/styles/theme.css', 'w') as f:
    f.write(content)

print("fixed theme.css dark mode")

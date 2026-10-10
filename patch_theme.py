import re
with open('Dev/src/styles/theme.css', 'r') as f:
    content = f.read()

# Replace sidebar-link-active for light mode
pattern = re.compile(r'\.sidebar-link-active\s*\{[^}]+\}')
new_active = """.sidebar-link-active {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  border-color: var(--color-primary);
  box-shadow: none;
}"""

content = pattern.sub(new_active, content)

with open('Dev/src/styles/theme.css', 'w') as f:
    f.write(content)

print("theme.css updated")

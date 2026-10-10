import re

# Update index.css to contain typography rules in dark mode
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

css = css.replace('html.dark .btn-add-new-dark {\n  background: rgb(0,140,255);', 'html.dark .btn-add-new-dark {\n  background: rgb(0,140,255);\n  text-transform: uppercase;\n  letter-spacing: 2px;\n  font-weight: 700;')

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

# Update Projects.tsx to remove utility classes
with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

content = content.replace('btn-add-new-light btn-add-new-dark uppercase tracking-wide font-bold', 'btn-add-new-light btn-add-new-dark')

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

print("fixed dark button typography")

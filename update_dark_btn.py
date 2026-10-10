import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

dark_btn_css = """
html.dark .btn-add-new-dark {
  background: rgb(0,140,255);
  box-shadow: 0 0 25px rgb(0,140,255);
  color: #fff;
  transition: box-shadow 0.5s ease;
  border: none;
}

html.dark .btn-add-new-dark:hover {
  box-shadow: 0 0 5px rgb(0,140,255),
              0 0 25px rgb(0,140,255),
              0 0 50px rgb(0,140,255),
              0 0 100px rgb(0,140,255);
}
"""

if "btn-add-new-dark" not in css:
    css += "\n" + dark_btn_css

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'btn-add-new-light dark:bg-[#002e6d] dark:hover:bg-[#001f4d]',
    'btn-add-new-light btn-add-new-dark uppercase tracking-wide font-bold'
)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

print("updated dark button")

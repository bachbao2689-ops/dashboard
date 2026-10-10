import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

base_css = """
.hover-row-effect {
  outline: 1px solid transparent !important;
}
"""

# inject right before html:not(.dark) .hover-row-effect:hover
css = css.replace("html:not(.dark) .hover-row-effect:hover {", base_css + "\nhtml:not(.dark) .hover-row-effect:hover {")

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

print("added base hover row effect")

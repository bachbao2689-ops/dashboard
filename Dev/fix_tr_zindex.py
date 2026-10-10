import re
with open('src/index.css', 'r') as f:
    css = f.read()

css = css.replace("transform: scale(1); /* Forces a stacking context so shadow renders above other rows */", "transform: scale(1);\n  position: relative;")

with open('src/index.css', 'w') as f:
    f.write(css)

print("fixed z-index")

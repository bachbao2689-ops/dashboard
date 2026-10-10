import re
with open('src/index.css', 'r') as f:
    css = f.read()

css = css.replace('@apply bg-primary rounded-xl hover:bg-primary/90;', '@apply bg-primary rounded-xl;\n}\nhtml.dark .btn-new-task:hover {\n  @apply bg-primary/90;')

with open('src/index.css', 'w') as f:
    f.write(css)

print("fixed apply")

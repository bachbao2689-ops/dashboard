import re
with open('src/index.css', 'r') as f:
    css = f.read()

css = css.replace("border-color: #dbeafe; text-primary shadow-md transition-[opacity,transform] duration-300 md:left-[calc(50%+136px)] motion-reduce:transition-none;", "border-color: #dbeafe;\n  @apply text-primary shadow-md transition-[opacity,transform] duration-300 md:left-[calc(50%+136px)] motion-reduce:transition-none;")

with open('src/index.css', 'w') as f:
    f.write(css)

print("fixed syntax")

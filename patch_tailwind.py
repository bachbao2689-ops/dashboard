import re
with open('Dev/tailwind.config.js', 'r') as f:
    content = f.read()

content = re.sub(r"800:\s*'#093570'", "800: '#00204c'", content)
content = re.sub(r"900:\s*'#093570'", "900: '#00204c'", content)

with open('Dev/tailwind.config.js', 'w') as f:
    f.write(content)

print("tailwind config updated")

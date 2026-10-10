import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

# Replace all rules inside the new buttons with !important
def add_important(match):
    block = match.group(1)
    new_block = re.sub(r'([^;]+);', r'\1 !important;', block)
    return match.group(0).replace(block, new_block)

css = re.sub(r'html:not\(\.dark\) \.btn-add-new-light \{([^}]+)\}', add_important, css)
css = re.sub(r'html:not\(\.dark\) \.btn-add-new-light:hover \{([^}]+)\}', add_important, css)
css = re.sub(r'html:not\(\.dark\) \.btn-add-new-light:active \{([^}]+)\}', add_important, css)

css = re.sub(r'html\.dark \.btn-add-new-dark \{([^}]+)\}', add_important, css)
css = re.sub(r'html\.dark \.btn-add-new-dark:hover \{([^}]+)\}', add_important, css)

css = re.sub(r'html:not\(\.dark\) \.btn-new-task-light \{([^}]+)\}', add_important, css)
css = re.sub(r'html:not\(\.dark\) \.btn-new-task-light:hover \{([^}]+)\}', add_important, css)
css = re.sub(r'html:not\(\.dark\) \.btn-new-task-light:active \{([^}]+)\}', add_important, css)

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

print("forced !important")

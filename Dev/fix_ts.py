with open('src/pages/Projects.tsx', 'r') as f:
    content = f.read()

content = content.replace("department_id?: string | null };", "department_id?: string | null; lead_id?: number | null };")

with open('src/pages/Projects.tsx', 'w') as f:
    f.write(content)

print("fixed ts")

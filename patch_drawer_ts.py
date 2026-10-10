import re
with open('Dev/src/components/features/assets/BorrowDrawer.tsx', 'r') as f:
    c = f.read()

# 1. Remove useWindowSize import and usage
c = c.replace("import { useWindowSize } from '../../../hooks/useWindowSize';\n", "")
c = c.replace("const { width: windowWidth } = useWindowSize();\n  const width = windowWidth < 768 ? windowWidth : 480;", "const width = window.innerWidth < 768 ? window.innerWidth : 480;")

# 2. Fix Avatar src
c = c.replace("src={profile?.avatar_url}", "src={profile?.avatar_url || undefined}")

# 3. Fix profile department
c = c.replace("profile?.department?.name || '---'", "profile?.department_id || '---'")

with open('Dev/src/components/features/assets/BorrowDrawer.tsx', 'w') as f:
    f.write(c)

print("Fixed BorrowDrawer TS errors")

import re
with open('Dev/src/components/common/FilterPanel.tsx', 'r') as f:
    content = f.read()

# Add useEffect to reset localFilters when isOpen changes
content = content.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';")
content = content.replace("const [localFilters, setLocalFilters] = useState(filters);", "const [localFilters, setLocalFilters] = useState(filters);\n  useEffect(() => {\n    if (isOpen) setLocalFilters(filters);\n  }, [isOpen, filters]);")

with open('Dev/src/components/common/FilterPanel.tsx', 'w') as f:
    f.write(content)

print("fixed filter panel state")

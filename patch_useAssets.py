import re

with open('Dev/src/hooks/useAssets.ts', 'r') as f:
    content = f.read()

# Add borrow_requests to select
content = content.replace(
    'category:category_id(name, icon)',
    'category:category_id(name, icon),\n          borrow_requests(id, due_date, approval_status, requester:requester_id(name, avatar_url))'
)

# Add mapping logic
mapped_logic = """
      const mappedData = (data as any[]).map(asset => {
        // Find active borrow request
        const activeRequest = asset.borrow_requests?.find((r: any) => r.approval_status === 'approved' || r.approval_status === 'active' || r.approval_status === 'borrowed') || asset.borrow_requests?.find((r: any) => r.approval_status === 'pending');
        return {
          ...asset,
          current_borrower: activeRequest ? { name: activeRequest.requester?.name || 'Unknown' } : null,
          due_date: activeRequest ? activeRequest.due_date : null
        };
      });
      setAssets(mappedData as any);
"""
content = re.sub(r'setAssets\(data as any\);', mapped_logic, content)

with open('Dev/src/hooks/useAssets.ts', 'w') as f:
    f.write(content)
print("patched useAssets")

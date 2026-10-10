import re
with open('Dev/src/pages/AssetInventory.tsx', 'r') as f:
    c = f.read()

# Add Cart state and Drawer state
c = c.replace(
    'const { assets, loading, refetch } = useAssets();',
    'const { assets, loading, refetch } = useAssets();\n  const [cart, setCart] = useState<any[]>([]);\n  const [isBorrowDrawerOpen, setIsBorrowDrawerOpen] = useState(false);\n  const [bounce, setBounce] = useState(false);\n\n  const toggleCart = (asset: any) => {\n    if (asset.status !== "available" && !cart.find(a => a.id === asset.id)) return;\n    if (cart.find(a => a.id === asset.id)) {\n      setCart(cart.filter(a => a.id !== asset.id));\n    } else {\n      setCart([...cart, asset]);\n      setBounce(true);\n      setTimeout(() => setBounce(false), 300);\n    }\n  };\n'
)

# Replace "Add Asset" button area with Cart + Add Asset
btn_area = """
          <button onClick={() => setIsBorrowDrawerOpen(true)} className={`relative flex items-center gap-1 sm:gap-2 h-8 sm:h-10 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-sm ${bounce ? '-translate-y-1' : ''}`}>
            <Box size={18} /> <span className="hidden sm:inline">Mượn thiết bị</span>
            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-bounce-short">{cart.length}</span>}
          </button>
          <button onClick={handleNewAsset} className="flex items-center gap-1 sm:gap-2 h-8 sm:h-10 px-3 sm:px-4 bg-[#002e6d] flex-shrink-0 hover:bg-[#001f4d] text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
            <Plus size={18} /> <span className="hidden sm:inline">Add Asset</span>
          </button>
"""
c = re.sub(r'<button onClick=\{handleNewAsset\} className="flex items-center gap-1 sm:gap-2 h-8 sm:h-8 sm:h-10 px-3 sm:px-4 bg-\[#002e6d\] flex-shrink-0 hover:bg-\[#001f4d\] text-white rounded-xl text-sm font-semibold transition-all shadow-sm">.*?<\/button>', btn_area, c, flags=re.DOTALL)

# Add headers for Borrower and Due Date, and rename Actions -> Request
thead = """
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset Code</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Condition</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Người mượn</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hạn trả</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trạng thái / Yêu cầu</th>
              </tr>
"""
c = re.sub(r'<tr className="border-b border-gray-100 dark:border-slate-700">.*?</tr>', thead, c, flags=re.DOTALL)

# Modify the rows to include the new columns and the Action column logic
tbody_row = """
                    <td className="p-4">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md border border-gray-200 dark:border-slate-600">{asset.asset_code}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
                          {getIcon(asset.category?.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{asset.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{asset.category?.name || 'Uncategorized'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{asset.condition || 'N/A'}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{asset.location || 'N/A'}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {(asset as any).current_borrower?.name ? <span className="font-semibold text-primary">{(asset as any).current_borrower.name}</span> : <span className="text-gray-400">---</span>}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {(asset as any).due_date ? <span className="font-medium text-red-500">{new Date((asset as any).due_date).toLocaleDateString('vi-VN')}</span> : <span className="text-gray-400">---</span>}
                    </td>
                    <td className="p-4">
                      {(() => {
                        const inCart = cart.find(a => a.id === asset.id);
                        if (inCart) {
                          return (
                            <button onClick={(e) => { e.stopPropagation(); toggleCart(asset); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-white shadow-sm transition-all hover:bg-emerald-600">
                              Đang trong giỏ
                            </button>
                          );
                        }
                        if (asset.status === 'borrowed') {
                          return (
                            <button disabled className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-400 text-black shadow-sm opacity-90">
                              Đang mượn
                            </button>
                          );
                        }
                        if (asset.status === 'maintenance') {
                          return (
                            <button disabled className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500 text-white shadow-sm opacity-90">
                              Bảo trì
                            </button>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); toggleCart(asset); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                              Mượn thiết bị
                            </button>
                          </div>
                        );
                      })()}
                    </td>
"""
c = re.sub(r'<td className="p-4">.*?<span className="font-mono.*?<td className="p-4">.*?<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">.*?</td>', tbody_row, c, flags=re.DOTALL)

# Wait, the Regex match might fail. Let's do it properly.

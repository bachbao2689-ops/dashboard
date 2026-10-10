with open('Dev/src/pages/AssetInventory.tsx', 'r') as f:
    c = f.read()

# I will replace the exact row block inside filteredAssets.map
start_str = "                  <tr key={asset.id} onClick={() => setSelectedAsset(asset)} className=\"hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer\">"
end_str = "                  </tr>\n                ))\n              )}\n            </tbody>\n          </table>\n        </div>\n      </div>"
idx1 = c.find(start_str)
idx2 = c.find(end_str)

if idx1 != -1 and idx2 != -1:
    old_row = c[idx1:idx2]
    new_row = """                  <tr key={asset.id} onClick={() => setSelectedAsset(asset)} className="hover-row-effect hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer">
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
                        if (asset.status === 'maintenance' || asset.status === 'broken') {
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
    c = c.replace(old_row, new_row)
    with open('Dev/src/pages/AssetInventory.tsx', 'w') as f:
        f.write(c)
    print("Patched Row.")
else:
    print("Could not find row block")

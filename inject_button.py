import re
with open('Dev/src/pages/AssetInventory.tsx', 'r') as f:
    c = f.read()

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
with open('Dev/src/pages/AssetInventory.tsx', 'w') as f:
    f.write(c)
print("Injected button")

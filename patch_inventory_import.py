with open('Dev/src/pages/AssetInventory.tsx', 'r') as f:
    c = f.read()

# Add import
c = c.replace(
    "import { AssetQRCodeModal } from '../components/features/assets/AssetQRCodeModal';",
    "import { AssetQRCodeModal } from '../components/features/assets/AssetQRCodeModal';\nimport { BorrowDrawer } from '../components/features/assets/BorrowDrawer';"
)

# Add component
c = c.replace(
    "<AssetDetailPanel asset={selectedAsset} isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)} />",
    "<AssetDetailPanel asset={selectedAsset} isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)} />\n      <BorrowDrawer isOpen={isBorrowDrawerOpen} onClose={() => setIsBorrowDrawerOpen(false)} cartAssets={cart} setCartAssets={setCart} onSuccess={() => { setCart([]); refetch(); }} />"
)

with open('Dev/src/pages/AssetInventory.tsx', 'w') as f:
    f.write(c)

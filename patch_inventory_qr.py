with open('Dev/src/pages/AssetInventory.tsx', 'r') as f:
    c = f.read()

c = c.replace(
    '<AssetDetailPanel asset={selectedAsset} isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)} />',
    '<AssetDetailPanel asset={selectedAsset} isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)} onOpenQR={() => setQrAsset(selectedAsset)} />'
)

with open('Dev/src/pages/AssetInventory.tsx', 'w') as f:
    f.write(c)
print("Patched Inventory QR")

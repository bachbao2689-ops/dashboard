with open('Dev/src/components/features/assets/AssetDetailPanel.tsx', 'r') as f:
    c = f.read()

# Add QrCode icon import if missing
if 'QrCode' not in c:
    c = c.replace('import { X, Box,', 'import { X, Box, QrCode,')

# Add onOpenQR prop
c = c.replace(
    'interface AssetDetailPanelProps {\n  asset: any | null;\n  isOpen: boolean;\n  onClose: () => void;\n}',
    'interface AssetDetailPanelProps {\n  asset: any | null;\n  isOpen: boolean;\n  onClose: () => void;\n  onOpenQR?: () => void;\n}'
)
c = c.replace(
    'export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({ asset, isOpen, onClose }) => {',
    'export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({ asset, isOpen, onClose, onOpenQR }) => {'
)

# Add button
qr_btn = """
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{asset.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{asset.asset_code}</p>
                      <button onClick={onOpenQR} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors text-primary" title="View QR Code">
                        <QrCode size={14} />
                      </button>
                    </div>
                  </div>
"""
c = c.replace("""
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{asset.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{asset.asset_code}</p>
                  </div>
""", qr_btn)

with open('Dev/src/components/features/assets/AssetDetailPanel.tsx', 'w') as f:
    f.write(c)
print("Patched AssetDetailPanel QR")

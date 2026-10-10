with open('Dev/src/pages/AssetInventory.tsx', 'r') as f:
    c = f.read()

find_str = "const { assets, loading, refetch } = useAssets();"
insert_str = """
  const [cart, setCart] = useState<any[]>([]);
  const [isBorrowDrawerOpen, setIsBorrowDrawerOpen] = useState(false);
  const [bounce, setBounce] = useState(false);

  const toggleCart = (asset: any) => {
    if (asset.status !== "available" && !cart.find(a => a.id === asset.id)) return;
    if (cart.find(a => a.id === asset.id)) {
      setCart(cart.filter(a => a.id !== asset.id));
    } else {
      setCart([...cart, asset]);
      setBounce(true);
      setTimeout(() => setBounce(false), 300);
    }
  };
"""

if find_str in c:
    c = c.replace(find_str, find_str + "\n" + insert_str)
    with open('Dev/src/pages/AssetInventory.tsx', 'w') as f:
        f.write(c)
    print("Injected state")
else:
    print("Could not find string")

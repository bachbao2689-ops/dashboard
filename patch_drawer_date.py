with open('Dev/src/components/features/assets/BorrowDrawer.tsx', 'r') as f:
    c = f.read()

effect = """
  useEffect(() => {
    if (isOpen) {
      setBorrowDate(new Date().toLocaleDateString('vi-VN')); // auto fill current date
    }
  }, [isOpen]);

  useEffect(() => {
    const dueEl = document.getElementById('borrow-due-date-input');
    const handleDueChange = (e: any) => setDueDate(e.target.value);
    dueEl?.addEventListener('change', handleDueChange);
    return () => dueEl?.removeEventListener('change', handleDueChange);
  }, []);
"""
c = c.replace("""
  useEffect(() => {
    if (isOpen) {
      setBorrowDate(new Date().toLocaleDateString('vi-VN')); // auto fill current date
    }
  }, [isOpen]);
""", effect)

with open('Dev/src/components/features/assets/BorrowDrawer.tsx', 'w') as f:
    f.write(c)

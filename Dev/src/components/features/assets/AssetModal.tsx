import toast from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { supabase } from '../../../services/supabase';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssetModal: React.FC<AssetModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [assetCode, setAssetCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [condition, setCondition] = useState('Tốt 100%');
  const [location, setLocation] = useState('Kho Công Ty');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [description, setDescription] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) fetchCategories();
  }, [isOpen]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('asset_categories').select('*');
    if (data && data.length > 0) {
      setCategories(data);
    } else {
      setCategories([
        { id: '1', name: 'Laptop' },
        { id: '2', name: 'Camera' },
        { id: '3', name: 'Lens' },
        { id: '4', name: 'Equipment' }
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !assetCode || !categoryId) return;
    
    setLoading(true);
    try {
      const { data: wsData } = await supabase.from('workspaces').select('id, owner_id').limit(1).single();
      if (!wsData) throw new Error("No workspace");

      let validCatId = null;
      if (categoryId.length > 10) validCatId = categoryId; // uuid check

      await supabase.from('assets').insert([{
         asset_code: assetCode.toUpperCase(),
         name,
         category_id: validCatId,
         condition,
         location,
         purchase_date: purchaseDate || null,
         purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
         serial_number: serialNumber || null,
         description: description || null,
         status: 'available',
         workspace_id: wsData.id,
         added_by: wsData.owner_id
      }]);
      
      onSuccess();
      toast.success('Asset created successfully');
      onClose();
      // Reset
      setAssetCode('');
      setName('');
      setCategoryId('');
      setCondition('Tốt 100%');
      setLocation('Kho Công Ty');
      setPurchaseDate('');
      setPurchasePrice('');
      setSerialNumber('');
      setDescription('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Asset">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Code <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required
              pattern="^[A-Za-z0-9]{6,20}$"
              title="6-20 alphanumeric characters"
              value={assetCode}
              onChange={e => setAssetCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
              placeholder="e.g. LENCANON01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Lens Canon 24-70mm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category <span className="text-red-500">*</span></label>
            <select 
              required
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select Category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition</label>
            <select 
              value={condition}
              onChange={e => setCondition(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="Tốt 100%">Tốt 100%</option>
              <option value="Tốt 80%">Tốt 80%</option>
              <option value="Cần sửa">Cần sửa</option>
              <option value="N/A">N/A</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <input 
              type="text" 
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Kho Công Ty"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
            <input 
              type="text" 
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date</label>
            <input 
              type="date" 
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price (VND)</label>
            <input 
              type="number" 
              value={purchasePrice}
              onChange={e => setPurchasePrice(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea 
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
            placeholder="Add details about this asset..."
          />
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Saving...' : 'Add Asset'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

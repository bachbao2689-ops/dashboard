import toast from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { supabase } from '../../../services/supabase';
import { useTranslation } from '../../../i18n/translations';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssetModal: React.FC<AssetModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
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

  useEffect(() => {
    const el = document.getElementById('asset-purchase-date');
    const handleChange = (e: any) => setPurchaseDate(e.target.value);
    el?.addEventListener('change', handleChange);
    return () => el?.removeEventListener('change', handleChange);
  }, []);

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

  const parseLocal = (s: string) => {
    if (!s) return null;
    const p = s.split(/[-/]/);
    if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
    return s;
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
         purchase_date: parseLocal(purchaseDate),
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

  const openCal = (id: string, e: React.MouseEvent) => {
    // @ts-ignore
    if (window.openCalendar) {
      // @ts-ignore
      window.openCalendar({ displayId: id, mode: 'single' }, e);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('assets.modal.title')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('assets.modal.code')} <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required
              pattern="^[A-Za-z0-9]{6,20}$"
              title="6-20 alphanumeric characters"
              value={assetCode}
              onChange={e => setAssetCode(e.target.value)}
              className="w-full px-4 py-2.5 border border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-black/40 text-gray-900 dark:text-white font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder-gray-400 dark:placeholder-gray-500 uppercase"
              placeholder="e.g. LENCANON01"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('assets.modal.name')} <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-black/40 text-gray-900 dark:text-white font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="e.g. Lens Canon 24-70mm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('assets.col.category')} <span className="text-red-500">*</span></label>
            <select 
              required
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 border border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-black/40 text-gray-900 dark:text-white font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder-gray-400 dark:placeholder-gray-500"
            >
              <option value="">{t('assets.modal.selectCategory')}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('assets.modal.condition')}</label>
            <select 
              value={condition}
              onChange={e => setCondition(e.target.value)}
              className="w-full px-4 py-2.5 border border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-black/40 text-gray-900 dark:text-white font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder-gray-400 dark:placeholder-gray-500"
            >
              <option value="Tốt 100%">{t('assets.condGood100')}</option>
              <option value="Tốt 80%">{t('assets.condGood80')}</option>
              <option value="Cần sửa">{t('assets.condNeedRepair')}</option>
              <option value="N/A">N/A</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('assets.modal.location')}</label>
            <input 
              type="text" 
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 border border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-black/40 text-gray-900 dark:text-white font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="e.g. Kho Công Ty"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('assets.modal.serialNumber')}</label>
            <input 
              type="text" 
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              className="w-full px-4 py-2.5 border border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-black/40 text-gray-900 dark:text-white font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="tw-calendar-picker relative">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('assets.modal.purchaseDate')}</label>
            <input 
              type="text" 
              id="asset-purchase-date"
              readOnly
              onClick={(e) => openCal('asset-purchase-date', e)}
              value={purchaseDate}
              placeholder="dd/mm/yyyy"
              className="w-full px-4 py-2.5 border border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-black/40 text-gray-900 dark:text-white font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder-gray-400 dark:placeholder-gray-500 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('assets.modal.purchasePrice')}</label>
            <input 
              type="number" 
              value={purchasePrice}
              onChange={e => setPurchasePrice(e.target.value)}
              className="w-full px-4 py-2.5 border border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-black/40 text-gray-900 dark:text-white font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('assets.modal.description')}</label>
          <textarea 
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 border border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-black/40 text-gray-900 dark:text-white font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder-gray-400 dark:placeholder-gray-500 min-h-[80px]"
            placeholder={t('assets.modal.descriptionPlaceholder')}
          />
        </div>

        <div className="sticky bottom-[-1px] bg-white dark:bg-slate-800 flex justify-end gap-3 pt-4 pb-2 border-t border-gray-100 dark:border-slate-700 z-10">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? t('assets.modal.saving') : t('assets.modal.submit')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

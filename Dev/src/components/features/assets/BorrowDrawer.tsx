import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { localToday, submitBorrowRequests } from '../../../services/borrowWorkflow';
import type { Asset } from '../../../hooks/useAssets';
import toast from 'react-hot-toast';
import { CalendarDays, Grip, X, Search, Trash2 } from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { useTranslation } from '../../../i18n/translations';

interface BorrowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartAssets: Asset[];
  setCartAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  onSuccess: () => void;
}

const toDisplayDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

const toIsoDate = (displayDate: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(displayDate);
  if (!match) return '';
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) && date.getMonth() + 1 === Number(month) && date.getDate() === Number(day)
    ? `${year}-${month}-${day}`
    : '';
};

export const BorrowDrawer: React.FC<BorrowDrawerProps> = ({ isOpen, onClose, cartAssets, setCartAssets, onSuccess }) => {
  const { t } = useTranslation();
  const width = window.innerWidth < 768 ? window.innerWidth : 480;
  
  const profile = useAuthStore(state => state.profile);

  const [assetCodeInput, setAssetCodeInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const input = document.getElementById('borrow-due-date-input') as HTMLInputElement | null;
    if (!input) return;
    const syncCalendarDate = () => setDueDate(toIsoDate(input.value));
    input.addEventListener('change', syncCalendarDate);
    return () => input.removeEventListener('change', syncCalendarDate);
  }, [isOpen]);

  const openDueDateCalendar = (event: React.MouseEvent) => {
    (window as Window & { openCalendar?: (options: { displayId: string; mode: string; minDate: string }, event: React.MouseEvent) => void })
      .openCalendar?.({ displayId: 'borrow-due-date-input', mode: 'single', minDate: localToday() }, event);
  };

  const handleAddByCode = async () => {
    if (!assetCodeInput.trim()) return;
    try {
      const { data, error } = await supabase.from('assets').select('id, name, asset_code, status, is_available').eq('asset_code', assetCodeInput.trim().toUpperCase()).maybeSingle();
      if (error || !data) {
        toast.error("Không tìm thấy thiết bị hoặc mã không hợp lệ");
        return;
      }
      if (data.status !== 'available' || !data.is_available) {
        toast.error('Thiết bị hiện không sẵn sàng để mượn');
        return;
      }
      if (cartAssets.find(a => a.id === data.id)) {
        toast.error("Thiết bị này đã có trong danh sách mượn");
        return;
      }
      setCartAssets(current => [...current, data as Asset]);
      setAssetCodeInput('');
    } catch (err) {
      toast.error("Lỗi khi tìm thiết bị");
    }
  };

  const removeAsset = (id: string) => {
    setCartAssets(current => current.filter(a => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartAssets.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 thiết bị');
      return;
    }
    setLoading(true);
    try {
      await submitBorrowRequests({ assetIds: cartAssets.map(asset => asset.id), dueDate, purpose, profile });
      
      toast.success(`Đã gửi yêu cầu mượn ${cartAssets.length} thiết bị`);
      setCartAssets([]);
      setDueDate('');
      setPurpose('');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gửi yêu cầu thất bại');
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[65] xl:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div 
        style={{ '--drawer-width': `${width}px` } as React.CSSProperties}
        className={`dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 ${isOpen ? 'w-full max-w-full md:max-w-[calc(100vw-32px)] md:w-[var(--drawer-width)] xl:max-w-[min(var(--drawer-width),50vw)] shadow-drawer-task border border-blue-500/20 opacity-100 pointer-events-auto drawer-slide-in' : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'} z-[70] transition-[width,opacity] duration-300 ease-out`}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">{t('borrow.slipTitle')}</h3>
          <button 
            disabled={loading}
            onClick={onClose} 
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <section className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('borrow.borrowerInfo')}</h4>
            <div className="flex items-center gap-3">
              <Avatar name={profile?.name || ''} src={profile?.avatar_url || undefined} className="w-10 h-10 shadow-sm" />
              <div>
                <b className="text-sm text-gray-900 dark:text-white">{profile?.name}</b>
                <p className="text-xs text-gray-500">{profile?.department_name || t('borrow.noDepartment')}</p>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between gap-2">
              <span>{t('borrow.equipmentList')} ({cartAssets.length})</span>
              <button type="button" disabled={loading || cartAssets.length === 0} onClick={() => setCartAssets([])} className="normal-case tracking-normal text-xs font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">
                {t('borrow.clearAll')}
              </button>
            </h4>
            
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  value={assetCodeInput}
                  onChange={e => setAssetCodeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAddByCode(); } }}
                  placeholder={t('borrow.enterCode')} 
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary"
                />
              </div>
              <button type="button" onClick={handleAddByCode} className="px-3 py-2 bg-gray-100 dark:bg-slate-700 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                {t('common.add')}
              </button>
            </div>

            <div className="h-[min(36vh,340px)] min-h-[180px] max-h-[60vh] resize-y overflow-y-auto custom-scrollbar p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-900/40">
              {cartAssets.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-4">{t('borrow.noEquipment')}</p>
              ) : (
                <div className="space-y-2">
                  {cartAssets.map(a => (
                    <div key={a.id} className="flex items-start gap-2 p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                      <div className="min-w-0 flex-1">
                        <b className="text-sm leading-5 block break-words text-gray-900 dark:text-slate-100">{a.name}</b>
                        <span className="text-[11px] text-gray-500 dark:text-slate-400 font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded mt-1 inline-block break-all">{a.asset_code}</span>
                      </div>
                      <button type="button" disabled={loading} onClick={() => removeAsset(a.id)} aria-label={`Bỏ ${a.name} khỏi danh sách`} className="shrink-0 w-8 h-8 flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors disabled:opacity-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="flex items-center justify-end gap-1 mt-1 text-[11px] text-gray-500 dark:text-slate-400"><Grip className="w-3 h-3" /> {t('borrow.dragToExpand')}</p>
          </section>

          <form id="borrow-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('borrow.borrowDate')}</label>
                <input 
                  type="text"
                  value={toDisplayDate(localToday())}
                  disabled
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900 text-sm font-semibold text-gray-500 cursor-not-allowed"
                />
              </div>
              <div className="tw-calendar-picker relative min-w-0">
                <label htmlFor="borrow-due-date-input" className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('borrow.returnDate')} <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input 
                    type="text"
                    id="borrow-due-date-input"
                    required
                    readOnly
                    onClick={openDueDateCalendar}
                    onChange={e => setDueDate(toIsoDate(e.target.value))}
                    value={dueDate ? toDisplayDate(dueDate) : ''}
                    placeholder={t('borrow.selectReturnDate')}
                    aria-label={t('borrow.selectReturnDate')}
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-primary cursor-pointer"
                  />
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-slate-400" />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('borrow.purpose')} <span className="text-red-500">*</span></label>
              <textarea 
                required
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder={t('borrow.purposePlaceholder')}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none min-h-24 focus:border-primary"
              />
            </div>
          </form>
        </div>

        <div className="p-4 md:p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button 
            type="button" 
            disabled={loading} 
            onClick={onClose} 
            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button 
            type="submit" 
            form="borrow-form"
            disabled={loading || !profile || cartAssets.length === 0 || !dueDate || !purpose.trim()}
            className="flex-1 px-4 py-2.5 bg-[#002e6d] hover:bg-[#001f4d] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
          >
            {loading ? t('borrow.submitting') : t('borrow.submit')}
          </button>
        </div>
      </div>
    </>
  );
};

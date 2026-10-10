import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';
import { X, Search, Trash2, Calendar } from 'lucide-react';
import { Avatar } from '../../common/Avatar';

interface BorrowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartAssets: any[];
  setCartAssets: (assets: any[]) => void;
  onSuccess: () => void;
}

export const BorrowDrawer: React.FC<BorrowDrawerProps> = ({ isOpen, onClose, cartAssets, setCartAssets, onSuccess }) => {
  const width = window.innerWidth < 768 ? window.innerWidth : 480;
  
  const profile = useAuthStore(state => state.profile);

  const [assetCodeInput, setAssetCodeInput] = useState('');
  const [borrowDate, setBorrowDate] = useState(new Date().toLocaleDateString('vi-VN'));
  const [dueDate, setDueDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleAddByCode = async () => {
    if (!assetCodeInput.trim()) return;
    try {
      const { data, error } = await supabase.from('assets').select('id, name, asset_code, status').eq('asset_code', assetCodeInput.trim()).single();
      if (error || !data) {
        toast.error("Không tìm thấy thiết bị hoặc mã không hợp lệ");
        return;
      }
      if (data.status !== 'available') {
        toast.error(`Thiết bị này đang ở trạng thái: ${data.status}`);
        return;
      }
      if (cartAssets.find(a => a.id === data.id)) {
        toast.error("Thiết bị này đã có trong danh sách mượn");
        return;
      }
      setCartAssets([...cartAssets, data]);
      setAssetCodeInput('');
    } catch (err) {
      toast.error("Lỗi khi tìm thiết bị");
    }
  };

  const removeAsset = (id: string) => {
    setCartAssets(cartAssets.filter(a => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartAssets.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 thiết bị');
      return;
    }
    if (!dueDate || !purpose) return;

    const parseLocal = (s: string) => {
      const p = s.split(/[-/]/);
      if(p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
      return s;
    };
    
    const isoBorrow = parseLocal(borrowDate);
    const isoDue = parseLocal(dueDate);

    if (new Date(isoDue) < new Date(isoBorrow)) {
      toast.error('Ngày trả không được trước ngày mượn');
      return;
    }

    setLoading(true);
    try {
      const { data: wsData } = await supabase.from('workspaces').select('id').limit(1).single();
      
      const payload = cartAssets.map(asset => ({
         asset_id: asset.id,
         requester_id: profile?.id,
         borrow_date: isoBorrow,
         due_date: isoDue,
         purpose,
         notes: '',
         approval_status: 'pending',
         workspace_id: wsData?.id
      }));

      const { error } = await supabase.from('borrow_requests').insert(payload);
      if (error) throw error;
      
      toast.success(`Đã gửi yêu cầu mượn ${cartAssets.length} thiết bị`);
      setCartAssets([]); // clear cart
      setDueDate('');
      setPurpose('');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Gửi yêu cầu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const openCal = (id: string, e: React.MouseEvent) => {
    if ((window as any).openCalendar) {
      (window as any).openCalendar({ displayId: id, mode: 'single' }, e);
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[60] md:hidden transition-opacity"
          onClick={onClose}
        />
      )}
      <div 
        style={{ '--drawer-width': `${width}px` } as React.CSSProperties}
        className={`h-full bg-white dark:bg-slate-800 rounded-l-3xl shrink-0 ${isOpen ? 'w-full max-w-full md:w-[min(var(--drawer-width),100%)] md:min-w-[var(--drawer-width)] shadow-drawer-task border-l border-blue-500/20' : 'w-0 min-w-0 shadow-none border-l-0 border-transparent'} absolute md:relative right-0 top-0 z-[70] flex flex-col overflow-hidden transition-[width,min-width] duration-300 ease-out`}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Phiếu mượn thiết bị</h3>
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
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Thông tin người mượn</h4>
            <div className="flex items-center gap-3">
              <Avatar name={profile?.name || ''} src={profile?.avatar_url || undefined} className="w-10 h-10 shadow-sm" />
              <div>
                <b className="text-sm text-gray-900 dark:text-white">{profile?.name}</b>
                <p className="text-xs text-gray-500">{profile?.department_id || '---'}</p>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Danh sách thiết bị ({cartAssets.length})</span>
            </h4>
            
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  value={assetCodeInput}
                  onChange={e => setAssetCodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddByCode()}
                  placeholder="Nhập Asset Code và Enter..." 
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary"
                />
              </div>
              <button onClick={handleAddByCode} className="px-3 py-2 bg-gray-100 dark:bg-slate-700 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                Thêm
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {cartAssets.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">Chưa có thiết bị nào trong giỏ</p>
              ) : (
                cartAssets.map(a => (
                  <div key={a.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm group">
                    <div>
                      <b className="text-sm block line-clamp-1">{a.name}</b>
                      <span className="text-[10px] text-gray-500 font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded mt-1 inline-block">{a.asset_code}</span>
                    </div>
                    <button onClick={() => removeAsset(a.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <form id="borrow-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ngày mượn</label>
                <input 
                  type="text" 
                  value={borrowDate}
                  disabled
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900 text-sm font-semibold text-gray-500 cursor-not-allowed"
                />
              </div>
              <div className="tw-calendar-picker relative">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hạn trả <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input 
                    type="text"
                    id="borrow-due-date-input"
                    required
                    readOnly
                    onClick={(e) => openCal('borrow-due-date-input', e)}
                    value={dueDate}
                    placeholder="dd/mm/yyyy"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none cursor-pointer focus:border-primary"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Lý do mượn <span className="text-red-500">*</span></label>
              <textarea 
                required
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="Nhập lý do hoặc dự án sử dụng thiết bị..."
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none min-h-24 focus:border-primary"
              />
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800">
          <button 
            type="button" 
            disabled={loading} 
            onClick={onClose} 
            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Hủy
          </button>
          <button 
            type="submit" 
            form="borrow-form"
            disabled={loading || cartAssets.length === 0 || !dueDate || !purpose}
            className="flex-1 px-4 py-2.5 bg-[#002e6d] hover:bg-[#001f4d] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
          >
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu mượn'}
          </button>
        </div>
      </div>
    </>
  );
};

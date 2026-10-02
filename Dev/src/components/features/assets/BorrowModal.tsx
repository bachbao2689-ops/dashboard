import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { supabase } from '../../../services/supabase';
import toast from 'react-hot-toast';

interface BorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assetId?: string; // Pre-selected
}

export const BorrowModal: React.FC<BorrowModalProps> = ({ isOpen, onClose, onSuccess, assetId }) => {
  const [selectedAssetId, setSelectedAssetId] = useState(assetId || '');
  const [borrowDate, setBorrowDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchAssets();
  }, [isOpen]);

  useEffect(() => {
    if (assetId) setSelectedAssetId(assetId);
  }, [assetId]);

  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select('id, name').eq('status', 'available');
    if (data) setAssets(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !borrowDate || !dueDate || !purpose) return;
    if (new Date(dueDate) < new Date(borrowDate)) {
      toast.error('Due date cannot be before borrow date');
      return;
    }
    
    setLoading(true);
    try {
      const { data: wsData } = await supabase.from('workspaces').select('id, owner_id').limit(1).single();
      if (!wsData) throw new Error("No workspace");

      await supabase.from('borrow_requests').insert([{
         asset_id: selectedAssetId,
         requester_id: wsData.owner_id, // Simulating current user
         borrow_date: borrowDate,
         due_date: dueDate,
         purpose,
         notes,
         approval_status: 'pending',
         workspace_id: wsData.id
      }]);
      
      onSuccess();
      onClose();
      toast.success('Borrow request submitted');
      
      // Reset
      setSelectedAssetId('');
      setBorrowDate('');
      setDueDate('');
      setPurpose('');
      setNotes('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Equipment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Asset *</label>
          <select 
            required
            value={selectedAssetId}
            onChange={e => setSelectedAssetId(e.target.value)}
            disabled={!!assetId}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">-- Choose available asset --</option>
            {assets.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
            {assetId && !assets.find(a => a.id === assetId) && (
               <option value={assetId}>Selected Asset</option>
            )}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Borrow Date *</label>
            <input 
              type="date" 
              required
              min={new Date().toISOString().split('T')[0]}
              value={borrowDate}
              onChange={e => setBorrowDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
            <input 
              type="date" 
              required
              min={borrowDate || new Date().toISOString().split('T')[0]}
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose *</label>
          <textarea 
            required
            maxLength={500}
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
            placeholder="e.g. Chụp ngoại cảnh set quà 20.10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes</label>
          <textarea 
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[60px]"
            placeholder="Any special requirements..."
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
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

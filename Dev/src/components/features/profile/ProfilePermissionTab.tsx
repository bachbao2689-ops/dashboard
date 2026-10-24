import React from 'react';
import { Check, X } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { isGlobalManager, isDepartmentLeader, isAssetApprover } from '../../../lib/roleScope';

export const ProfilePermissionTab: React.FC<{ role: string }> = ({ role: _role }) => {
  const profile = useAuthStore(state => state.profile);
  const isManager = isGlobalManager(profile);
  const isLeader = isDepartmentLeader(profile);
  const roleLabel = isManager ? '👑 MANAGER' : isLeader ? '⭐ LEADER' : '👤 STAFF';

  const permissions = [
    { label: 'Xem tất cả tasks trong workspace', allowed: isManager },
    { label: 'Tạo / Sửa / Xóa task trong phạm vi phụ trách', allowed: isManager || isLeader },
    { label: 'Duyệt / Từ chối borrow request', allowed: isAssetApprover(profile) },
    { label: 'Quản lý Asset (thêm, sửa, chuyển kho)', allowed: isManager || isLeader },
    { label: 'Mời member vào workspace', allowed: isManager },
    { label: 'Xem report tổng workspace', allowed: isManager },
    { label: 'Xóa workspace (chỉ owner)', allowed: false },
  ];

  return (
    <div className="card-hub p-6 rounded-2xl shadow-sm">
      <div className="mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">K COFFEE Workspace</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Vai trò của bạn: <span className="font-semibold text-gray-900 dark:text-gray-200">{roleLabel}</span>
        </p>
      </div>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">Quyền của bạn</h4>
      <div className="space-y-3">
        {permissions.map((p, idx) => {
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${p.allowed ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                {p.allowed ? <Check size={14} /> : <X size={14} />}
              </div>
              <span className={`text-sm ${p.allowed ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400 dark:text-gray-500 line-through'}`}>{p.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
import React from 'react';
import { Check, X } from 'lucide-react';

export const ProfilePermissionTab: React.FC<{ role: string }> = ({ role }) => {
  const permissions = [
    { label: 'Xem tất cả tasks trong workspace', manager: true, staff: false },
    { label: 'Tạo / Sửa / Xóa task bất kỳ', manager: true, staff: false },
    { label: 'Duyệt / Từ chối borrow request', manager: true, staff: false },
    { label: 'Quản lý Asset (thêm, sửa, chuyển kho)', manager: true, staff: true },
    { label: 'Mời member vào workspace', manager: true, staff: false },
    { label: 'Xem report tổng workspace', manager: true, staff: false },
    { label: 'Xóa workspace (chỉ owner)', manager: false, staff: false },
  ];

  return (
    <div className="card-hub p-6 rounded-2xl shadow-sm">
      <div className="mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">K COFFEE Workspace</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Vai trò của bạn: <span className="font-semibold text-gray-900 dark:text-gray-200">{role === 'manager' ? '👑 MANAGER' : '👤 STAFF'}</span>
        </p>
      </div>

      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">Quyền của bạn</h4>
      <div className="space-y-3">
        {permissions.map((p, idx) => {
          const hasPerm = role === 'manager' ? p.manager : p.staff;
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${hasPerm ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                {hasPerm ? <Check size={14} /> : <X size={14} />}
              </div>
              <span className={`text-sm ${hasPerm ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400 dark:text-gray-500 line-through'}`}>{p.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

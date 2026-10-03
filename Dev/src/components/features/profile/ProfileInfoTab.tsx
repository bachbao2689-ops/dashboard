import React from 'react';
import { useAuthStore } from '../../../store/authStore';
import { Mail, Phone, Briefcase, Building, ShieldCheck } from 'lucide-react';

export const ProfileInfoTab: React.FC = () => {
  const user = useAuthStore(state => state.user);
  
  const infoData = [
    { label: 'Full Name', value: user?.user_metadata?.full_name || 'Louis Nguyễn', icon: <ShieldCheck size={18} /> },
    { label: 'Email', value: user?.email || 'louis@kcoffee.com', icon: <Mail size={18} />, readonly: true },
    { label: 'Phone', value: '0901234567', icon: <Phone size={18} /> },
    { label: 'Department', value: 'Marketing', icon: <Building size={18} />, readonly: true, badge: true },
    { label: 'Position', value: 'Content Manager', icon: <Briefcase size={18} /> },
  ];

  return (
    <div className="card-hub p-6 rounded-2xl shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Personal Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {infoData.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              {item.icon} {item.label}
              {item.readonly && <span className="text-[10px] bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-400 ml-1">READ-ONLY</span>}
            </span>
            {item.badge ? (
              <div>
                <span className="inline-flex px-2.5 py-1 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                  {item.value}
                </span>
              </div>
            ) : (
              <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {item.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

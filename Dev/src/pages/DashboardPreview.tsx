import React from 'react';

export const DashboardPreview: React.FC = () => {
  // We want to hide the global sidebar and header when viewing this because ManagerApp.html already has its own layout, 
  // OR we can just let it render inside the main area.
  return (
    <div className="w-full h-[calc(100vh-120px)] overflow-hidden">
      <iframe 
        src="/ui-hub/ManagerApp.html" 
        className="w-full h-full border-0"
        title="UI HUB Dashboard Preview"
      />
    </div>
  );
};

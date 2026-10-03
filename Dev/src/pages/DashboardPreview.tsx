import React from 'react';

export const DashboardPreview: React.FC = () => {
  // We want to hide the global sidebar and header when viewing this because ManagerApp.html already has its own layout, 
  // OR we can just let it render inside the main area.
  return (
    <div className="w-full h-[calc(100vh-120px)] -mt-6 -mx-6 w-[calc(100%+48px)] overflow-hidden rounded-3xl">
      <iframe 
        src="/ui-hub/ManagerApp.html" 
        className="w-full h-full border-0"
        title="UI HUB Dashboard Preview"
      />
    </div>
  );
};

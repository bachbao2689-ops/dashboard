import React from 'react';

export const DashboardPreview: React.FC = () => {
  // We want to hide the global sidebar and header when viewing this because ManagerApp.html already has its own layout, 
  // OR we can just let it render inside the main area.
  return (
    <div className="absolute inset-0 z-10">
      <iframe frameBorder="0" style={{ border: "none", outline: "none" }} 
        src={`/ui-hub/ManagerApp.html?v=${Date.now()}`} 
        className="w-full h-full border-0"
        title="UI HUB Dashboard Preview"
      />
    </div>
  );
};

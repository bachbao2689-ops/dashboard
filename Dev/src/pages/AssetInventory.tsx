import React, { useState } from 'react';
import { Filter, Plus, Search, MoreHorizontal, Camera, Laptop, HardDrive, Box } from 'lucide-react';
import inventoryData from '../data/inventory.json';

const getIcon = (cat: string) => {
  if (cat === 'Camera' || cat === 'Lens') return <Camera size={16} className="text-purple-500" />;
  if (cat === 'Laptop') return <Laptop size={16} className="text-blue-500" />;
  if (cat === 'Storage') return <HardDrive size={16} className="text-emerald-500" />;
  return <Box size={16} className="text-gray-500" />;
};

export const AssetInventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = inventoryData.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="h-full flex flex-col z-10 relative">
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Asset Inventory</h2>
        <div className="flex gap-3">
          <div className="relative group hidden sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/40 backdrop-blur-md border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="flex items-center gap-2 bg-white/40 hover:bg-white/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/60 shadow-sm text-sm font-medium text-gray-700 transition-colors">
            <Filter size={16} /> Filters
          </button>
          <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl shadow-md text-sm font-medium transition-colors">
            <Plus size={16} /> Add Asset
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs uppercase bg-white/50 border-b border-white/60 text-gray-500 font-bold sticky top-0 backdrop-blur-xl z-10">
              <tr>
                <th className="px-6 py-4">Asset Code</th>
                <th className="px-6 py-4">Name / Category</th>
                <th className="px-6 py-4">Condition</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="border-b border-white/40 hover:bg-white/30 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">{asset.code}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-800 flex items-center gap-2">
                      {getIcon(asset.category)}
                      {asset.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{asset.category}</div>
                  </td>
                  <td className="px-6 py-4 font-medium">{asset.condition || 'N/A'}</td>
                  <td className="px-6 py-4 font-medium whitespace-nowrap">{asset.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold flex items-center gap-1.5 w-max ${
                      asset.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      asset.status === 'Borrowed' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        asset.status === 'Available' ? 'bg-emerald-500' :
                        asset.status === 'Borrowed' ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}></div>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-primary"><MoreHorizontal size={18} /></button>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500 font-medium">No assets found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

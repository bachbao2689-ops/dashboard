import React, { useState } from 'react';
import { Search, Upload, Download, Image as ImageIcon } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  category: string;
  type: string;
  uses: number;
  previewUrl: string;
}

const mockAssets: Asset[] = [
  {
    id: 'a1',
    name: 'KV 2026 Master',
    category: 'Templates',
    type: 'PSD',
    uses: 124,
    previewUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=200&h=200&fit=crop'
  },
  {
    id: 'a2',
    name: 'Social Post',
    category: 'Templates',
    type: 'FIGMA',
    uses: 89,
    previewUrl: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=200&h=200&fit=crop'
  },
  {
    id: 'a3',
    name: 'Primary Logo',
    category: 'Brand',
    type: 'SVG',
    uses: 567,
    previewUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?q=80&w=200&h=200&fit=crop'
  },
  {
    id: 'a4',
    name: 'Banner HD',
    category: 'Templates',
    type: 'PSD',
    uses: 56,
    previewUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=200&h=200&fit=crop'
  }
];

export const AssetLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6 pt-4">
      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search assets..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary">
            <option>All Categories</option>
            <option>Templates</option>
            <option>Brand Colors</option>
            <option>Logos</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary">
            <option>All Formats</option>
            <option>PSD</option>
            <option>FIGMA</option>
            <option>SVG</option>
            <option>PNG</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium ml-2 shadow-sm">
            <Upload size={16} />
            Upload
          </button>
        </div>
      </div>

      {/* Brand Colors Quick Access */}
      <div className="card-hub p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Brand Colors</h4>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border border-gray-200" style={{ backgroundColor: '#E63946' }}></div>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Primary Red</p>
              <p className="text-xs font-mono text-gray-500">#E63946</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border border-gray-200" style={{ backgroundColor: '#F4A261' }}></div>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Secondary Gold</p>
              <p className="text-xs font-mono text-gray-500">#F4A261</p>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      <div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <ImageIcon size={16} /> Templates & Assets
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {mockAssets.map(asset => (
            <div key={asset.id} className="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300">
              <div className="h-32 w-full bg-gray-100 dark:bg-gray-900 relative">
                <img src={asset.previewUrl} alt={asset.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-gray-900 backdrop-blur-sm">
                  {asset.type}
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{asset.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{asset.uses} uses</p>
              </div>
              
              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <button className="w-10 h-10 bg-white text-gray-900 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors transform hover:scale-110 shadow-lg">
                  <Download size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

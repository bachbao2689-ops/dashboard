import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateDesignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

const MOCK_PROJECTS = [
  { id: '1', name: 'Summer Campaign' },
  { id: '2', name: 'Rebranding Q3' },
];

const MOCK_DESIGNERS = [
  { id: 'd1', name: 'Alex Wong', capacity: 75 },
  { id: 'd2', name: 'Sarah Chen', capacity: 40 },
  { id: 'd3', name: 'Mike Johnson', capacity: 90 },
];

export const CreateDesignTaskModal: React.FC<CreateDesignTaskModalProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    projectId: projectId || '',
    title: '',
    brief: '',
    requirements: [''],
    brandGuideline: '',
    fileFormats: [] as string[],
    colorMode: 'RGB',
    assigneeId: '',
    dueDate: '',
    estimatedHours: '',
    priority: 'Medium',
  });

  const handleRequirementChange = (index: number, value: string) => {
    const newReqs = [...formData.requirements];
    newReqs[index] = value;
    setFormData({ ...formData, requirements: newReqs });
  };

  const addRequirement = () => {
    setFormData({ ...formData, requirements: [...formData.requirements, ''] });
  };

  const removeRequirement = (index: number) => {
    const newReqs = formData.requirements.filter((_, i) => i !== index);
    setFormData({ ...formData, requirements: newReqs });
  };

  const toggleFileFormat = (format: string) => {
    const current = formData.fileFormats;
    const updated = current.includes(format)
      ? current.filter(f => f !== format)
      : [...current, format];
    setFormData({ ...formData, fileFormats: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    toast.success('Request created successfully');
    onClose();
  };

  const inputClass = "w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors dark:text-white shadow-sm";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Design Task">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Project */}
          <div className="md:col-span-2">
            <label className={labelClass}>Project</label>
            <select
              required
              className={inputClass}
              value={formData.projectId}
              onChange={e => setFormData({ ...formData, projectId: e.target.value })}
            >
              <option value="">Select a project...</option>
              {MOCK_PROJECTS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="md:col-span-2">
            <label className={labelClass}>Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              className={inputClass}
              placeholder="e.g. Social Media Assets"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Brief */}
          <div className="md:col-span-2">
            <label className={labelClass}>Brief</label>
            <textarea
              rows={3}
              className={inputClass}
              placeholder="Describe the design requirements..."
              value={formData.brief}
              onChange={e => setFormData({ ...formData, brief: e.target.value })}
            />
          </div>

          {/* Requirements */}
          <div className="md:col-span-2 space-y-2">
            <label className={labelClass}>Requirements (Deliverables)</label>
            {formData.requirements.map((req, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Facebook cover 820x312px"
                  value={req}
                  onChange={e => handleRequirementChange(index, e.target.value)}
                />
                {formData.requirements.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRequirement(index)}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addRequirement}
              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Deliverable
            </button>
          </div>

          {/* Specifications */}
          <div className="md:col-span-2 space-y-4 rounded-xl border border-gray-200 dark:border-slate-700 p-4 bg-gray-50/80 dark:bg-slate-900/50">
            <h4 className="font-medium text-gray-900 dark:text-white">Specifications</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Brand Guideline</label>
                <select
                  className={inputClass}
                  value={formData.brandGuideline}
                  onChange={e => setFormData({ ...formData, brandGuideline: e.target.value })}
                >
                  <option value="">Select guideline...</option>
                  <option value="main">Main Corporate Brand</option>
                  <option value="sub">Sub Brand A</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Color Mode</label>
                <div className="flex gap-4 mt-2">
                  {['RGB', 'CMYK'].map(mode => (
                    <label key={mode} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="radio"
                        name="colorMode"
                        value={mode}
                        checked={formData.colorMode === mode}
                        onChange={e => setFormData({ ...formData, colorMode: e.target.value })}
                        className="text-primary focus:ring-primary"
                      />
                      {mode}
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>File Formats</label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {['PNG', 'JPEG', 'PSD', 'AI', 'SVG'].map(format => (
                    <label key={format} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.fileFormats.includes(format)}
                        onChange={() => toggleFileFormat(format)}
                        className="rounded text-primary focus:ring-primary border-gray-200 dark:border-slate-700"
                      />
                      {format}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Assign To */}
          <div>
            <label className={labelClass}>Assign To</label>
            <select
              className={inputClass}
              value={formData.assigneeId}
              onChange={e => setFormData({ ...formData, assigneeId: e.target.value })}
            >
              <option value="">Select designer...</option>
              {MOCK_DESIGNERS.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.capacity}% capacity)
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className={labelClass}>Due Date</label>
            <input
              type="date"
              className={inputClass}
              value={formData.dueDate}
              onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          {/* Estimated Hours */}
          <div>
            <label className={labelClass}>Estimated Hours</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              className={inputClass}
              placeholder="e.g. 4.5"
              value={formData.estimatedHours}
              onChange={e => setFormData({ ...formData, estimatedHours: e.target.value })}
            />
          </div>

          {/* Priority */}
          <div>
            <label className={labelClass}>Priority</label>
            <select
              className={inputClass}
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* Attachments */}
          <div className="md:col-span-2">
            <label className={labelClass}>Attachments</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-200 dark:border-slate-700 border-dashed rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none">
                    Upload a file
                  </span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  PNG, JPG, PDF up to 10MB
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Create Request'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

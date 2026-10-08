

export const SkeletonLine = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}></div>
);

export const SkeletonCircle = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full ${className}`}></div>
);

export const TableSkeleton = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4 px-4 border-b border-gray-100 dark:border-[#8fa8d0]">
          <SkeletonLine className="h-4 w-6" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-4 w-3/4" />
            <SkeletonLine className="h-3 w-1/2 opacity-50" />
          </div>
          {Array.from({ length: cols - 2 }).map((_, j) => (
            <SkeletonLine key={j} className="h-6 w-24 rounded-full" />
          ))}
          <SkeletonCircle className="h-8 w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
};

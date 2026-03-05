interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-neutral-200 ${className}`}
      aria-hidden="true"
    />
  );
}

export function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 flex flex-col gap-2">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="mt-2 h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

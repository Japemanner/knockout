import { Skeleton } from '@/components/ui/skeleton'

export default function StarredLoading() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-4 w-64 mb-8" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-48" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
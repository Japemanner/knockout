export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="h-32 w-full bg-muted animate-pulse rounded-lg" />
      <div className="h-32 w-full bg-muted animate-pulse rounded-lg" />
    </div>
  )
}
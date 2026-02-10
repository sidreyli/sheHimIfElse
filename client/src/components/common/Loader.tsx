interface LoaderProps {
  label?: string;
}

export default function Loader({ label = 'Loading...' }: LoaderProps) {
  return (
    <div role="status" aria-label={label} className="flex flex-col items-center justify-center gap-3 p-8">
      {/* Skeleton pulse */}
      <div className="h-3 w-48 animate-pulse rounded bg-surface-600" />
      <div className="h-3 w-32 animate-pulse rounded bg-surface-600" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

import { Card, CardContent } from '@/components/ui/card';

function Pulse({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-700/50 ${className}`} />;
}

export default function SkeletonCard() {
  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Pulse className="h-5 w-32" />
          <Pulse className="h-5 w-16" />
        </div>
        <Pulse className="h-4 w-48" />
        <div className="flex gap-3 mt-2">
          <Pulse className="h-10 w-20" />
          <Pulse className="h-10 w-20" />
          <Pulse className="h-10 w-20" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <Pulse className="h-3 w-24" />
          <Pulse className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

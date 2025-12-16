import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

export default function StatCard({ title, value, icon, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', variantStyles[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

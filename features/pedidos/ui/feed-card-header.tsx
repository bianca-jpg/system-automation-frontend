import type { ReactNode } from 'react';
import { CardHeader } from '@/shared/ui/primitives/card';

interface FeedCardHeaderProps {
  icon: ReactNode;
  title: string;
  badge: ReactNode;
  action?: ReactNode;
}

// Cabeçalho comum dos dois cards de feed (alertas e comunicações). O título é
// um `<h2>` real (e não o `CardTitle`, que é um `<div>`): na rota /alertas os
// cards são irmãos direto sob o h1 do StandardPageHeader.
export function FeedCardHeader({ icon, title, badge, action }: FeedCardHeaderProps) {
  return (
    <CardHeader className="gap-0 border-b ds-border-divider">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
          {icon}
          {title}
          {action}
        </h2>
        {badge}
      </div>
    </CardHeader>
  );
}


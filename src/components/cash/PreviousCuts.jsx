import React from 'react';
import { Card } from '@/components/ui/card';
import { History } from 'lucide-react';
import { format } from 'date-fns';

export default function PreviousCuts({ cuts }) {
  if (!cuts || cuts.length === 0) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-display font-bold">Cortes ya cerrados de hoy</h3>
        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">{cuts.length}</span>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">Estas ventas ya pertenecen a otro corte y no se vuelven a contar.</p>
      <div className="space-y-2">
        {cuts.map((cut, idx) => (
          <div key={cut.id} className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2 text-sm">
            <div>
              <p className="font-display font-semibold">Corte #{cuts.length - idx}</p>
              <p className="text-xs text-muted-foreground">
                {cut.num_sales || 0} ventas · {cut.created_date ? format(new Date(cut.created_date), 'HH:mm') : ''}
              </p>
            </div>
            <span className="font-display font-bold text-primary">${(cut.total_sales || 0).toFixed(0)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
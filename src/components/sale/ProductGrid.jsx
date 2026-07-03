import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryStyles = {
  clasica: 'border-emerald-200 bg-emerald-50/50',
  especial: 'border-amber-200 bg-amber-50/50',
  temporada: 'border-purple-200 bg-purple-50/50',
  extra: 'border-blue-200 bg-blue-50/50',
};

const categoryLabels = {
  clasica: 'Clásica',
  especial: 'Especial',
  temporada: 'Temporada',
  extra: 'Extra',
};

export default function ProductGrid({ products, onAdd, onQuickAdd, onEditPrice }) {
  const grouped = products.reduce((acc, p) => {
    const cat = p.category || 'clasica';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
            {categoryLabels[category] || category}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((product) => (
              <Card
                key={product.id}
                className={cn(
                  "relative p-4 cursor-pointer border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] select-none",
                  categoryStyles[product.category] || 'border-border'
                )}
                onClick={() => onAdd(product)}
              >
                <div className="flex flex-col h-full min-h-[80px] justify-between">
                  <div>
                    <p className="font-display font-semibold text-sm leading-tight text-foreground">
                      {product.name}
                    </p>
                    {product.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditPrice && onEditPrice(product); }}
                      className="font-display font-bold text-lg text-primary hover:text-primary/70 transition-colors flex items-center gap-1 group"
                      title="Editar precio"
                    >
                      ${product.price}
                      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onQuickAdd(product); }}
                      className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
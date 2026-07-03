import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, ChevronRight } from 'lucide-react';
import { ORDER_STATUSES } from '@/lib/constants';
import { format } from 'date-fns';

export default function Orders() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['todayOrders'],
    queryFn: () => base44.entities.Order.filter({ sale_date: today }, '-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todayOrders'] }),
  });

  const getStatusConfig = (status) => ORDER_STATUSES.find(s => s.id === status) || ORDER_STATUSES[0];
  const getNextStatus = (current) => {
    const idx = ORDER_STATUSES.findIndex(s => s.id === current);
    if (idx < 3) return ORDER_STATUSES[idx + 1];
    return null;
  };

  const statusGroups = ORDER_STATUSES.map(s => ({
    ...s,
    orders: orders.filter(o => o.status === s.id),
  }));

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Órdenes del día</h2>
        <p className="text-sm text-muted-foreground mt-1">{orders.length} órdenes — {format(new Date(), 'dd/MM/yyyy')}</p>
      </div>

      {/* Status tabs - mobile scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
        {statusGroups.map(group => (
          <Badge key={group.id} className={`${group.color} border flex-shrink-0 px-3 py-1.5 text-sm font-medium`}>
            {group.label} ({group.orders.length})
          </Badge>
        ))}
      </div>

      {/* Orders grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map(order => {
          const statusConfig = getStatusConfig(order.status);
          const nextStatus = getNextStatus(order.status);

          return (
            <Card key={order.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg">#{order.order_number}</span>
                  <Badge className={`${statusConfig.color} border text-[11px]`}>{statusConfig.label}</Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {format(new Date(order.created_date), 'HH:mm')}
                </div>
              </div>

              <div className="space-y-1">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex items-start justify-between text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{item.quantity}x</span> {item.product_name}
                      {item.extras?.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({item.extras.join(', ')})
                        </span>
                      )}
                      {item.note && <p className="text-[11px] text-muted-foreground italic">📝 {item.note}</p>}
                    </div>
                    <span className="text-sm font-medium">${(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <span className="font-display font-bold">${order.total?.toFixed(0)}</span>
                  <span className="text-xs text-muted-foreground ml-2">{order.payment_method}</span>
                </div>
                <div className="flex gap-2">
                  {order.status !== 'cancelada' && order.status !== 'entregada' && (
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateMutation.mutate({ id: order.id, data: { status: value } })}
                    >
                      <SelectTrigger className="h-8 text-xs w-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {nextStatus && order.status !== 'cancelada' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateMutation.mutate({ id: order.id, data: { status: nextStatus.id } })}
                      className="h-8 text-xs"
                    >
                      {nextStatus.label} <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {orders.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🫓</p>
          <p className="text-muted-foreground font-medium">No hay órdenes todavía</p>
          <p className="text-sm text-muted-foreground">Las marquesitas se hacen solas... espera, no.</p>
        </div>
      )}
    </div>
  );
}
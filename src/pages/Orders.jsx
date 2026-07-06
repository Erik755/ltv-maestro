import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, ChevronRight, Lock, Unlock, CheckCircle, Minus, Plus } from 'lucide-react';
import { ORDER_STATUSES } from '@/lib/constants';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { deserializeOrder, cn } from '@/lib/utils';

const getPaymentMethodDisplay = (method) => {
  switch (method) {
    case 'efectivo': return '💵 Efectivo';
    case 'tarjeta': return '💳 Tarjeta';
    case 'transferencia': return '📱 Transferencia';
    case 'cortesia': return '🎁 Cortesía';
    default: return method;
  }
};

export default function Orders() {
  const queryClient = useQueryClient();

  const [showDelivered, setShowDelivered] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [completedItems, setCompletedItems] = useState(() => {
    try {
      const saved = localStorage.getItem('completed_items_counts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const getProcessedCount = (orderId, itemIndex) => {
    return completedItems[orderId]?.[itemIndex] ?? 0;
  };

  const updateProcessedCount = (orderId, itemIndex, count, max) => {
    const cleanCount = Math.max(0, Math.min(max, parseInt(count) || 0));
    setCompletedItems(prev => {
      const orderCompleted = prev[orderId] || {};
      const nextOrder = { ...orderCompleted, [itemIndex]: cleanCount };
      const next = { ...prev, [orderId]: nextOrder };
      localStorage.setItem('completed_items_counts', JSON.stringify(next));
      return next;
    });
  };

  // Solo mostrar órdenes del corte/turno activo (cut_id null)
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['pendingOrders'],
    queryFn: async () => {
      const rawOrders = await base44.entities.Order.filter({ cut_id: null }, '-created_date');
      return rawOrders.map(deserializeOrder);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['todayOrdersReport'] });
    },
  });

  const getStatusConfig = (status) => ORDER_STATUSES.find(s => s.id === status) || ORDER_STATUSES[0];
  const getNextStatus = (current) => {
    const idx = ORDER_STATUSES.findIndex(s => s.id === current);
    if (idx < 3) return ORDER_STATUSES[idx + 1];
    return null;
  };

  const activeOrders = orders.filter(o => o.status !== 'entregada');
  const deliveredOrders = orders.filter(o => o.status === 'entregada');

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (authPassword === 'Tranz@') {
      setIsUnlocked(true);
      setShowAuthDialog(false);
      setShowDelivered(true);
      setAuthPassword('');
      toast.success('Acceso concedido a órdenes entregadas');
    } else {
      toast.error('Contraseña de administrador incorrecta');
    }
  };

  const handleOpenDelivered = () => {
    if (isUnlocked) {
      setShowDelivered(true);
    } else {
      setShowAuthDialog(true);
    }
  };

  const statusGroups = ORDER_STATUSES.map(s => ({
    ...s,
    orders: orders.filter(o => o.status === s.id),
  }));

  const renderOrderCard = (order) => {
    const statusConfig = getStatusConfig(order.status);
    const nextStatus = getNextStatus(order.status);

    return (
      <Card key={order.id} className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-lg">#{order.order_number}</span>
            {order.customer_name && (
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md flex items-center gap-1">
                👤 {order.customer_name}
              </span>
            )}
            <Badge className={`${statusConfig.color} border text-[11px]`}>{statusConfig.label}</Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Clock className="w-3 h-3" />
            {order.created_date ? format(new Date(order.created_date), 'HH:mm') : ''}
          </div>
        </div>

        <div className="space-y-1">
          {order.items?.map((item, i) => {
            const processed = getProcessedCount(order.id, i);
            const isCompleted = processed >= item.quantity;
            return (
              <div key={i} className="flex items-start justify-between gap-3 text-sm py-1.5 border-b border-border/20 last:border-0">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-shrink-0" title="Unidades procesadas de este producto">
                    <button
                      type="button"
                      onClick={() => updateProcessedCount(order.id, i, processed - 1, item.quantity)}
                      disabled={processed <= 0}
                      className="w-6 h-6 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[10px]"
                    >
                      <Minus className="w-3 h-3 stroke-[3]" />
                    </button>
                    <span className="text-[11px] font-bold select-none min-w-[28px] text-center">
                      {processed}/{item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateProcessedCount(order.id, i, processed + 1, item.quantity)}
                      disabled={processed >= item.quantity}
                      className="w-6 h-6 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[10px]"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                    </button>
                  </div>
                  <div className={cn("flex-1 min-w-0 transition-all", isCompleted && "line-through decoration-emerald-500 decoration-2 text-muted-foreground/50")}>
                    <span className="font-medium">{item.quantity}x</span> {item.product_name}
                    {item.extras?.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({item.extras.join(', ')})
                      </span>
                    )}
                    {item.note && <p className="text-[11px] text-muted-foreground italic">📝 {item.note}</p>}
                  </div>
                </div>
                <span className={cn("text-sm font-medium flex-shrink-0 transition-all", isCompleted && "line-through decoration-emerald-500 decoration-2 text-muted-foreground/50")}>
                  ${(item.price * item.quantity).toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <span className="font-display font-bold">${order.total?.toFixed(0)}</span>
            <span className="text-xs text-muted-foreground ml-2">{getPaymentMethodDisplay(order.payment_method)}</span>
          </div>
          <div className="flex gap-2">
            {order.status !== 'cancelada' && (
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
            {nextStatus && order.status !== 'cancelada' && order.status !== 'entregada' && (
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
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Órdenes Activas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {activeOrders.length} órdenes activas en el turno actual
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleOpenDelivered}
          className="sm:w-auto w-full border-primary/30 hover:bg-primary/5 flex items-center justify-center gap-2"
        >
          {isUnlocked ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4" />}
          <span>Órdenes Entregadas ({deliveredOrders.length})</span>
        </Button>
      </div>

      {/* Status tabs - mobile scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
        {statusGroups.map(group => (
          <Badge key={group.id} className={`${group.color} border flex-shrink-0 px-3 py-1.5 text-sm font-medium`}>
            {group.label} ({group.id === 'entregada' ? deliveredOrders.length : activeOrders.filter(o => o.status === group.id).length})
          </Badge>
        ))}
      </div>

      {/* Orders grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activeOrders.map(renderOrderCard)}
      </div>

      {activeOrders.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🫓</p>
          <p className="text-muted-foreground font-medium">No hay órdenes activas pendientes</p>
          <p className="text-sm text-muted-foreground">¡Buen trabajo! Todas las órdenes están entregadas.</p>
        </div>
      )}

      {/* Auth Dialog */}
      {showAuthDialog && (
        <Dialog open onOpenChange={() => setShowAuthDialog(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Autorización Requerida</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <Label>Contraseña de Administrador</Label>
                <Input 
                  type="password" 
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)} 
                  className="mt-1" 
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAuthDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary">
                  Validar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delivered Orders Dialog */}
      {showDelivered && (
        <Dialog open onOpenChange={() => setShowDelivered(false)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Órdenes Entregadas (Turno Activo)
              </DialogTitle>
            </DialogHeader>
            
            {deliveredOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No hay órdenes entregadas en este turno.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                {deliveredOrders.map(renderOrderCard)}
              </div>
            )}
            
            <DialogFooter className="mt-6">
              <Button onClick={() => setShowDelivered(false)} className="bg-primary">
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
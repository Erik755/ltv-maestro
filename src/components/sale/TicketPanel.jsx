import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2, ShoppingBag, CreditCard, Banknote, Smartphone, Gift } from 'lucide-react';
import { CARD_COMMISSION_RATE, PAYMENT_METHODS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const paymentIcons = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  transferencia: Smartphone,
  cortesia: Gift,
};

export default function TicketPanel({ items, onRemove, onUpdateQuantity, onCompleteSale, isProcessing }) {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [cashReceived, setCashReceived] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState(null);
  const [customerName, setCustomerName] = useState('');

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const commission = selectedPayment === 'tarjeta' ? subtotal * CARD_COMMISSION_RATE : 0;
  const total = subtotal;
  const realIncome = total - commission;

  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const change = cashReceivedNum - total;

  const handlePay = () => {
    if (!selectedPayment || items.length === 0) return;
    if (selectedPayment === 'efectivo' && cashReceived && cashReceivedNum < total) return;
    onCompleteSale(selectedPayment, customerName);
    setSelectedPayment(null);
    setCashReceived('');
    setCustomerName('');
  };

  const handleSelectPayment = (id) => {
    if (id === 'cortesia') {
      setPendingPaymentMethod(id);
      setPasswordValue('');
      setShowPasswordDialog(true);
      return;
    }
    setSelectedPayment(id);
    if (id !== 'efectivo') setCashReceived('');
  };

  const handlePasswordSubmit = () => {
    if (passwordValue === 'Tranz@') {
      setSelectedPayment(pendingPaymentMethod);
      if (pendingPaymentMethod !== 'efectivo') setCashReceived('');
      setShowPasswordDialog(false);
      setPendingPaymentMethod(null);
      setPasswordValue('');
    } else {
      alert('Contraseña de cortesía incorrecta');
    }
  };

  return (
    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col max-h-[50vh] lg:max-h-none">
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg">Ticket</h3>
          <Badge variant="secondary" className="ml-auto">{items.length} {items.length === 1 ? 'producto' : 'productos'}</Badge>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Agrega productos al ticket</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div key={index} className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product_name}</p>
                  {item.extras.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.extras.map((extra, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                          {extra}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {item.note && (
                    <p className="text-[11px] text-muted-foreground mt-1 italic">📝 {item.note}</p>
                  )}
                </div>
                <button onClick={() => onRemove(index)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-display font-bold text-sm w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="font-display font-bold text-sm">${(item.price * item.quantity).toFixed(0)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment */}
      <div className="border-t border-border p-4 space-y-3 flex-shrink-0">
        {/* Totals */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          {selectedPayment === 'tarjeta' && commission > 0 && (
            <>
              <div className="flex justify-between text-sm text-amber-600">
                <span>Comisión tarjeta (3.5%)</span>
                <span>-${commission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Ingreso real</span>
                <span>${realIncome.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-lg font-display font-bold pt-1 border-t border-border">
            <span>Total</span>
            <span className="text-primary">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Cash received input */}
        {selectedPayment === 'efectivo' && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">Efectivo recibido</label>
              <Input
                type="number"
                placeholder="0.00"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="mt-1 font-display font-bold text-lg h-11"
                autoFocus
              />
            </div>
            {cashReceived && (
              <div className={cn(
                "flex justify-between items-center px-3 py-2 rounded-lg font-display font-bold text-sm",
                change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              )}>
                <span>{change >= 0 ? "🪙 Cambio" : "⚠️ Falta"}</span>
                <span className="text-base">${Math.abs(change).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Customer Name Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nombre del Cliente</label>
          <Input
            type="text"
            placeholder="Nombre para identificar la orden..."
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-10 text-sm font-semibold"
          />
        </div>

        {/* Payment methods */}
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((method) => {
            const Icon = paymentIcons[method.id];
            return (
              <button
                key={method.id}
                onClick={() => handleSelectPayment(method.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs font-medium",
                  selectedPayment === method.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/30 text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{method.label}</span>
              </button>
            );
          })}
        </div>

        {/* Pay button */}
        <Button
          onClick={handlePay}
          disabled={
            !selectedPayment || items.length === 0 || isProcessing ||
            (selectedPayment === 'efectivo' && cashReceived !== '' && cashReceivedNum < total)
          }
          className="w-full h-12 text-base font-display font-bold bg-primary hover:bg-primary/90"
        >
          {isProcessing ? 'Procesando...' : `Cobrar $${total.toFixed(0)}`}
        </Button>
      </div>

      {showPasswordDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="font-display font-bold text-lg text-foreground">Autorizar Cortesía</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Se requiere contraseña de administrador para aplicar cortesía.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Contraseña</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                className="font-mono h-11"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePasswordSubmit();
                }}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPendingPaymentMethod(null);
                  setPasswordValue('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                className="bg-primary hover:bg-primary/90"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
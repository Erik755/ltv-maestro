import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { History, Lock, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function PreviousCuts({ cuts }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [selectedCutForDetail, setSelectedCutForDetail] = useState(null);

  if (!cuts || cuts.length === 0) return null;

  // Los cortes están ordenados de más reciente a más viejo (-created_date)
  const visibleCuts = isUnlocked ? cuts : cuts.slice(0, 4);
  const hasHiddenCuts = cuts.length > 4 && !isUnlocked;

  const handleUnlock = (e) => {
    e.preventDefault();
    if (password === 'Tranz@') {
      setIsUnlocked(true);
      setShowPasswordInput(false);
      setPassword('');
      toast.success('Historial completo desbloqueado');
    } else {
      toast.error('Contraseña incorrecta');
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display font-bold">Historial de Cortes</h3>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">{cuts.length}</span>
        </div>
        {cuts.length > 4 && (
          <span className="text-[10px] text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded font-mono">
            Ciclo de 4 semanas
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        {hasHiddenCuts 
          ? "Mostrando los últimos 4 días laborados. Los reportes anteriores están archivados."
          : "Cortes cerrados acumulados. Haz clic en un corte para ver la Tira de Venta detallada."}
      </p>
      
      <div className="space-y-2">
        {visibleCuts.map((cut, idx) => (
          <div 
            key={cut.id} 
            onClick={() => setSelectedCutForDetail(cut)}
            className="flex items-center justify-between bg-secondary/40 hover:bg-secondary/60 transition-colors cursor-pointer rounded-lg px-3 py-2 text-sm"
          >
            <div>
              <p className="font-display font-semibold">Corte #{cuts.length - idx}</p>
              <p className="text-xs text-muted-foreground">
                {cut.num_sales || 0} ventas · {cut.created_date ? format(new Date(cut.created_date), 'yyyy-MM-dd HH:mm') : ''}
              </p>
            </div>
            <div className="text-right">
              <span className="font-display font-bold text-primary">${(cut.total_sales || 0).toFixed(0)}</span>
              {cut.cash_difference !== undefined && (
                <p className={`text-[10px] ${cut.cash_difference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  Dif: {cut.cash_difference >= 0 ? '+' : ''}${cut.cash_difference.toFixed(0)}
                </p>
              )}
            </div>
          </div>
        ))}

        {hasHiddenCuts && (
          <div className="border border-dashed border-border rounded-lg p-4 bg-secondary/10 flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-0 pointer-events-none" />
            <div className="z-10 text-center space-y-1">
              <Lock className="w-5 h-5 mx-auto text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Cortes anteriores archivados</p>
              <p className="text-[10px] text-muted-foreground">Se requiere autorización para ver los cortes más antiguos de la semana pasada.</p>
            </div>
            
            {!showPasswordInput ? (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowPasswordInput(true)}
                className="z-10 text-xs h-8"
              >
                Desbloquear Historial
              </Button>
            ) : (
              <form onSubmit={handleUnlock} className="z-10 flex gap-2 w-full max-w-xs items-center justify-center">
                <Input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-8 text-xs font-mono w-32"
                  autoFocus
                />
                <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground">
                  Validar
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowPasswordInput(false)}>
                  X
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Ticket/Tira de Venta detallado de corte histórico */}
      {selectedCutForDetail && (
        <Dialog open onOpenChange={() => setSelectedCutForDetail(null)}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display font-bold text-center">Tira de Venta de Historial</DialogTitle>
            </DialogHeader>

            <div className="p-6 bg-card border rounded-lg space-y-6 font-mono text-sm relative overflow-hidden" id="ticket-historico">
              {/* Header */}
              <div className="text-center space-y-1 pb-4 border-b border-dashed">
                <h2 className="font-display text-lg font-bold tracking-wider">LA TERCERA VUELTA</h2>
                <p className="text-xs text-muted-foreground">REPORTE DE CIERRE DE CAJA</p>
                <p className="text-[10px] text-muted-foreground mt-1">Fecha: {selectedCutForDetail.cut_date}</p>
                <p className="text-[10px] text-muted-foreground">ID: {selectedCutForDetail.id.slice(0, 8)}...</p>
              </div>

              {/* Ventas */}
              <div className="space-y-2 py-2 border-b border-dashed">
                <div className="flex justify-between font-bold">
                  <span>VENTAS TOTALES</span>
                  <span>${(selectedCutForDetail.total_sales || 0).toFixed(2)}</span>
                </div>
                <div className="pl-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Efectivo:</span>
                    <span>${(selectedCutForDetail.total_cash || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tarjeta (Sistema):</span>
                    <span>${(selectedCutForDetail.total_card || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transferencias:</span>
                    <span>${(selectedCutForDetail.total_transfer || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cortesías:</span>
                    <span>${(selectedCutForDetail.total_courtesy || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Conciliación Efectivo */}
              <div className="space-y-1 py-2 border-b border-dashed text-xs">
                <div className="flex justify-between font-bold text-sm">
                  <span>EFECTIVO</span>
                  <span>Contado: ${(selectedCutForDetail.counted_cash || 0).toFixed(2)}</span>
                </div>
                <div className="pl-3 space-y-0.5 text-muted-foreground text-[11px]">
                  <div className="flex justify-between">
                    <span>Esperado en caja:</span>
                    <span>${(selectedCutForDetail.expected_cash || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Gastos del Turno:</span>
                    <span>-${(selectedCutForDetail.expenses || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground">
                    <span>Diferencia Efectivo:</span>
                    <span className={selectedCutForDetail.cash_difference >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {selectedCutForDetail.cash_difference >= 0 ? '+' : ''}${(selectedCutForDetail.cash_difference || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conciliación Tarjeta */}
              <div className="space-y-1 py-2 border-b border-dashed text-xs">
                <div className="flex justify-between font-bold text-sm">
                  <span>TARJETA</span>
                  <span>Contada: ${(selectedCutForDetail.counted_card || 0).toFixed(2)}</span>
                </div>
                <div className="pl-3 space-y-0.5 text-muted-foreground text-[11px]">
                  <div className="flex justify-between">
                    <span>Esperada (Sistema):</span>
                    <span>${(selectedCutForDetail.total_card || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground">
                    <span>Diferencia Tarjeta:</span>
                    <span className={((selectedCutForDetail.counted_card || 0) - (selectedCutForDetail.total_card || 0)) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {((selectedCutForDetail.counted_card || 0) - (selectedCutForDetail.total_card || 0)) >= 0 ? '+' : ''}${((selectedCutForDetail.counted_card || 0) - (selectedCutForDetail.total_card || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conciliación Transferencias */}
              <div className="space-y-1 py-2 border-b border-dashed text-xs">
                <div className="flex justify-between font-bold text-sm">
                  <span>TRANSFERENCIAS</span>
                  <span>Contadas: ${(selectedCutForDetail.counted_transfer || 0).toFixed(2)}</span>
                </div>
                <div className="pl-3 space-y-0.5 text-muted-foreground text-[11px]">
                  <div className="flex justify-between">
                    <span>Esperadas (Sistema):</span>
                    <span>${(selectedCutForDetail.total_transfer || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground">
                    <span>Diferencia Transferencia:</span>
                    <span className={((selectedCutForDetail.counted_transfer || 0) - (selectedCutForDetail.total_transfer || 0)) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {((selectedCutForDetail.counted_transfer || 0) - (selectedCutForDetail.total_transfer || 0)) >= 0 ? '+' : ''}${((selectedCutForDetail.counted_transfer || 0) - (selectedCutForDetail.total_transfer || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ingreso Real */}
              <div className="space-y-2 py-2 border-b border-dashed text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Comisiones Tarjeta:</span>
                  <span>-${(selectedCutForDetail.card_commissions || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-foreground pt-1">
                  <span>INGRESO REAL:</span>
                  <span>${(selectedCutForDetail.real_income || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Notas */}
              {selectedCutForDetail.notes && (
                <div className="space-y-1 text-xs py-2 border-b border-dashed">
                  <p className="font-bold">NOTAS:</p>
                  <p className="italic text-muted-foreground whitespace-pre-wrap">{selectedCutForDetail.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-[10px] text-muted-foreground pt-4">
                <p>Reporte de Historial</p>
                <p>Made by Dad for Ratoncita V1.0 🫶</p>
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                onClick={() => {
                  const printContent = document.getElementById('ticket-historico').innerHTML;
                  const originalContent = document.body.innerHTML;
                  document.body.innerHTML = printContent;
                  window.print();
                  document.body.innerHTML = originalContent;
                  window.location.reload();
                }}
                variant="outline"
                className="flex-1"
              >
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
              <Button onClick={() => setSelectedCutForDetail(null)} className="flex-1 bg-primary">
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { History, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PreviousCuts({ cuts }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);

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
          : "Cortes cerrados acumulados en el ciclo de base de datos."}
      </p>
      
      <div className="space-y-2">
        {visibleCuts.map((cut, idx) => (
          <div key={cut.id} className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2 text-sm">
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
    </Card>
  );
}
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { EXTRAS } from '@/lib/constants';

export default function ExtrasDialog({ product, onConfirm, onClose }) {
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [note, setNote] = useState('');

  const toggleExtra = (extra) => {
    setSelectedExtras(prev =>
      prev.find(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const extraPrice = selectedExtras.reduce((sum, e) => sum + (e.price || 0), 0);
  const totalPrice = product.price + extraPrice;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{product.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">Precio base: ${product.price}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Extras y modificaciones</Label>
            <div className="grid grid-cols-2 gap-2">
              {EXTRAS.map((extra) => {
                const isSelected = selectedExtras.find(e => e.id === extra.id);
                return (
                  <button
                    key={extra.id}
                    onClick={() => toggleExtra(extra)}
                    className={`p-3 rounded-lg border-2 text-left text-sm transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <span className="font-medium">{extra.label}</span>
                    {extra.price > 0 && (
                      <span className="block text-xs text-muted-foreground mt-0.5">+${extra.price}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="note" className="text-sm font-semibold">Nota especial</Label>
            <Input
              id="note"
              placeholder="Ej: sin azúcar, poco queso..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="font-display font-bold text-xl text-primary">${totalPrice}</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onConfirm(selectedExtras, note)} className="bg-primary">
            Agregar al ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function NewContainerDialog({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [tare, setTare] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !tare) { toast.error('Completa todos los campos'); return; }
    setSaving(true);
    await base44.entities.Container.create({ name, tare_weight: parseFloat(tare), unit: 'g', is_active: true });
    onCreated();
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Nuevo recipiente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bote Nutella 1kg" className="mt-1" />
          </div>
          <div>
            <Label>Peso vacío (tara) en gramos</Label>
            <Input type="number" value={tare} onChange={(e) => setTare(e.target.value)} placeholder="80" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary">Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
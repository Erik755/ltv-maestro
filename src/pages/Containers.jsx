import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Box } from 'lucide-react';
import { toast } from 'sonner';

export default function Containers() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', tare_weight: '', unit: 'g', is_active: true });

  const { data: containers = [] } = useQuery({
    queryKey: ['containers'],
    queryFn: () => base44.entities.Container.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Container.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['containers'] }); toast.success('Recipiente creado'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Container.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['containers'] }); toast.success('Recipiente actualizado'); },
  });

  const openNew = () => { setForm({ name: '', tare_weight: '', unit: 'g', is_active: true }); setEditing(null); setShowForm(true); };
  const openEdit = (c) => { setForm(c); setEditing(c); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name || !form.tare_weight) { toast.error('Completa todos los campos'); return; }
    const data = { ...form, tare_weight: parseFloat(form.tare_weight) };
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setShowForm(false);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Recipientes / Taras</h2>
          <p className="text-sm text-muted-foreground mt-1">Registra el peso vacío de cada recipiente</p>
        </div>
        <Button onClick={openNew} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Nuevo</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {containers.map(c => (
          <Card key={c.id} className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${!c.is_active ? 'opacity-50' : ''}`} onClick={() => openEdit(c)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Box className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-lg font-display font-bold text-primary">{c.tare_weight} {c.unit}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? 'Editar' : 'Nuevo'} Recipiente</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" placeholder="Ej: Bote Nutella 1kg" /></div>
              <div><Label>Peso vacío / tara</Label><Input type="number" value={form.tare_weight} onChange={(e) => setForm(p => ({ ...p, tare_weight: e.target.value }))} className="mt-1" placeholder="80" /></div>
              <div>
                <Label>Unidad</Label>
                <Select value={form.unit} onValueChange={(v) => setForm(p => ({ ...p, unit: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">Gramos (g)</SelectItem>
                    <SelectItem value="ml">Mililitros (ml)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm(p => ({ ...p, is_active: v }))} />
                <Label>Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-primary">{editing ? 'Actualizar' : 'Crear'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
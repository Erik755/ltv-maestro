import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Wheat, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const emptyIngredient = {
  name: '', unit: 'g', purchase_cost: '', purchase_quantity: '', 
  cost_per_unit: 0, current_stock: 0, min_stock: 0, tolerance: 20, is_active: true
};

export default function Ingredients() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyIngredient);

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Ingredient.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Ingrediente creado'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ingredient.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Ingrediente actualizado'); },
  });

  const openNew = () => { setForm(emptyIngredient); setEditing(null); setShowForm(true); };
  const openEdit = (ing) => { setForm(ing); setEditing(ing); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('Nombre requerido'); return; }
    const costPerUnit = form.purchase_cost && form.purchase_quantity
      ? parseFloat(form.purchase_cost) / parseFloat(form.purchase_quantity)
      : 0;
    const data = { ...form, cost_per_unit: costPerUnit, purchase_cost: parseFloat(form.purchase_cost) || 0, purchase_quantity: parseFloat(form.purchase_quantity) || 0, current_stock: parseFloat(form.current_stock) || 0, min_stock: parseFloat(form.min_stock) || 0, tolerance: parseFloat(form.tolerance) || 20 };
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
          <h2 className="font-display text-2xl font-bold">Ingredientes</h2>
          <p className="text-sm text-muted-foreground mt-1">{ingredients.length} ingredientes registrados</p>
        </div>
        <Button onClick={openNew} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Nuevo</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ingredients.map(ing => {
          const isLow = (ing.current_stock || 0) <= (ing.min_stock || 0);
          return (
            <Card key={ing.id} className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${!ing.is_active ? 'opacity-50' : ''}`} onClick={() => openEdit(ing)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Wheat className="w-4 h-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{ing.name}</p>
                    <p className="text-xs text-muted-foreground">{ing.unit}</p>
                  </div>
                </div>
                {isLow && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Stock</p>
                  <p className={`font-display font-bold text-sm ${isLow ? 'text-amber-600' : 'text-foreground'}`}>
                    {(ing.current_stock || 0).toFixed(0)}{ing.unit}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Costo/u</p>
                  <p className="font-display font-bold text-sm">${(ing.cost_per_unit || 0).toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Tolerancia</p>
                  <p className="font-display font-bold text-sm">±{ing.tolerance || 20}{ing.unit}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? 'Editar' : 'Nuevo'} Ingrediente</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Unidad</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm(p => ({ ...p, unit: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">Gramos (g)</SelectItem>
                      <SelectItem value="ml">Mililitros (ml)</SelectItem>
                      <SelectItem value="pieza">Piezas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Stock actual</Label>
                  <Input type="number" value={form.current_stock} onChange={(e) => setForm(p => ({ ...p, current_stock: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Costo de compra ($)</Label>
                  <Input type="number" value={form.purchase_cost} onChange={(e) => setForm(p => ({ ...p, purchase_cost: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Cantidad comprada</Label>
                  <Input type="number" value={form.purchase_quantity} onChange={(e) => setForm(p => ({ ...p, purchase_quantity: e.target.value }))} className="mt-1" />
                </div>
              </div>
              {form.purchase_cost && form.purchase_quantity && (
                <p className="text-sm text-primary font-medium">
                  Costo por {form.unit}: ${(parseFloat(form.purchase_cost) / parseFloat(form.purchase_quantity)).toFixed(4)}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Stock mínimo</Label>
                  <Input type="number" value={form.min_stock} onChange={(e) => setForm(p => ({ ...p, min_stock: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Tolerancia (±{form.unit})</Label>
                  <Input type="number" value={form.tolerance} onChange={(e) => setForm(p => ({ ...p, tolerance: e.target.value }))} className="mt-1" />
                </div>
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
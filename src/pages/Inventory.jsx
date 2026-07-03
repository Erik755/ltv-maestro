import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Scale, Plus, Trash2, Save, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { INVENTORY_REASONS, getRandomMicrocopy } from '@/lib/constants';
import { toast } from 'sonner';
import NewContainerDialog from '@/components/inventory/NewContainerDialog';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [showNewContainer, setShowNewContainer] = useState(false);

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.filter({ is_active: true }),
  });

  const { data: containers = [] } = useQuery({
    queryKey: ['containers'],
    queryFn: () => base44.entities.Container.filter({ is_active: true }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.InventoryCount.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryCounts'] });
      toast.success('Conteo guardado');
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ countData, newStock }) => {
      await base44.entities.StockAdjustment.create({
        ingredient_id: selectedIngredient.id,
        ingredient_name: selectedIngredient.name,
        previous_quantity: selectedIngredient.current_stock || 0,
        new_quantity: newStock,
        difference: newStock - (selectedIngredient.current_stock || 0),
        reason: reason || 'ajuste_manual',
        comment: comment,
      });
      await base44.entities.Ingredient.update(selectedIngredient.id, { current_stock: newStock });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
    onSuccess: () => toast.success('Stock ajustado'),
  });

  const addMeasurement = () => {
    setMeasurements(prev => [...prev, { container_id: '', container_name: '', gross_weight: '', tare_weight: 0, net_weight: 0 }]);
  };

  const updateMeasurement = (index, field, value) => {
    setMeasurements(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'container_id') {
        const container = containers.find(c => c.id === value);
        if (container) {
          updated[index].container_name = container.name;
          updated[index].tare_weight = container.tare_weight;
        }
      }

      const gross = parseFloat(updated[index].gross_weight) || 0;
      const tare = parseFloat(updated[index].tare_weight) || 0;
      updated[index].net_weight = Math.max(0, gross - tare);

      return updated;
    });
  };

  const removeMeasurement = (index) => {
    setMeasurements(prev => prev.filter((_, i) => i !== index));
  };

  const totalCounted = measurements.reduce((sum, m) => sum + (m.net_weight || 0), 0);
  const expectedStock = selectedIngredient?.current_stock || 0;
  const difference = totalCounted - expectedStock;
  const costPerUnit = selectedIngredient?.cost_per_unit || 0;
  const differenceMoney = Math.abs(difference) * costPerUnit;
  const tolerance = selectedIngredient?.tolerance || 20;

  const getSemaphore = () => {
    if (!selectedIngredient) return null;
    const absDiff = Math.abs(difference);
    if (absDiff <= tolerance) return 'green';
    if (absDiff <= tolerance * 2) return 'yellow';
    return 'red';
  };

  const semaphore = getSemaphore();

  const handleSave = async () => {
    if (!selectedIngredient || !reason) {
      toast.error('Selecciona un ingrediente y un motivo');
      return;
    }
    const countData = {
      ingredient_id: selectedIngredient.id,
      ingredient_name: selectedIngredient.name,
      expected_stock: expectedStock,
      counted_stock: totalCounted,
      difference,
      difference_money: differenceMoney,
      measurements: measurements.map(m => ({
        container_name: m.container_name,
        gross_weight: parseFloat(m.gross_weight) || 0,
        tare_weight: m.tare_weight,
        net_weight: m.net_weight,
      })),
      reason,
      comment,
    };
    await saveMutation.mutateAsync(countData);
  };

  const handleAdjust = async () => {
    if (!selectedIngredient) return;
    await adjustMutation.mutateAsync({ newStock: totalCounted });
    resetForm();
  };

  const resetForm = () => {
    setSelectedIngredient(null);
    setMeasurements([]);
    setReason('');
    setComment('');
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Inventariar</h2>
        <p className="text-sm text-muted-foreground mt-1">Cuenta físicamente tus ingredientes y compara con el sistema</p>
      </div>

      {/* Step 1: Select ingredient */}
      <Card className="p-4 space-y-4">
        <Label className="font-display font-semibold text-base">1. Selecciona ingrediente</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ingredients.map(ing => (
            <button
              key={ing.id}
              onClick={() => { setSelectedIngredient(ing); setMeasurements([{ container_id: '', container_name: '', gross_weight: '', tare_weight: 0, net_weight: 0 }]); }}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedIngredient?.id === ing.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <p className="font-medium text-sm">{ing.name}</p>
              <p className="text-xs text-muted-foreground">{(ing.current_stock || 0).toFixed(0)} {ing.unit} en sistema</p>
            </button>
          ))}
        </div>
      </Card>

      {selectedIngredient && (
        <>
          {/* Step 2: Measurements */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-display font-semibold text-base">2. Pesa en recipientes</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addMeasurement}>
                  <Plus className="w-4 h-4 mr-1" /> Recipiente
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNewContainer(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Nuevo
                </Button>
              </div>
            </div>

            {measurements.map((m, idx) => (
              <div key={idx} className="bg-secondary/50 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Medición {idx + 1}</span>
                  {measurements.length > 1 && (
                    <button onClick={() => removeMeasurement(idx)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Recipiente</Label>
                    <Select value={m.container_id} onValueChange={(v) => updateMeasurement(idx, 'container_id', v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {containers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.tare_weight}g)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Peso total (báscula)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={m.gross_weight}
                      onChange={(e) => updateMeasurement(idx, 'gross_weight', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Peso neto</Label>
                    <div className="mt-1 h-9 rounded-md border border-border bg-muted px-3 flex items-center">
                      <span className="font-display font-bold text-primary">{m.net_weight.toFixed(1)} {selectedIngredient.unit}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Tara: {m.tare_weight}g</p>
                  </div>
                </div>
              </div>
            ))}
          </Card>

          {/* Step 3: Results */}
          <Card className="p-4 space-y-4">
            <Label className="font-display font-semibold text-base">3. Resultado</Label>

            {/* Show counted weight always */}
            <div className="bg-secondary/50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total contado</span>
              <span className="font-display font-bold text-primary text-lg">{totalCounted.toFixed(1)} {selectedIngredient.unit}</span>
            </div>

            {/* Show comparison only after at least one gross weight is entered */}
            {measurements.some(m => m.gross_weight !== '') && (
            <div className={`rounded-xl p-4 border-2 ${
              semaphore === 'green' ? 'bg-emerald-50 border-emerald-200' :
              semaphore === 'yellow' ? 'bg-amber-50 border-amber-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {semaphore === 'green' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                {semaphore === 'yellow' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                {semaphore === 'red' && <AlertCircle className="w-5 h-5 text-red-600" />}
                <span className="font-display font-bold text-sm">
                  {semaphore === 'green' ? getRandomMicrocopy('inventory_ok') :
                   semaphore === 'yellow' ? getRandomMicrocopy('inventory_warning') :
                   getRandomMicrocopy('inventory_bad')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Contado</p>
                  <p className="font-display font-bold text-lg">{totalCounted.toFixed(1)} {selectedIngredient.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Esperado</p>
                  <p className="font-display font-bold text-lg">{expectedStock.toFixed(1)} {selectedIngredient.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Diferencia</p>
                  <p className={`font-display font-bold text-lg ${difference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {difference >= 0 ? '+' : ''}{difference.toFixed(1)} {selectedIngredient.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor diferencia</p>
                  <p className={`font-display font-bold text-lg ${difference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ${differenceMoney.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Motivo del conteo</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar motivo..." /></SelectTrigger>
                  <SelectContent>
                    {INVENTORY_REASONS.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Comentario</Label>
                <Textarea
                  placeholder="Opcional..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mt-1 h-9 min-h-[36px]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="flex-1 bg-primary">
                <Save className="w-4 h-4 mr-2" /> Guardar conteo
              </Button>
              <Button onClick={handleAdjust} disabled={adjustMutation.isPending} variant="outline" className="flex-1">
                <Scale className="w-4 h-4 mr-2" /> Ajustar stock
              </Button>
              <Button variant="ghost" onClick={resetForm}>Limpiar</Button>
            </div>
          </Card>
        </>
      )}

      {showNewContainer && (
        <NewContainerDialog
          onClose={() => setShowNewContainer(false)}
          onCreated={() => { queryClient.invalidateQueries({ queryKey: ['containers'] }); setShowNewContainer(false); }}
        />
      )}
    </div>
  );
}
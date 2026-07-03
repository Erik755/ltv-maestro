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
import { Plus, Trash2, BookOpen, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { CARD_COMMISSION_RATE } from '@/lib/constants';

export default function Recipes() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState([]);
  const [packagingCost, setPackagingCost] = useState('0');

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });
  const { data: ingredients = [] } = useQuery({ queryKey: ['ingredients'], queryFn: () => base44.entities.Ingredient.list() });
  const { data: recipes = [] } = useQuery({ queryKey: ['recipes'], queryFn: () => base44.entities.Recipe.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Recipe.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['recipes'] }); toast.success('Receta creada'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Recipe.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['recipes'] }); toast.success('Receta actualizada'); },
  });

  const openNew = () => {
    setSelectedProductId('');
    setRecipeIngredients([]);
    setPackagingCost('0');
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (recipe) => {
    setSelectedProductId(recipe.product_id);
    setRecipeIngredients(recipe.ingredients || []);
    setPackagingCost(String(recipe.packaging_cost || 0));
    setEditing(recipe);
    setShowForm(true);
  };

  const addIngredientRow = () => {
    setRecipeIngredients(prev => [...prev, { ingredient_id: '', ingredient_name: '', quantity: '', unit: '' }]);
  };

  const updateIngredientRow = (idx, field, value) => {
    setRecipeIngredients(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'ingredient_id') {
        const ing = ingredients.find(i => i.id === value);
        if (ing) { updated[idx].ingredient_name = ing.name; updated[idx].unit = ing.unit; }
      }
      return updated;
    });
  };

  const removeIngredientRow = (idx) => { setRecipeIngredients(prev => prev.filter((_, i) => i !== idx)); };

  const getIngredientCost = () => {
    return recipeIngredients.reduce((sum, ri) => {
      const ing = ingredients.find(i => i.id === ri.ingredient_id);
      return sum + (ing?.cost_per_unit || 0) * (parseFloat(ri.quantity) || 0);
    }, 0);
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const ingredientCost = getIngredientCost();
  const totalCost = ingredientCost + (parseFloat(packagingCost) || 0);
  const salePrice = selectedProduct?.price || 0;
  const cardCommission = salePrice * CARD_COMMISSION_RATE;
  const profitCash = salePrice - totalCost;
  const profitCard = salePrice - totalCost - cardCommission;
  const marginCash = salePrice > 0 ? (profitCash / salePrice * 100) : 0;

  const handleSave = async () => {
    if (!selectedProductId) { toast.error('Selecciona un producto'); return; }
    const product = products.find(p => p.id === selectedProductId);
    const data = {
      product_id: selectedProductId,
      product_name: product?.name || '',
      ingredients: recipeIngredients.map(ri => ({ ...ri, quantity: parseFloat(ri.quantity) || 0 })),
      packaging_cost: parseFloat(packagingCost) || 0,
      total_cost: totalCost,
      margin: marginCash,
    };
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
          <h2 className="font-display text-2xl font-bold">Recetas</h2>
          <p className="text-sm text-muted-foreground mt-1">Define la receta de cada producto</p>
        </div>
        <Button onClick={openNew} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Nueva</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map(recipe => {
          const product = products.find(p => p.id === recipe.product_id);
          return (
            <Card key={recipe.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(recipe)}>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-primary" />
                <p className="font-display font-semibold text-sm">{recipe.product_name}</p>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {recipe.ingredients?.map((ri, i) => (
                  <p key={i}>{ri.quantity} {ri.unit} de {ri.ingredient_name}</p>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="outline" className="text-xs">Costo: ${(recipe.total_cost || 0).toFixed(2)}</Badge>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <span className="text-xs font-display font-bold text-primary">{(recipe.margin || 0).toFixed(0)}%</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? 'Editar' : 'Nueva'} Receta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Producto</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — ${p.price}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Ingredientes</Label>
                  <Button size="sm" variant="outline" onClick={addIngredientRow}><Plus className="w-3 h-3 mr-1" /> Agregar</Button>
                </div>
                {recipeIngredients.map((ri, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-end">
                    <div className="flex-1">
                      <Select value={ri.ingredient_id} onValueChange={(v) => updateIngredientRow(idx, 'ingredient_id', v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Ingrediente..." /></SelectTrigger>
                        <SelectContent>
                          {ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input type="number" placeholder="Cant." value={ri.quantity} onChange={(e) => updateIngredientRow(idx, 'quantity', e.target.value)} className="h-9" />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-center pb-2">{ri.unit}</span>
                    <button onClick={() => removeIngredientRow(idx)} className="text-destructive pb-2"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>

              <div>
                <Label>Costo de empaque ($)</Label>
                <Input type="number" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} className="mt-1" />
              </div>

              {selectedProduct && (
                <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                  <p className="font-display font-bold text-sm">Análisis de costos</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Costo ingredientes:</span><br /><span className="font-bold">${ingredientCost.toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Costo total:</span><br /><span className="font-bold">${totalCost.toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Precio venta:</span><br /><span className="font-bold">${salePrice.toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Utilidad (efectivo):</span><br /><span className="font-bold text-primary">${profitCash.toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Utilidad (tarjeta):</span><br /><span className="font-bold text-amber-600">${profitCard.toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Margen:</span><br /><span className="font-bold text-primary">{marginCash.toFixed(1)}%</span></div>
                  </div>
                </div>
              )}
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
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Download, Upload, Trash2, Store } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function Config() {
  const [businessName, setBusinessName] = useState('La Tercera Vuelta');
  const [cardCommission, setCardCommission] = useState('3.5');
  const [currency, setCurrency] = useState('MXN');

  const handleExport = async () => {
    const data = {};
    const entities = ['Product', 'Ingredient', 'Recipe', 'Container', 'Order', 'InventoryCount', 'StockAdjustment', 'CashCut', 'DayExpense'];
    for (const entity of entities) {
      data[entity] = await base44.entities[entity].list();
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ltv-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Respaldo exportado');
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    
    for (const [entity, records] of Object.entries(data)) {
      if (base44.entities[entity] && Array.isArray(records)) {
        for (const record of records) {
          const { id, created_date, updated_date, created_by_id, ...rest } = record;
          await base44.entities[entity].create(rest);
        }
      }
    }
    toast.success('Datos importados exitosamente');
  };

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="font-display text-2xl font-bold">Configuración</h2>
        <p className="text-sm text-muted-foreground mt-1">Ajusta tu punto de venta</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Store className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold">Negocio</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Nombre del negocio</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Comisión tarjeta (%)</Label>
            <Input type="number" value={cardCommission} onChange={(e) => setCardCommission(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Moneda</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1" />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Download className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold">Respaldos</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Button onClick={handleExport} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" /> Exportar JSON
          </Button>
          <div>
            <input type="file" accept=".json" onChange={handleImport} id="import-file" className="hidden" />
            <Button variant="outline" className="w-full" onClick={() => document.getElementById('import-file').click()}>
              <Upload className="w-4 h-4 mr-2" /> Importar JSON
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4 border-destructive/30">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h3 className="font-display font-bold text-destructive">Zona peligrosa</h3>
        </div>
        <p className="text-sm text-muted-foreground">Resetear todos los datos eliminará toda la información de la aplicación. Esta acción no se puede deshacer.</p>
        <Button variant="destructive" onClick={() => toast.error('Función deshabilitada en demo')}>
          <Trash2 className="w-4 h-4 mr-2" /> Resetear datos
        </Button>
      </Card>
    </div>
  );
}
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Download, Upload, Trash2, Store, Lock, Users, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function Config() {
  const [businessName, setBusinessName] = useState('La Tercera Vuelta');
  const [cardCommission, setCardCommission] = useState('3.5');
  const [currency, setCurrency] = useState('MXN');

  // Password protection for Config
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [configPassword, setConfigPassword] = useState('');

  // User management state
  const [users, setUsers] = useState(() => {
    try {
      const stored = localStorage.getItem('marquesitas_users');
      return stored ? JSON.parse(stored) : [{ username: 'marco', password: 'polo', role: 'admin' }];
    } catch (e) {
      return [{ username: 'marco', password: 'polo', role: 'admin' }];
    }
  });

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handlePasswordSubmit = (e) => {
    if (e) e.preventDefault();
    if (configPassword === 'Tranz@') {
      setIsAuthorized(true);
      setConfigPassword('');
      toast.success('Acceso autorizado a Configuración');
    } else {
      toast.error('Contraseña incorrecta');
    }
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      toast.error('Completa todos los campos');
      return;
    }
    const usernameClean = newUsername.trim();
    if (users.find(u => u.username.toLowerCase() === usernameClean.toLowerCase())) {
      toast.error('El usuario ya existe');
      return;
    }
    const updated = [...users, { username: usernameClean, password: newPassword, role: 'user' }];
    setUsers(updated);
    localStorage.setItem('marquesitas_users', JSON.stringify(updated));
    setNewUsername('');
    setNewPassword('');
    toast.success(`Operador "${usernameClean}" registrado con éxito`);
  };

  const handleDeleteUser = (username) => {
    if (username.toLowerCase() === 'marco') {
      toast.error('No se puede eliminar el usuario maestro "marco"');
      return;
    }
    const updated = users.filter(u => u.username !== username);
    setUsers(updated);
    localStorage.setItem('marquesitas_users', JSON.stringify(updated));
    toast.success(`Operador "${username}" eliminado`);
  };

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

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
        <Card className="p-6 max-w-sm w-full mx-4 shadow-2xl space-y-4 border border-border animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center">
            <Lock className="w-12 h-12 mx-auto text-primary mb-3" />
            <h3 className="font-display font-bold text-lg text-foreground">Acceso Restringido</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Ingresa la contraseña de seguridad para entrar a Configuración.</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="configPassword">Contraseña</Label>
              <Input
                id="configPassword"
                type="password"
                placeholder="••••••••"
                value={configPassword}
                onChange={(e) => setConfigPassword(e.target.value)}
                className="font-mono h-11"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="font-display text-2xl font-bold">Configuración</h2>
        <p className="text-sm text-muted-foreground mt-1">Ajusta tu punto de venta</p>
      </div>

      {/* Negocio */}
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

      {/* Gestión de Operadores */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold">Gestión de Operadores</h3>
        </div>
        
        {/* Registro de Usuario */}
        <form onSubmit={handleAddUser} className="grid sm:grid-cols-3 gap-3 items-end bg-secondary/35 p-3 rounded-lg border border-border/55">
          <div className="space-y-1">
            <Label className="text-xs">Nuevo Usuario</Label>
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Ej. cajero1"
              className="h-10"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contraseña</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10"
            />
          </div>
          <Button type="submit" className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Agregar
          </Button>
        </form>

        {/* Lista de Usuarios */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 font-semibold text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left">Usuario</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-left">Contraseña</th>
                <th className="px-4 py-2 text-center w-16">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u, i) => (
                <tr key={i} className="hover:bg-secondary/15 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{u.username}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">••••••••</td>
                  <td className="px-4 py-2.5 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/15"
                      onClick={() => handleDeleteUser(u.username)}
                      disabled={u.username.toLowerCase() === 'marco'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Respaldos */}
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

      {/* Zona Peligrosa */}
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
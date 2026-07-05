import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, DollarSign, CreditCard, Smartphone, Gift, TrendingUp, Hash, Receipt, Plus, X, Terminal, Lock, Unlock, Printer, EyeOff, FileSpreadsheet } from 'lucide-react';
import { CARD_COMMISSION_RATE, EXPENSE_CATEGORIES } from '@/lib/constants';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PreviousCuts from '@/components/cash/PreviousCuts';
import * as XLSX from 'xlsx';

export default function CashCut() {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');
  const [showExpense, setShowExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'otro', expense_date: today });

  // Nuevos estados para seguridad y flujo
  const [isRevealed, setIsRevealed] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [lastSavedCut, setLastSavedCut] = useState(null);
  const [isCleaning, setIsCleaning] = useState(false);

  // El corte cuenta todo lo pendiente de cortar (cut_id vacío), sin importar el día
  const { data: orders = [] } = useQuery({
    queryKey: ['pendingOrders'],
    queryFn: () => base44.entities.Order.filter({ cut_id: null }),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['pendingExpenses'],
    queryFn: () => base44.entities.DayExpense.filter({ cut_id: null }),
  });

  const { data: todayCuts = [] } = useQuery({
    queryKey: ['allCuts'],
    queryFn: () => base44.entities.CashCut.list('-created_date', 20),
  });

  // Solo lo que aún NO pertenece a un corte cerrado
  const pendingOrders = orders.filter(o => !o.cut_id);
  const pendingExpenses = expenses.filter(e => !e.cut_id);
  const activeOrders = pendingOrders.filter(o => o.status !== 'cancelada');
  const cancelledOrders = pendingOrders.filter(o => o.status === 'cancelada');

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.DayExpense.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pendingExpenses'] }); setShowExpense(false); toast.success('Gasto registrado'); },
  });

  const saveCutMutation = useMutation({
    mutationFn: async (data) => {
      const cut = await base44.entities.CashCut.create(data);
      // Marcar órdenes y gastos pendientes como pertenecientes a este corte
      await Promise.all([
        ...pendingOrders.map(o => base44.entities.Order.update(o.id, { cut_id: cut.id })),
        ...pendingExpenses.map(e => base44.entities.DayExpense.update(e.id, { cut_id: cut.id })),
      ]);
      return cut;
    },
    onSuccess: (cut) => {
      queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['pendingExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['allCuts'] });
      setCountedCash('');
      setNotes('');
      setLastSavedCut(cut);
      setIsRevealed(false);
      toast.success('Corte cerrado. Las nuevas ventas iniciarán otro corte.');
    },
  });

  const stats = useMemo(() => {
    const totalSales = activeOrders.reduce((s, o) => s + (o.total || 0), 0);
    const totalCash = activeOrders.filter(o => o.payment_method === 'efectivo').reduce((s, o) => s + (o.total || 0), 0);
    const totalCard = activeOrders.filter(o => o.payment_method === 'tarjeta').reduce((s, o) => s + (o.total || 0), 0);
    const totalTransfer = activeOrders.filter(o => o.payment_method === 'transferencia').reduce((s, o) => s + (o.total || 0), 0);
    const totalCourtesy = activeOrders.filter(o => o.payment_method === 'cortesia').reduce((s, o) => s + (o.total || 0), 0);
    const cardCommissions = totalCard * CARD_COMMISSION_RATE;
    const totalExpenses = pendingExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const realIncome = totalSales - cardCommissions - totalExpenses;
    const avgTicket = activeOrders.length > 0 ? totalSales / activeOrders.length : 0;
    const expectedCash = totalCash - totalExpenses;
    const counted = parseFloat(countedCash) || 0;
    const cashDiff = counted - expectedCash;

    return { totalSales, totalCash, totalCard, totalTransfer, totalCourtesy, cardCommissions, realIncome, avgTicket, numSales: activeOrders.length, cancellations: cancelledOrders.length, totalExpenses, expectedCash, cashDiff };
  }, [activeOrders, cancelledOrders, pendingExpenses, countedCash]);

  const handleSaveCut = async () => {
    if (pendingOrders.length === 0 && pendingExpenses.length === 0) {
      toast.error('No hay movimientos pendientes para cortar');
      return;
    }
    if (!window.confirm('¿Estás seguro de que deseas cerrar el corte de caja? Esta acción asociará todas las órdenes y gastos pendientes a este corte de forma irreversible.')) {
      return;
    }
    const data = {
      cut_date: today,
      total_sales: stats.totalSales,
      total_cash: stats.totalCash,
      total_card: stats.totalCard,
      total_transfer: stats.totalTransfer,
      total_courtesy: stats.totalCourtesy,
      card_commissions: stats.cardCommissions,
      real_income: stats.realIncome,
      num_sales: stats.numSales,
      avg_ticket: stats.avgTicket,
      cancellations: stats.cancellations,
      expenses: stats.totalExpenses,
      expected_cash: stats.expectedCash,
      counted_cash: parseFloat(countedCash) || 0,
      cash_difference: stats.cashDiff,
      notes,
      is_closed: true,
    };
    await saveCutMutation.mutateAsync(data);
  };

  const handleExportExcelAndClean = async () => {
    if (!window.confirm('ATENCIÓN: Se generará un archivo Excel con toda la información de órdenes, gastos y cortes del ciclo de 4 semanas, y luego se BORRARÁN de forma permanente de la base de datos para liberar espacio. ¿Deseas continuar?')) {
      return;
    }
    
    setIsCleaning(true);
    try {
      toast.loading('Generando reporte Excel...');
      
      const [allCuts, allOrders, allExpenses] = await Promise.all([
        base44.entities.CashCut.list('-created_date', 100),
        base44.entities.Order.list('-created_date', 1000),
        base44.entities.DayExpense.list('-created_date', 500)
      ]);

      const summaryData = allCuts.map(c => ({
        'ID Corte': c.id,
        'Fecha': c.cut_date,
        'Ventas Totales': c.total_sales,
        'Ventas Efectivo': c.total_cash,
        'Ventas Tarjeta': c.total_card,
        'Transferencias': c.total_transfer,
        'Cortesías': c.total_courtesy,
        'Gastos': c.expenses,
        'Ingreso Real': c.real_income,
        'Efectivo Esperado': c.expected_cash,
        'Efectivo Contado': c.counted_cash,
        'Diferencia de Caja': c.cash_difference,
        'Nro Ventas': c.num_sales,
        'Cancelaciones': c.cancellations,
        'Notas': c.notes || ''
      }));

      const ordersData = allOrders.map(o => ({
        'ID Orden': o.id,
        'Fecha': o.created_date ? format(new Date(o.created_date), 'yyyy-MM-dd HH:mm') : '',
        'Método Pago': o.payment_method,
        'Subtotal': o.subtotal,
        'Comisión': o.commission || 0,
        'Total': o.total,
        'Estado': o.status,
        'ID Corte': o.cut_id || 'Pendiente'
      }));

      const expensesData = allExpenses.map(e => ({
        'ID Gasto': e.id,
        'Fecha': e.expense_date,
        'Descripción': e.description,
        'Monto': e.amount,
        'Categoría': e.category,
        'ID Corte': e.cut_id || 'Pendiente'
      }));

      const wb = XLSX.utils.book_new();
      
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      const wsOrders = XLSX.utils.json_to_sheet(ordersData);
      const wsExpenses = XLSX.utils.json_to_sheet(expensesData);

      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Cortes');
      XLSX.utils.book_append_sheet(wb, wsOrders, 'Órdenes');
      XLSX.utils.book_append_sheet(wb, wsExpenses, 'Gastos');

      XLSX.writeFile(wb, `LTV-Reporte-Mensual-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.dismiss();
      toast.success('Excel descargado con éxito.');

      toast.loading('Liberando espacio en la base de datos...');
      
      // Borrar órdenes, gastos y cortes
      await Promise.all([
        ...allOrders.map(o => base44.entities.Order.delete(o.id)),
        ...allExpenses.map(e => base44.entities.DayExpense.delete(e.id)),
        ...allCuts.map(c => base44.entities.CashCut.delete(c.id))
      ]);

      queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['pendingExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['allCuts'] });
      
      toast.dismiss();
      toast.success('Base de datos limpiada con éxito.');
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error('Ocurrió un error al exportar/limpiar: ' + error.message);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleAuthReveal = () => {
    if (authPassword === 'Tranz@') {
      setIsRevealed(true);
      setShowAuthDialog(false);
      setAuthPassword('');
      toast.success('Datos de venta revelados');
    } else {
      toast.error('Contraseña de administrador incorrecta');
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) { toast.error('Completa los campos'); return; }
    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error('El monto del gasto debe ser mayor a 0'); return; }
    await createExpenseMutation.mutateAsync({ ...expenseForm, amount, expense_date: today });
    setExpenseForm({ description: '', amount: '', category: 'otro', expense_date: today });
  };

  const StatCard = ({ icon: Icon, label, value, color = 'text-foreground', sub }) => (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`font-display font-bold text-xl ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </Card>
  );

  // 1. Pantalla de Bloqueo por Límite de 16 Cortes (4 semanas)
  if (todayCuts.length >= 16) {
    return (
      <div className="p-4 space-y-6 max-w-md mx-auto min-h-[60vh] flex flex-col justify-center">
        <Card className="p-6 border-destructive bg-destructive/5 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="font-display text-xl font-bold text-destructive">Límite Mensual Alcanzado</h2>
          <p className="text-sm text-muted-foreground">
            Has completado 16 cortes de caja en este ciclo. Para mantener el sistema rápido y optimizado, debes descargar el respaldo en Excel y limpiar la base de datos para continuar.
          </p>
          <Button 
            onClick={handleExportExcelAndClean} 
            disabled={isCleaning} 
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold py-6"
          >
            {isCleaning ? 'Limpiando base de datos...' : 'Descargar Excel y Limpiar BD'}
          </Button>
        </Card>
      </div>
    );
  }

  // 2. Pantalla de Tira de Venta (Reporte Post-Corte)
  if (lastSavedCut) {
    return (
      <div className="p-4 space-y-6 max-w-md mx-auto">
        <Card className="p-6 bg-card border shadow-md space-y-6 font-mono text-sm relative overflow-hidden" id="ticket-cierre">
          {/* Header */}
          <div className="text-center space-y-1 pb-4 border-b border-dashed">
            <h2 className="font-display text-lg font-bold tracking-wider">LA TERCERA VUELTA</h2>
            <p className="text-xs text-muted-foreground">REPORTE DE CIERRE DE CAJA</p>
            <p className="text-[10px] text-muted-foreground mt-1">Fecha: {lastSavedCut.cut_date}</p>
            <p className="text-[10px] text-muted-foreground">ID: {lastSavedCut.id.slice(0, 8)}...</p>
          </div>

          {/* Ventas */}
          <div className="space-y-2 py-2 border-b border-dashed">
            <div className="flex justify-between font-bold">
              <span>VENTAS TOTALES</span>
              <span>${(lastSavedCut.total_sales || 0).toFixed(2)}</span>
            </div>
            <div className="pl-3 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Efectivo:</span>
                <span>${(lastSavedCut.total_cash || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tarjeta (Sistema):</span>
                <span>${(lastSavedCut.total_card || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Transferencias:</span>
                <span>${(lastSavedCut.total_transfer || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cortesías:</span>
                <span>${(lastSavedCut.total_courtesy || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Conciliación Caja */}
          <div className="space-y-2 py-2 border-b border-dashed">
            <div className="flex justify-between font-bold">
              <span>EFECTIVO CONTADO</span>
              <span>${(lastSavedCut.counted_cash || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Efectivo Esperado:</span>
              <span>${(lastSavedCut.expected_cash || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Gastos del Turno:</span>
              <span>-${(lastSavedCut.expenses || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed">
              <span>DIFERENCIA CAJA:</span>
              <span className={lastSavedCut.cash_difference >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {lastSavedCut.cash_difference >= 0 ? '+' : ''}${(lastSavedCut.cash_difference || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Ingreso Real */}
          <div className="space-y-2 py-2 border-b border-dashed text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Comisiones Tarjeta:</span>
              <span>-${(lastSavedCut.card_commissions || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-foreground pt-1">
              <span>INGRESO REAL:</span>
              <span>${(lastSavedCut.real_income || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Notas */}
          {lastSavedCut.notes && (
            <div className="space-y-1 text-xs py-2 border-b border-dashed">
              <p className="font-bold">NOTAS:</p>
              <p className="italic text-muted-foreground whitespace-pre-wrap">{lastSavedCut.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-[10px] text-muted-foreground pt-4">
            <p>Reporte generado con éxito</p>
            <p>Ratocita´s development v1.0🫶</p>
          </div>
        </Card>

        {/* Acciones */}
        <div className="flex gap-2">
          <Button 
            onClick={() => window.print()} 
            className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 border"
          >
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
          <Button 
            onClick={() => setLastSavedCut(null)} 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/95"
          >
            Iniciar Nuevo Turno
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Corte de Caja</h2>
          <p className="text-sm text-muted-foreground mt-1">{format(new Date(), "EEEE d 'de' MMMM, yyyy")}</p>
        </div>
        {todayCuts.length > 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">{todayCuts.length} corte{todayCuts.length > 1 ? 's' : ''} hoy</span>}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 text-sm text-muted-foreground">
        Mostrando <span className="font-bold text-primary">{stats.numSales}</span> venta{stats.numSales !== 1 ? 's' : ''} pendiente{stats.numSales !== 1 ? 's' : ''} de cortar (corte actual).
      </div>

      {/* Stats grid */}
      <div className="relative">
        {!isRevealed && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[6px] z-10 rounded-2xl flex flex-col items-center justify-center border border-border p-6 text-center space-y-3">
            <Lock className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="font-display font-semibold text-sm">Datos de venta protegidos</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-0.5">Se requiere autorización para visualizar las ventas, ingresos y conciliación de este turno en tiempo real.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAuthDialog(true)} className="text-xs">
              <Unlock className="w-3.5 h-3.5 mr-1" /> Revelar Datos
            </Button>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard icon={DollarSign} label="Total vendido" value={`$${stats.totalSales.toFixed(0)}`} color="text-primary" />
          <StatCard icon={Wallet} label="Efectivo" value={`$${stats.totalCash.toFixed(0)}`} />
          <StatCard icon={CreditCard} label="Tarjeta" value={`$${stats.totalCard.toFixed(0)}`} sub={`Comisión: $${stats.cardCommissions.toFixed(2)}`} />
          <StatCard icon={Smartphone} label="Transferencia" value={`$${stats.totalTransfer.toFixed(0)}`} />
          <StatCard icon={Gift} label="Cortesías" value={`$${stats.totalCourtesy.toFixed(0)}`} />
          <StatCard icon={TrendingUp} label="Ingreso real" value={`$${stats.realIncome.toFixed(0)}`} color="text-emerald-600" />
          <StatCard icon={Hash} label="Ventas" value={stats.numSales} sub={`Ticket prom: $${stats.avgTicket.toFixed(0)}`} />
          <StatCard icon={X} label="Cancelaciones" value={stats.cancellations} color="text-destructive" />
        </div>
      </div>

      {/* Expenses */}
      <Card className="p-4 space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">Gastos del corte</h3>
          <Button size="sm" variant="outline" onClick={() => setShowExpense(true)}>
            <Plus className="w-3 h-3 mr-1" /> Gasto
          </Button>
        </div>
        
        {!isRevealed ? (
          <div className="flex flex-col items-center justify-center py-4 text-center space-y-1">
            <EyeOff className="w-5 h-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-semibold">Detalle de gastos oculto</p>
            <p className="text-[10px] text-muted-foreground">Gastos en este turno: {pendingExpenses.length} registrados</p>
          </div>
        ) : (
          pendingExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin gastos registrados</p>
          ) : (
            <div className="space-y-2">
              {pendingExpenses.map(e => (
                <div key={e.id} className="flex items-center justify-between text-sm bg-secondary/50 rounded-lg px-3 py-2">
                  <span>{e.description}</span>
                  <span className="font-bold text-destructive">-${(e.amount || 0).toFixed(0)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-border">
                <span>Total gastos</span>
                <span className="text-destructive">-${stats.totalExpenses.toFixed(0)}</span>
              </div>
            </div>
          )
        )}
      </Card>

      {/* Cash count */}
      <Card className="p-4 space-y-4">
        <h3 className="font-display font-bold">Conteo de efectivo</h3>
        <div className="max-w-xs">
          <Label className="text-xs">Efectivo contado ($)</Label>
          <Input type="number" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} placeholder="0.00" className="mt-1 font-display font-bold" />
        </div>
        <div>
          <Label className="text-xs">Notas del corte</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones del corte..." className="mt-1" />
        </div>
        <Button onClick={handleSaveCut} className="w-full bg-primary" disabled={saveCutMutation.isPending || (pendingOrders.length === 0 && pendingExpenses.length === 0)}>
          <Receipt className="w-4 h-4 mr-2" /> Cerrar corte
        </Button>
      </Card>

      {/* Mantenimiento */}
      <Card className="p-4 border-dashed border-primary/40 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4 text-primary" /> Mantenimiento del ciclo</h4>
          <p className="text-xs text-muted-foreground">Ciclo actual: {todayCuts.length} / 16 cortes. Puedes descargar el respaldo y limpiar la base de datos en cualquier momento.</p>
        </div>
        <Button onClick={handleExportExcelAndClean} disabled={isCleaning} size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive">
          {isCleaning ? 'Limpiando...' : 'Descargar Excel y Limpiar BD'}
        </Button>
      </Card>

      <PreviousCuts cuts={todayCuts} />

      {/* Expense dialog */}
      {showExpense && (
        <Dialog open onOpenChange={() => setShowExpense(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle className="font-display">Registrar gasto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Descripción</Label><Input value={expenseForm.description} onChange={(e) => setExpenseForm(p => ({ ...p, description: e.target.value }))} className="mt-1" /></div>
              <div><Label>Monto ($)</Label><Input type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm(p => ({ ...p, amount: e.target.value }))} className="mt-1" /></div>
              <div>
                <Label>Categoría</Label>
                <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExpense(false)}>Cancelar</Button>
              <Button onClick={handleSaveExpense} className="bg-primary">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Auth dialog */}
      {showAuthDialog && (
        <Dialog open onOpenChange={() => setShowAuthDialog(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle className="font-display">Autorización de Administrador</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label>Contraseña</Label>
              <Input 
                type="password" 
                value={authPassword} 
                onChange={(e) => setAuthPassword(e.target.value)} 
                className="mt-1" 
                placeholder="••••••••"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAuthReveal()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAuthDialog(false)}>Cancelar</Button>
              <Button onClick={handleAuthReveal} className="bg-primary">Validar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
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
import { Wallet, DollarSign, CreditCard, Smartphone, Gift, TrendingUp, Hash, Receipt, Plus, X, Terminal } from 'lucide-react';
import { CARD_COMMISSION_RATE, EXPENSE_CATEGORIES } from '@/lib/constants';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PreviousCuts from '@/components/cash/PreviousCuts';

export default function CashCut() {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [countedCash, setCountedCash] = useState('');
  const [terminalSales, setTerminalSales] = useState('');
  const [notes, setNotes] = useState('');
  const [showExpense, setShowExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'otro', expense_date: today });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['pendingExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['allCuts'] });
      setCountedCash('');
      setTerminalSales('');
      setNotes('');
      toast.success('Corte cerrado. Las nuevas ventas iniciarán otro corte.');
    },
  });

  const stats = useMemo(() => {
    const terminal = Math.max(0, parseFloat(terminalSales) || 0);
    const ordersSales = activeOrders.reduce((s, o) => s + (o.total || 0), 0);
    const totalSales = ordersSales + terminal;
    const totalCash = activeOrders.filter(o => o.payment_method === 'efectivo').reduce((s, o) => s + (o.total || 0), 0);
    const totalCard = activeOrders.filter(o => o.payment_method === 'tarjeta').reduce((s, o) => s + (o.total || 0), 0) + terminal;
    const totalTransfer = activeOrders.filter(o => o.payment_method === 'transferencia').reduce((s, o) => s + (o.total || 0), 0);
    const totalCourtesy = activeOrders.filter(o => o.payment_method === 'cortesia').reduce((s, o) => s + (o.total || 0), 0);
    const cardCommissions = totalCard * CARD_COMMISSION_RATE;
    const totalExpenses = pendingExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const realIncome = totalSales - cardCommissions - totalExpenses;
    const avgTicket = activeOrders.length > 0 ? totalSales / activeOrders.length : 0;
    const expectedCash = totalCash - totalExpenses;
    const counted = parseFloat(countedCash) || 0;
    const cashDiff = counted - expectedCash;

    return { totalSales, totalCash, totalCard, totalTransfer, totalCourtesy, cardCommissions, realIncome, avgTicket, numSales: activeOrders.length, cancellations: cancelledOrders.length, totalExpenses, expectedCash, cashDiff, terminal };
  }, [activeOrders, cancelledOrders, pendingExpenses, countedCash, terminalSales]);

  const handleSaveCut = async () => {
    if (pendingOrders.length === 0 && pendingExpenses.length === 0 && !stats.terminal) {
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
      terminal_sales: stats.terminal,
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

      {/* Terminal sales */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display font-bold">Ventas por terminal</h3>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">Captura el total cobrado en la terminal de tarjeta que no se registró como orden. Se suma a tarjeta y aplica comisión.</p>
        <div className="max-w-xs">
          <Label className="text-xs">Monto en terminal ($)</Label>
          <Input type="number" min="0" value={terminalSales} onChange={(e) => setTerminalSales(e.target.value)} placeholder="0.00" className="mt-1 font-display font-bold" />
        </div>
      </Card>

      {/* Expenses */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">Gastos del corte</h3>
          <Button size="sm" variant="outline" onClick={() => setShowExpense(true)}>
            <Plus className="w-3 h-3 mr-1" /> Gasto
          </Button>
        </div>
        {pendingExpenses.length === 0 ? (
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
        )}
      </Card>

      {/* Cash count */}
      <Card className="p-4 space-y-4">
        <h3 className="font-display font-bold">Conteo de efectivo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Efectivo contado</Label>
            <Input type="number" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} placeholder="0.00" className="mt-1" />
          </div>
          {countedCash && (
            <>
              <div>
                <Label className="text-xs">Efectivo esperado</Label>
                <div className="mt-1 h-10 rounded-md border bg-muted px-3 flex items-center font-display font-bold">
                  ${stats.expectedCash.toFixed(2)}
                </div>
              </div>
              <div>
                <Label className="text-xs">Diferencia</Label>
                <div className={`mt-1 h-10 rounded-md border px-3 flex items-center font-display font-bold ${stats.cashDiff >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                  {stats.cashDiff >= 0 ? '+' : ''}${stats.cashDiff.toFixed(2)}
                </div>
              </div>
            </>
          )}
        </div>
        <div>
          <Label className="text-xs">Notas del corte</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones del corte..." className="mt-1" />
        </div>
        <Button onClick={handleSaveCut} className="w-full bg-primary" disabled={saveCutMutation.isPending || (pendingOrders.length === 0 && pendingExpenses.length === 0 && !stats.terminal)}>
          <Receipt className="w-4 h-4 mr-2" /> Cerrar corte
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
    </div>
  );
}
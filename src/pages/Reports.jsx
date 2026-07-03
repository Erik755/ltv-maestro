import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Award, Wheat, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#16a34a', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: orders = [] } = useQuery({
    queryKey: ['todayOrders'],
    queryFn: () => base44.entities.Order.filter({ sale_date: today }),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const { data: inventoryCounts = [] } = useQuery({
    queryKey: ['inventoryCounts'],
    queryFn: () => base44.entities.InventoryCount.list('-created_date', 20),
  });

  const activeOrders = orders.filter(o => o.status !== 'cancelada');

  const stats = useMemo(() => {
    // Sales by hour
    const byHour = {};
    activeOrders.forEach(o => {
      const hour = format(new Date(o.created_date), 'HH:00');
      byHour[hour] = (byHour[hour] || 0) + (o.total || 0);
    });
    const salesByHour = Object.entries(byHour).map(([hour, total]) => ({ hour, total })).sort((a, b) => a.hour.localeCompare(b.hour));

    // Product popularity
    const productCount = {};
    activeOrders.forEach(o => {
      o.items?.forEach(item => {
        const name = item.product_name;
        if (!productCount[name]) productCount[name] = { count: 0, revenue: 0 };
        productCount[name].count += item.quantity;
        productCount[name].revenue += item.price * item.quantity;
      });
    });
    const topProducts = Object.entries(productCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    // Payment methods
    const paymentData = {};
    activeOrders.forEach(o => {
      const method = o.payment_method || 'efectivo';
      paymentData[method] = (paymentData[method] || 0) + (o.total || 0);
    });
    const paymentChart = Object.entries(paymentData).map(([name, value]) => ({ name, value }));

    // Total
    const totalSales = activeOrders.reduce((s, o) => s + (o.total || 0), 0);
    const avgTicket = activeOrders.length > 0 ? totalSales / activeOrders.length : 0;

    // Ingredient profitability
    const productProfits = topProducts.map(p => {
      const recipe = recipes.find(r => r.product_name === p.name);
      const cost = recipe ? (recipe.total_cost || 0) * p.count : 0;
      return { ...p, cost, profit: p.revenue - cost };
    }).sort((a, b) => b.profit - a.profit);

    // Inventory differences
    const invDiffs = inventoryCounts.filter(ic => Math.abs(ic.difference || 0) > 0).map(ic => ({
      name: ic.ingredient_name,
      difference: ic.difference || 0,
      money: ic.difference_money || 0,
    }));

    return { salesByHour, topProducts, paymentChart, totalSales, avgTicket, productProfits, invDiffs };
  }, [activeOrders, recipes, inventoryCounts]);

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`font-display font-bold text-xl ${color}`}>{value}</p>
    </Card>
  );

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="font-display text-2xl font-bold">Reportes</h2>
        <p className="text-sm text-muted-foreground mt-1">{format(new Date(), "d 'de' MMMM, yyyy")}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Ventas del día" value={`$${stats.totalSales.toFixed(0)}`} color="text-primary" />
        <StatCard icon={ShoppingBag} label="Órdenes" value={activeOrders.length} color="text-amber-500" />
        <StatCard icon={TrendingUp} label="Ticket promedio" value={`$${stats.avgTicket.toFixed(0)}`} color="text-blue-500" />
        <StatCard icon={Award} label="Más vendido" value={stats.topProducts[0]?.name || '—'} color="text-purple-500" />
      </div>

      {/* Sales by hour */}
      {stats.salesByHour.length > 0 && (
        <Card className="p-4">
          <h3 className="font-display font-bold mb-4">Ventas por hora</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.salesByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value) => [`$${value}`, 'Ventas']} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Top products */}
        <Card className="p-4">
          <h3 className="font-display font-bold mb-3">Productos más vendidos</h3>
          <div className="space-y-2">
            {stats.topProducts.slice(0, 5).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <span className="font-medium">{p.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">{p.count}</span>
                  <span className="text-muted-foreground ml-2">${p.revenue.toFixed(0)}</span>
                </div>
              </div>
            ))}
            {stats.topProducts.length === 0 && <p className="text-sm text-muted-foreground">Sin datos aún</p>}
          </div>
        </Card>

        {/* Payment methods */}
        <Card className="p-4">
          <h3 className="font-display font-bold mb-3">Métodos de pago</h3>
          {stats.paymentChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={stats.paymentChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: $${value}`} fontSize={11}>
                  {stats.paymentChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => [`$${value}`]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos aún</p>
          )}
        </Card>
      </div>

      {/* Most profitable */}
      <Card className="p-4">
        <h3 className="font-display font-bold mb-3">Productos más rentables</h3>
        <div className="space-y-2">
          {stats.productProfits.slice(0, 5).map((p, i) => (
            <div key={p.name} className="flex items-center justify-between text-sm bg-secondary/50 rounded-lg px-3 py-2">
              <span className="font-medium">{p.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{p.count} vendidos</span>
                <span className="text-muted-foreground">Costo: ${p.cost.toFixed(0)}</span>
                <span className="font-bold text-primary">Ganancia: ${p.profit.toFixed(0)}</span>
              </div>
            </div>
          ))}
          {stats.productProfits.length === 0 && <p className="text-sm text-muted-foreground">Sin datos aún</p>}
        </div>
      </Card>

      {/* Inventory differences */}
      {stats.invDiffs.length > 0 && (
        <Card className="p-4">
          <h3 className="font-display font-bold mb-3">Últimas diferencias de inventario</h3>
          <div className="space-y-2">
            {stats.invDiffs.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium">{d.name}</span>
                <div className="flex items-center gap-3">
                  <span className={d.difference >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {d.difference >= 0 ? '+' : ''}{d.difference.toFixed(1)}g
                  </span>
                  <span className="text-muted-foreground">${d.money.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
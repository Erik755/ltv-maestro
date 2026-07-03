import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, ClipboardList, Package, Wheat, BookOpen, 
  Box, Wallet, BarChart3, Settings, Menu, X, ChevronRight, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/', label: 'Nueva Venta', icon: ShoppingCart, color: 'text-emerald-500' },
  { path: '/ordenes', label: 'Órdenes', icon: ClipboardList, color: 'text-amber-500' },
  { path: '/inventariar', label: 'Inventariar', icon: Package, color: 'text-blue-500' },
  { path: '/ingredientes', label: 'Ingredientes', icon: Wheat, color: 'text-orange-500' },
  { path: '/recetas', label: 'Recetas', icon: BookOpen, color: 'text-purple-500' },
  { path: '/recipientes', label: 'Recipientes', icon: Box, color: 'text-cyan-500' },
  { path: '/corte', label: 'Corte de Caja', icon: Wallet, color: 'text-green-500' },
  { path: '/reportes', label: 'Reportes', icon: BarChart3, color: 'text-pink-500' },
  { path: '/config', label: 'Configuración', icon: Settings, color: 'text-gray-500' },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-sidebar-primary-foreground tracking-tight">
                La Tercera Vuelta
              </h1>
              <p className="text-xs text-sidebar-foreground/60 mt-0.5 font-body">
                Sistema de Punto de Venta
              </p>
            </div>
            <Button 
              variant="ghost" size="icon" 
              className="lg:hidden text-sidebar-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-sidebar-primary" : item.color)} />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-sidebar-primary" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>Cerrar sesión</span>
          </button>
          <p className="text-[10px] text-sidebar-foreground/40 text-center font-body pt-1">
            LTV POS v1.0 — Hecho con 🫶
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 flex-shrink-0">
          <Button 
            variant="ghost" size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-sm text-foreground lg:hidden">LTV</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground font-body">En línea</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
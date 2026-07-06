import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProductGrid from '@/components/sale/ProductGrid';
import TicketPanel from '@/components/sale/TicketPanel';
import ExtrasDialog from '@/components/sale/ExtrasDialog';
import EditPriceDialog from '@/components/sale/EditPriceDialog';
import { toast } from 'sonner';
import { CARD_COMMISSION_RATE, getRandomMicrocopy } from '@/lib/constants';
import { serializeOrderNotes, deserializeOrder } from '@/lib/utils';

export default function NewSale() {
  const [ticketItems, setTicketItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showExtras, setShowExtras] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products', { active: true }],
    queryFn: () => base44.entities.Product.filter({ is_active: true }),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['pendingOrders'],
    queryFn: async () => {
      const rawOrders = await base44.entities.Order.filter({ cut_id: null }, '-created_date');
      return rawOrders.map(deserializeOrder);
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: (orderData) => base44.entities.Order.create(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['todayOrdersReport'] });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, price }) => base44.entities.Product.update(id, { price }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Precio actualizado'); },
  });

  const handleAddProduct = (product) => {
    setSelectedProduct(product);
    setShowExtras(true);
  };

  const handleConfirmExtras = (extras, note) => {
    const extraPrice = extras.reduce((sum, e) => sum + (e.price || 0), 0);
    const newItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      price: selectedProduct.price + extraPrice,
      quantity: 1,
      extras: extras.map(e => e.label),
      note: note,
      base_price: selectedProduct.price,
    };

    setTicketItems(prev => {
      const existingIdx = prev.findIndex(
        i => i.product_id === newItem.product_id && 
        JSON.stringify(i.extras) === JSON.stringify(newItem.extras) &&
        i.note === newItem.note
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + 1 };
        return updated;
      }
      return [...prev, newItem];
    });
    setShowExtras(false);
    setSelectedProduct(null);
  };

  const handleQuickAdd = (product) => {
    const newItem = {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity: 1,
      extras: [],
      note: '',
      base_price: product.price,
    };
    setTicketItems(prev => {
      const existingIdx = prev.findIndex(
        i => i.product_id === newItem.product_id && i.extras.length === 0 && !i.note
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + 1 };
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const handleRemoveItem = (index) => {
    setTicketItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index, qty) => {
    if (qty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setTicketItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  };

  const handleCompleteSale = async (paymentMethod, customerName) => {
    if (ticketItems.length === 0) return;

    const subtotal = ticketItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const commission = paymentMethod === 'tarjeta' ? subtotal * CARD_COMMISSION_RATE : 0;
    const realIncome = subtotal - commission;
    const orderNumber = pendingOrders.length + 1;

    const orderData = {
      order_number: orderNumber,
      status: 'pendiente',
      items: ticketItems.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        price: i.price,
        quantity: i.quantity,
        extras: i.extras,
        note: i.note,
      })),
      subtotal,
      total: paymentMethod === 'cortesia' ? 0 : subtotal,
      payment_method: paymentMethod === 'cortesia' ? 'efectivo' : paymentMethod,
      card_commission: commission,
      real_income: paymentMethod === 'cortesia' ? 0 : realIncome,
      sale_date: new Date().toISOString().split('T')[0],
      notes: serializeOrderNotes('', paymentMethod, customerName),
    };

    await createOrderMutation.mutateAsync(orderData);

    // Deduct ingredients in parallel
    const updatePromises = [];
    for (const item of ticketItems) {
      const recipe = recipes.find(r => r.product_id === item.product_id);
      if (recipe?.ingredients) {
        for (const ri of recipe.ingredients) {
          const ingredient = ingredients.find(ing => ing.id === ri.ingredient_id);
          if (ingredient) {
            const deduction = ri.quantity * item.quantity;
            updatePromises.push(
              base44.entities.Ingredient.update(ingredient.id, {
                current_stock: Math.max(0, (ingredient.current_stock || 0) - deduction)
              })
            );
          }
        }
      }
    }
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    setTicketItems([]);
    toast.success(getRandomMicrocopy('sale_complete'));
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <h2 className="font-display text-2xl font-bold text-foreground">Nueva Venta</h2>
          <p className="text-sm text-muted-foreground mt-1">Orden #{pendingOrders.length + 1} del corte</p>
        </div>
        <ProductGrid 
          products={products} 
          onAdd={handleAddProduct}
          onQuickAdd={handleQuickAdd}
          onEditPrice={setEditingProduct}
        />
      </div>
      <TicketPanel
        items={ticketItems}
        onRemove={handleRemoveItem}
        onUpdateQuantity={handleUpdateQuantity}
        onCompleteSale={handleCompleteSale}
        isProcessing={createOrderMutation.isPending}
      />
      {showExtras && selectedProduct && (
        <ExtrasDialog
          product={selectedProduct}
          onConfirm={handleConfirmExtras}
          onClose={() => { setShowExtras(false); setSelectedProduct(null); }}
        />
      )}
      {editingProduct && (
        <EditPriceDialog
          product={editingProduct}
          onSave={(price) => updateProductMutation.mutate({ id: editingProduct.id, price })}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}
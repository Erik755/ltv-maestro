export const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'transferencia', label: 'Transferencia', icon: '📱' },
  { id: 'cortesia', label: 'Cortesía', icon: '🎁' },
];

export const CARD_COMMISSION_RATE = 0.035;

export const ORDER_STATUSES = [
  { id: 'pendiente', label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'preparando', label: 'Preparando', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'lista', label: 'Lista', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'entregada', label: 'Entregada', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { id: 'cancelada', label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200' },
];

export const EXTRAS = [
  { id: 'extra_nutella', label: 'Extra Nutella', price: 15 },
  { id: 'extra_queso', label: 'Extra Queso', price: 10 },
  { id: 'extra_fruta', label: 'Extra Fruta', price: 15 },
  { id: 'extra_nuez', label: 'Extra Nuez', price: 10 },
  { id: 'sin_queso', label: 'Sin Queso', price: 0 },
  { id: 'sin_fruta', label: 'Sin Fruta', price: 0 },
];

export const INVENTORY_REASONS = [
  { id: 'conteo_cierre', label: 'Conteo de cierre' },
  { id: 'conteo_apertura', label: 'Conteo de apertura' },
  { id: 'merma', label: 'Merma' },
  { id: 'producto_pegado', label: 'Producto pegado al bote' },
  { id: 'error_captura', label: 'Error de captura' },
  { id: 'prueba_receta', label: 'Prueba de receta' },
  { id: 'derrame', label: 'Derrame' },
  { id: 'otro', label: 'Otro' },
];

export const EXPENSE_CATEGORIES = [
  { id: 'ingredientes', label: 'Ingredientes' },
  { id: 'gas', label: 'Gas' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'limpieza', label: 'Limpieza' },
  { id: 'propinas', label: 'Propinas' },
  { id: 'otro', label: 'Otro' },
];

export const MICROCOPY = {
  inventory_ok: [
    "Todo cuadra, puedes respirar. 🧘",
    "Inventario guardado, reina del control. 👑",
    "Ni un gramo fuera de lugar. Perfección. ✨",
  ],
  inventory_warning: [
    "Hmm, algo no cuadra del todo... 🤔",
    "Alguien anda con la mano romántica con la Nutella. 🫣",
    "Esto ya huele a cucharada emocional. 🥄",
  ],
  inventory_bad: [
    "Houston, tenemos un problema de inventario. 🚨",
    "Aquí hay gato encerrado... o Nutella desaparecida. 🐱",
    "Esto necesita explicación urgente. 📋",
  ],
  sale_complete: [
    "¡Venta lista! A darle vuelta. 🎉",
    "¡Otra marquesita al mundo! 🌍",
    "Cha-ching! Dinero entrante. 💰",
  ],
};

export const getRandomMicrocopy = (category) => {
  const options = MICROCOPY[category] || [];
  return options[Math.floor(Math.random() * options.length)] || '';
};
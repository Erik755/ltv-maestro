import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

export const serializeOrderNotes = (userNotes, paymentMethod, customerName) => {
  let notes = userNotes || '';
  if (customerName && customerName.trim()) {
    notes = `[CLIENTE:${customerName.trim()}] ${notes}`.trim();
  }
  if (paymentMethod === 'cortesia') {
    notes = `${notes}\n[METADATA:payment_method=cortesia]`.trim();
  }
  return notes;
};

export const deserializeOrder = (o) => {
  if (!o) return o;
  let paymentMethod = o.payment_method;
  let notes = o.notes || '';
  let customerName = '';

  // Extraer método de pago de cortesía si existe
  if (notes.includes('[METADATA:payment_method=cortesia]')) {
    paymentMethod = 'cortesia';
    notes = notes.replace('[METADATA:payment_method=cortesia]', '').trim();
  }

  // Extraer nombre del cliente si existe
  const clientMatch = notes.match(/^\[CLIENTE:([^\]]+)\]/);
  if (clientMatch) {
    customerName = clientMatch[1].trim();
    notes = notes.replace(/^\[CLIENTE:[^\]]+\]\s*/, '').trim();
  }

  return {
    ...o,
    payment_method: paymentMethod,
    customer_name: customerName,
    notes: notes,
  };
};

import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

export const serializeOrderNotes = (userNotes, paymentMethod) => {
  if (paymentMethod === 'cortesia') {
    return `${userNotes || ''}\n[METADATA:payment_method=cortesia]`.trim();
  }
  return userNotes || '';
};

export const deserializeOrder = (o) => {
  if (!o) return o;
  if (o.notes && o.notes.includes('[METADATA:payment_method=cortesia]')) {
    return {
      ...o,
      payment_method: 'cortesia',
      notes: o.notes.replace('[METADATA:payment_method=cortesia]', '').trim(),
    };
  }
  return o;
};

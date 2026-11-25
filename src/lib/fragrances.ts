import { supabase } from './supabase';

export interface FragranceStock {
  name: string;
  quantity: number;
}

export interface FragranceOrder {
  id: string;
  fragrance_name: string;
  created_at: string;
  read_at: string | null;
  sensora_clients: { name: string; company_name: string } | null;
}

export const loadFragranceStock = async (): Promise<FragranceStock[]> => {
  if (!supabase) throw new Error('La conexión con Supabase no está configurada.');
  const { data, error } = await supabase.from('sensora_fragrance_stock').select('name, quantity');
  if (error) throw new Error('No se pudo consultar el stock de aromas.');
  return data ?? [];
};

export const updateFragranceStock = async (name: string, quantity: number): Promise<void> => {
  if (!supabase) throw new Error('La conexión con Supabase no está configurada.');
  const { data, error } = await supabase.from('sensora_fragrance_stock')
    .update({ quantity }).eq('name', name).select('name').single();
  if (error || !data) throw new Error('No se pudo actualizar el stock.');
};

export const orderFragrance = async (name: string): Promise<void> => {
  if (!supabase) throw new Error('La conexión con Supabase no está configurada.');
  const { error } = await supabase.rpc('sensora_order_fragrance', { requested_name: name });
  if (error) {
    if (error.message.includes('stock disponible')) throw new Error('Este aroma no tiene stock disponible.');
    if (error.message.includes('comercial asignado')) throw new Error('No tienes un comercial asignado.');
    throw new Error('No se pudo realizar el pedido. Inténtalo de nuevo.');
  }
};

export const loadFragranceOrders = async (): Promise<FragranceOrder[]> => {
  if (!supabase) throw new Error('La conexión con Supabase no está configurada.');
  const { data, error } = await supabase.from('sensora_fragrance_orders')
    .select('id, fragrance_name, created_at, read_at, sensora_clients(name, company_name)')
    .order('created_at', { ascending: false })
    .overrideTypes<FragranceOrder[], { merge: false }>();
  if (error) throw new Error('No se pudieron cargar las notificaciones.');
  return data ?? [];
};

export const markFragranceOrdersRead = async (orderIds: string[]): Promise<void> => {
  if (!supabase) throw new Error('La conexión con Supabase no está configurada.');
  const { error } = await supabase.rpc('sensora_mark_fragrance_orders_read', { order_ids: orderIds });
  if (error) throw new Error('No se pudieron marcar las notificaciones como leídas.');
};
import { supabase } from './supabase';

export interface InstallationClient {
  id: string;
  name: string;
  company_name: string;
  city: string;
}

export interface InstallationRecord {
  id: string;
  client_id: string;
  location_name: string;
  floor_number: string;
  room_number: string;
  product_name: string;
  scent: string;
  status: string;
  created_at: string;
}

export const loadInstallationClients = async (): Promise<InstallationClient[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('sensora_clients')
    .select('id, name, company_name, city')
    .order('name');

  if (error) throw new Error('No se pudieron cargar los clientes asignados.');
  return data ?? [];
};

export const loadInstallations = async (): Promise<InstallationRecord[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('sensora_installations')
    .select('id, client_id, location_name, floor_number, room_number, product_name, scent, status, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error('No se pudieron cargar las instalaciones. Comprueba que la migración esté aplicada.');
  return data ?? [];
};

export const createInstallation = async (input: {
  clientId: string;
  locationName: string;
  floorNumber: string;
  roomNumber: string;
  productName: string;
  scent: string;
}): Promise<InstallationRecord> => {
  if (!supabase) throw new Error('La conexión con Supabase no está configurada.');

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('La sesión ha caducado. Inicia sesión de nuevo.');

  const { data, error } = await supabase
    .from('sensora_installations')
    .insert({
      client_id: input.clientId,
      location_name: input.locationName.trim(),
      floor_number: input.floorNumber.trim(),
      room_number: input.roomNumber.trim(),
      product_name: input.productName.trim(),
      scent: input.scent,
      created_by: userData.user.id,
    })
    .select('id, client_id, location_name, floor_number, room_number, product_name, scent, status, created_at')
    .single();

  if (error) throw new Error('No se pudo guardar la instalación. Comprueba que el cliente esté asignado a este comercial.');
  return data;
};

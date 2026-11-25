import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface ClientAccount {
  id: string;
  name: string;
  company_name: string;
  contact_name: string;
  email: string;
  auth_email: string;
  phone: string;
  city: string;
  status: string;
  commercial_user_id: string | null;
  client_user_id: string | null;
}

export interface CommercialAccount {
  user_id: string;
  full_name: string;
}

export interface ClientAccountInput {
  clientId?: string;
  name: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  commercialId: string;
  password: string;
}

export const loadClientAccounts = async (): Promise<ClientAccount[]> => {
  if (!supabase) throw new Error('La conexión con Supabase no está configurada.');
  const { data, error } = await supabase.rpc('sensora_admin_client_accounts');
  if (error) throw new Error('No se pudieron cargar los clientes.');
  return data ?? [];
};

export const loadCommercialAccounts = async (): Promise<CommercialAccount[]> => {
  if (!supabase) throw new Error('La conexión con Supabase no está configurada.');
  const { data, error } = await supabase.from('sensora_profiles')
    .select('user_id, full_name').eq('role', 'comercial').order('full_name');
  if (error) throw new Error('No se pudieron cargar los comerciales.');
  return data ?? [];
};

export const manageClientAccount = async (action: 'create' | 'update' | 'delete', input: ClientAccountInput | { clientId: string }): Promise<void> => {
  if (!supabase) throw new Error('La conexión con Supabase no está configurada.');
  const { error } = await supabase.functions.invoke('manage-client-users', { body: { action, ...input } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json() as { error?: string };
        if (body.error) throw new Error(body.error);
      } catch (responseError) {
        if (responseError instanceof Error && !(responseError instanceof SyntaxError)) throw responseError;
      }
    }
    throw new Error('No se pudo completar la operación. Comprueba la conexión e inténtalo de nuevo.');
  }
};
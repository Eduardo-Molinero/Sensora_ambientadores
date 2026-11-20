import type { UserRole } from '../types';
import { supabase } from './supabase';

const isUserRole = (role: unknown): role is UserRole =>
  role === 'administrador' || role === 'comercial' || role === 'cliente';

const getUserRole = async (userId: string): Promise<UserRole> => {
  if (!supabase) throw new Error('Supabase no está configurado.');

  const { data, error } = await supabase
    .from('sensora_profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error('No se pudo verificar el perfil. Comprueba que la migración de perfiles esté aplicada.');
  if (!data || !isUserRole(data.role)) throw new Error('La cuenta no tiene un rol habilitado. Contacta con el administrador.');

  return data.role;
};

export const signInForRole = async (email: string, password: string, expectedRole: UserRole) => {
  if (!supabase) throw new Error('La conexión con Supabase todavía no está configurada.');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('No se pudo iniciar sesión. Revisa el correo y la contraseña.');

  try {
    const role = await getUserRole(data.user.id);
    if (role !== expectedRole) {
      throw new Error(`Esta cuenta no tiene acceso como ${expectedRole}.`);
    }
    return role;
  } catch (error) {
    await supabase.auth.signOut({ scope: 'local' });
    throw error;
  }
};

export const restoreUserRole = async (): Promise<UserRole | null> => {
  if (!supabase) return null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }

  try {
    return await getUserRole(data.user.id);
  } catch {
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }
};

export const signOutUser = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
};

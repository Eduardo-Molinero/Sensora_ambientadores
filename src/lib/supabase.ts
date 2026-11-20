/**
 * Conexión a Supabase preparada para el proyecto existente SENSORA-BUSINESS.
 *
 * Esta app no crea una nueva base de datos ni modifica tablas existentes.
 * Mientras no se completen las variables de entorno reales, la app trabaja
 * en modo demo con datos localmente definidos para diseñar la experiencia.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfig = {
  projectName: 'SENSORA-BUSINESS',
  url: supabaseUrl || 'https://tu-proyecto.supabase.co',
  anonKey: supabaseAnonKey || 'demo-anon-key',
  mode: supabaseUrl && supabaseAnonKey ? 'connected' : 'demo',
} as const;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storage: AsyncStorage,
            persistSession: true,
            autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabase);

export const getSupabaseClient = () => supabase;

export const getSupabaseStatusText = () =>
  isSupabaseConfigured ? 'Conectado a SENSORA-BUSINESS' : 'Modo demo local';

export const supabaseReadinessNotes = [
  'Sin crear una base de datos nueva.',
  'Sin alterar la estructura existente del proyecto SENSORA-BUSINESS.',
  'La app usa datos demo hasta que el proyecto real esté conectado.',
  'Las credenciales reales se gestionan desde variables de entorno.',
];

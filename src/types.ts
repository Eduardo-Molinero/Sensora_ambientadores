export type UserRole = 'administrador' | 'comercial' | 'cliente';
export type MenuAccent = 'gold' | 'olive' | 'charcoal' | 'cream';

export interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  accent: MenuAccent;
  badge?: string;
}

export interface DashboardStat {
  label: string;
  value: string;
  trend: string;
  accent: MenuAccent;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  contact: string;
  phone: string;
  status: 'Activa' | 'Pendiente' | 'En revisión';
  city: string;
}

export interface Installation {
  id: string;
  client: string;
  address: string;
  products: string;
  status: 'Operativa' | 'Pendiente' | 'Revisión';
}

export interface RequestItem {
  id: string;
  client: string;
  type: string;
  priority: 'Alta' | 'Media' | 'Baja';
  status: 'Pendiente' | 'Aprobada' | 'Rechazada';
}

export interface Commercial {
  id: string;
  name: string;
  area: string;
  customers: number;
}

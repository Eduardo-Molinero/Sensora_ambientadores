import type { Client, Commercial, DashboardStat, Installation, MenuItem, RequestItem, UserRole } from '../types';

export const adminMenuItems: MenuItem[] = [
  { id: 'dashboard', title: 'Panel de control', subtitle: 'Indicadores', accent: 'gold', badge: '12' },
  { id: 'clientes', title: 'Clientes', subtitle: 'Fichas y visitas', accent: 'olive', badge: '193' },
  { id: 'comerciales', title: 'Comerciales', subtitle: 'Equipo y cobertura', accent: 'charcoal', badge: '5' },
  { id: 'catalogo', title: 'Catálogo', subtitle: 'Productos y refs', accent: 'cream', badge: '48' },
  { id: 'instalaciones', title: 'Instalaciones', subtitle: 'Activas y alertas', accent: 'gold', badge: '27' },
  { id: 'productos', title: 'Productos instalados', subtitle: 'Inventario', accent: 'olive', badge: '94' },
  { id: 'reposiciones', title: 'Reposiciones', subtitle: 'Planificación', accent: 'charcoal', badge: '31' },
  { id: 'solicitudes', title: 'Solicitudes', subtitle: 'Pendientes', accent: 'cream', badge: '24' },
  { id: 'informes', title: 'Informes', subtitle: 'Estadísticas', accent: 'gold', badge: '5' },
  { id: 'configuracion', title: 'Configuración', subtitle: 'Ajustes', accent: 'olive' },
];

export const commercialMenuItems: MenuItem[] = [
  { id: 'clientes', title: 'Clientes', subtitle: 'Agenda y fase', accent: 'gold', badge: '68' },
  { id: 'instalaciones', title: 'Instalaciones', subtitle: 'Cobertura', accent: 'olive', badge: '24' },
  { id: 'solicitudes', title: 'Solicitudes', subtitle: 'Aprobaciones', accent: 'charcoal', badge: '11' },
  { id: 'reuniones', title: 'Visitas', subtitle: 'Programación', accent: 'cream', badge: '7' },
  { id: 'alertas', title: 'Alertas', subtitle: 'Reposiciones', accent: 'gold', badge: '9' },
  { id: 'perfil', title: 'Mi perfil', subtitle: 'Datos y métricas', accent: 'olive' },
];

export const clientMenuItems: MenuItem[] = [
  { id: 'mis-instalaciones', title: 'Mis instalaciones', subtitle: 'Ubicaciones y estado', accent: 'gold', badge: '3' },
  { id: 'solicitudes', title: 'Solicitudes', subtitle: 'Pedido y reposición', accent: 'olive', badge: '2' },
  { id: 'productos', title: 'Productos', subtitle: 'Mis consumos', accent: 'charcoal', badge: '18' },
  { id: 'informes', title: 'Historial', subtitle: 'Reposiciones', accent: 'cream', badge: '12' },
  { id: 'soporte', title: 'Soporte', subtitle: 'Atención al cliente', accent: 'gold' },
  { id: 'perfil', title: 'Perfil', subtitle: 'Datos corporativos', accent: 'olive' },
];

export const dashboardStats: Record<UserRole, DashboardStat[]> = {
  administrador: [
    { label: 'Ingresos', value: '€18.420', trend: '+12,4%', accent: 'gold' },
    { label: 'Clientes', value: '193', trend: '+8 hoy', accent: 'olive' },
    { label: 'Solicitudes', value: '24', trend: '5 nuevas', accent: 'charcoal' },
    { label: 'Reposiciones', value: '31', trend: '7 días', accent: 'cream' },
  ],
  comercial: [
    { label: 'Ventas', value: '€9.640', trend: '+9,1%', accent: 'gold' },
    { label: 'Clientes', value: '68', trend: '+4 este mes', accent: 'olive' },
    { label: 'Visitas', value: '17', trend: '6 programadas', accent: 'charcoal' },
    { label: 'Cobertura', value: '94%', trend: 'Alta', accent: 'cream' },
  ],
  cliente: [
    { label: 'Productos', value: '24', trend: 'instalados', accent: 'gold' },
    { label: 'Reposiciones', value: '3', trend: 'próximas', accent: 'olive' },
    { label: 'Solicitudes', value: '2', trend: 'pendientes', accent: 'charcoal' },
    { label: 'Servicio', value: '98%', trend: 'satisfacción', accent: 'cream' },
  ],
};

export const clients: Client[] = [
  { id: 'CLI-1042', name: 'Hotel Santa Isabel', company: 'Santa Isabel SL', contact: 'Lucía Ortega', phone: '+34 600 120 445', status: 'Activa', city: 'Granada' },
  { id: 'CLI-1189', name: 'Centro de Formación', company: 'SmartCampus', contact: 'David García', phone: '+34 611 340 789', status: 'Pendiente', city: 'Armilla' },
  { id: 'CLI-1276', name: 'Oficina técnica', company: 'Aromas Pro', contact: 'Marta Ruiz', phone: '+34 655 210 990', status: 'Activa', city: 'Granada' },
  { id: 'CLI-1324', name: 'Clínica Arco Iris', company: 'Arco Iris Salud', contact: 'Ana Torres', phone: '+34 698 332 120', status: 'En revisión', city: 'La Zubia' },
];

export const installations: Installation[] = [
  { id: 'INS-2008', client: 'Hotel Santa Isabel', address: 'Calle Recogidas 18, Granada', products: '6 difusores, 18 aerosoles', status: 'Operativa' },
  { id: 'INS-2011', client: 'Centro de Formación', address: 'Avenida de la Constitución 45, Armilla', products: '4 difusores, 8 recargas', status: 'Pendiente' },
  { id: 'INS-2034', client: 'Oficina técnica', address: 'Polígono El Majuelo 12, Granada', products: '10 nebulizadores', status: 'Operativa' },
  { id: 'INS-2090', client: 'Clínica Arco Iris', address: 'Carretera de la Sierra 210, La Zubia', products: '5 esencias ventiladas', status: 'Revisión' },
];

export const requests: RequestItem[] = [
  { id: 'REQ-405', client: 'Centro de Formación', type: 'Reposición adelantada', priority: 'Alta', status: 'Pendiente' },
  { id: 'REQ-402', client: 'Hotel Santa Isabel', type: 'Pedido de productos', priority: 'Media', status: 'Aprobada' },
  { id: 'REQ-410', client: 'Clínica Arco Iris', type: 'Ajuste de aromas', priority: 'Alta', status: 'Pendiente' },
  { id: 'REQ-398', client: 'Oficina técnica', type: 'Mantenimiento', priority: 'Baja', status: 'Rechazada' },
];

export const commercials: Commercial[] = [
  { id: 'COM-01', name: 'Marta López', area: 'Granada centro', customers: 28 },
  { id: 'COM-02', name: 'Cristian Bernal', area: 'Costa y Alpujarra', customers: 19 },
  { id: 'COM-03', name: 'Lucía Sanz', area: 'Norte', customers: 17 },
];

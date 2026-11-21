import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { restoreUserRole, signInForRole, signOutUser } from './src/lib/auth';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';

const roleOptions = [
  { key: 'administrador', label: 'Administrador', subtitle: 'Acceso completo a la empresa', icon: '👑' },
  { key: 'comercial', label: 'Comercial', subtitle: 'Tus clientes e instalaciones', icon: '📊' },
  { key: 'cliente', label: 'Cliente', subtitle: 'Tus instalaciones y solicitudes', icon: '🧴' },
] as const;

const adminMetrics = [
  { icon: '👥', value: '4', label: 'Clientes' },
  { icon: '📍', value: '5', label: 'Instalaciones' },
  { icon: '🧴', value: '1', label: 'Reposiciones vencidas' },
  { icon: '📨', value: '2', label: 'Solicitudes pendientes' },
];

const recentRequests = [
  { title: 'Adelantar reposición', subtitle: 'Hotel Alhambra Palace', status: 'PENDIENTE' },
  { title: 'Producto adicional', subtitle: 'Clínica Dental Genil', status: 'PENDIENTE' },
];

const pendingRequests = [
  {
    id: 'hotel-alhambra',
    client: 'HOTEL ALHAMBRA PALACE',
    status: 'PENDIENTE',
    title: 'Adelantar reposición',
    detail: 'Spa y wellness • 13 nov 2026',
    note: '"Evento de empresa el viernes."',
    actions: ['Rechazar', 'Aprobar'],
  },
  {
    id: 'clinica-genil',
    client: 'CLÍNICA DENTAL GENIL',
    status: 'PENDIENTE',
    title: '1 × Ambientador Automático Mini',
    detail: 'Sala de espera • 11 nov 2026',
    note: '"Nuevo aseo en planta alta."',
    actions: ['Rechazar', 'Aprobar'],
  },
  {
    id: 'gimnasio-nedava',
    client: 'GIMNASIO NEDAVA FIT',
    status: 'APROBADA',
    title: '4 × Recarga Spray Neutralizante',
    detail: 'Vestuarios • 05 nov 2026',
    note: '',
    actions: ['Marcar como completada'],
  },
];

const commercialClients = [
  { name: 'Hotel Alhambra Palace', area: 'Hotelería', installs: 5, nextVisit: '12 nov' },
  { name: 'Clínica Dental Genil', area: 'Salud', installs: 3, nextVisit: '15 nov' },
  { name: 'Gimnasio Nedava Fit', area: 'Fitness', installs: 4, nextVisit: '21 nov' },
  { name: 'Café La Plazuela', area: 'Hostelería', installs: 2, nextVisit: '23 nov' },
];

const clientInstallations = [
  { name: 'Recepción principal', type: 'Ambientador automático', scent: 'Naranja y vainilla', status: 'Activo' },
  { name: 'Sala de espera', type: 'Ambientador mini', scent: 'Eucalipto fresco', status: 'Revisión', },
  { name: 'Zona wellness', type: 'Ambientador de pared', scent: 'Aloe y jazmín', status: 'Activo' },
];

const clientRequests = [
  { id: 'client-request-1', title: 'Cambio de ambientador', subtitle: 'Recepción principal', date: 'Solicitado • 12 nov 2026', status: 'PENDIENTE' },
  { id: 'client-request-2', title: 'Ajuste de intensidad', subtitle: 'Sala de espera', date: 'Solicitado • 07 nov 2026', status: 'APROBADA' },
];

const commercialInstallationsByClient: Record<string, { name: string; scent: string; status: string }[]> = {
  'Hotel Alhambra Palace': [
    { name: 'Spa y wellness', scent: 'Aroma relajante', status: 'Activo' },
    { name: 'Recepción', scent: 'Naranja y vainilla', status: 'Revisión' },
  ],
  'Clínica Dental Genil': [
    { name: 'Sala de espera', scent: 'Eucalipto fresco', status: 'Activo' },
    { name: 'Consultorio 3', scent: 'Lino y cítrico', status: 'Activo' },
  ],
  'Gimnasio Nedava Fit': [
    { name: 'Zona cardio', scent: 'Energizante', status: 'Activo' },
    { name: 'Vestuarios', scent: 'Neutralizante', status: 'Pendiente' },
  ],
  'Café La Plazuela': [
    { name: 'Barra', scent: 'Café tostado', status: 'Activo' },
    { name: 'Terraza', scent: 'Jazmín', status: 'Revisión' },
  ],
};

type Screen = 'landing' | 'administrador' | 'adminSolicitudes' | 'comercial' | 'cliente';
type UserRole = 'administrador' | 'comercial' | 'cliente';

const getScreenFromLocation = (): Screen => {
  if (typeof window === 'undefined') return 'landing';

  const rawHash = window.location.hash.replace('#', '').trim();
  if (rawHash === 'administrador' || rawHash === 'adminSolicitudes' || rawHash === 'comercial' || rawHash === 'cliente') {
    return rawHash;
  }

  return 'landing';
};

const getRoleFromScreen = (screen: Screen): UserRole => {
  if (screen === 'comercial') return 'comercial';
  if (screen === 'cliente') return 'cliente';
  return 'administrador';
};

const getScreenForRole = (role: UserRole): Screen => {
  if (role === 'comercial') return 'comercial';
  if (role === 'cliente') return 'cliente';
  return 'administrador';
};

export default function App() {
  const { width } = useWindowDimensions();
  const [screen, setScreen] = useState<Screen>(() => isSupabaseConfigured ? 'landing' : getScreenFromLocation());
  const [currentRole, setCurrentRole] = useState<UserRole>(() => isSupabaseConfigured ? 'administrador' : getRoleFromScreen(getScreenFromLocation()));
  const [activeTab, setActiveTab] = useState(() => {
    const initialScreen = getScreenFromLocation();
    return initialScreen === 'comercial' ? 'Clientes' : initialScreen === 'cliente' ? 'Instalaciones' : 'Panel';
  });
  const [loginRole, setLoginRole] = useState<UserRole>('administrador');
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminFilter, setAdminFilter] = useState('Todas');
  const [requestStatus, setRequestStatus] = useState<Record<string, string>>({
    'hotel-alhambra': 'PENDIENTE',
    'clinica-genil': 'PENDIENTE',
    'gimnasio-nedava': 'APROBADA',
  });
  const [demoNotice, setDemoNotice] = useState('');
  const [selectedCommercialClient, setSelectedCommercialClient] = useState<string | null>(null);
  const [clientRequestDraft, setClientRequestDraft] = useState<{ installation: string; example: string } | null>(null);
  const [clientRequestList, setClientRequestList] = useState(clientRequests);
  const [nextDemoRequestId, setNextDemoRequestId] = useState(3);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const isMobile = width < 900;
  const bottomNavItems = currentRole === 'administrador'
    ? [
      { label: 'Panel', icon: '🏠' },
      { label: 'Clientes', icon: '👥' },
      { label: 'Instalaciones', icon: '📍' },
      { label: 'Reposiciones', icon: '🧴' },
      { label: 'Más', icon: '☰' },
    ]
    : currentRole === 'comercial'
      ? [{ label: 'Clientes', icon: '👥' }, { label: 'Instalaciones', icon: '📍' }]
      : [{ label: 'Instalaciones', icon: '📍' }, { label: 'Solicitudes', icon: '📨' }];
  const roleLabel = currentRole.toUpperCase();

  const filters = ['Todas', 'Pendiente', 'Aprobada', 'Rechazada', 'Completada'];

  const visibleRequests = pendingRequests.filter((request) => {
    const status = requestStatus[request.id] ?? request.status;
    if (adminFilter === 'Todas') return true;
    return status.toLowerCase() === adminFilter.toLowerCase();
  });

  const handleRequestAction = (requestId: string, action: string) => {
    if (action === 'Aprobar') {
      setRequestStatus((current) => ({ ...current, [requestId]: 'APROBADA' }));
      setDemoNotice('Solicitud aprobada en la demo.');
    }

    if (action === 'Rechazar') {
      setRequestStatus((current) => ({ ...current, [requestId]: 'RECHAZADA' }));
      setDemoNotice('Solicitud rechazada en la demo.');
    }

    if (action === 'Marcar como completada') {
      setRequestStatus((current) => ({ ...current, [requestId]: 'COMPLETADA' }));
      setDemoNotice('Solicitud marcada como completada.');
    }
  };

  const moreMenuItems: Array<{ key: string; label: string; icon: string; danger?: boolean }> = [
    { key: 'panel', label: 'Panel', icon: '🏠' },
    { key: 'clientes', label: 'Clientes', icon: '👥' },
    { key: 'instalaciones', label: 'Instalaciones', icon: '📍' },
    { key: 'reponedor', label: 'Reposiciones', icon: '🧴' },
    { key: 'solicitudes', label: 'Solicitudes', icon: '📨' },
    { key: 'comerciales', label: 'Comerciales', icon: '💼' },
    { key: 'catalogo', label: 'Catálogo', icon: '📚' },
    { key: 'productos', label: 'Productos', icon: '🧾' },
    { key: 'informes', label: 'Informes', icon: '📊' },
    { key: 'configuracion', label: 'Configuración', icon: '⚙️' },
    { key: 'salir', label: 'Salir', icon: '🚪', danger: true },
  ];

  const handleMoreMenuAction = (key: string) => {
    if (currentRole !== 'administrador') return;

    setShowMoreMenu(false);
    setActiveTab('Panel');

    if (key === 'panel') {
      navigateToScreen('administrador');
      return;
    }

    if (key === 'clientes') {
      navigateToScreen('comercial');
      setActiveTab('Clientes');
      return;
    }

    if (key === 'instalaciones') {
      navigateToScreen('cliente');
      setActiveTab('Instalaciones');
      return;
    }

    if (key === 'solicitudes') {
      navigateToScreen('adminSolicitudes');
      return;
    }

    if (key === 'comerciales') {
      navigateToScreen('comercial');
      setActiveTab('Clientes');
      return;
    }

    if (key === 'catalogo' || key === 'productos' || key === 'informes' || key === 'configuracion') {
      setDemoNotice(`Sección de demo: ${key}.`);
      navigateToScreen('administrador');
      return;
    }

    if (key === 'salir') {
      void handleLogout();
      return;
    }

    if (key === 'reponedor') {
      navigateToScreen('cliente');
      setActiveTab('Reposiciones');
      setDemoNotice('Ejemplo de reposición abierto desde Más.');
    }
  };

  const navigateToScreen = (nextScreen: Screen, roleOverride?: UserRole, authenticatedOverride = false) => {
    const activeRole = roleOverride ?? currentRole;
    const canOpenProtectedScreen = !isSupabaseConfigured || isAuthenticated || authenticatedOverride;
    const destination = nextScreen === 'landing' || canOpenProtectedScreen
      ? activeRole === 'administrador' || nextScreen === 'landing' ? nextScreen : getScreenForRole(activeRole)
      : 'landing';
    setScreen(destination);

    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.hash = destination === 'landing' ? '' : destination;

    if (url.hash !== window.location.hash) {
      window.history.pushState({ screen: destination }, '', url);
      return;
    }

    window.history.replaceState({ screen: destination }, '', url);
  };

  const handleBottomNavPress = (item: string) => {
    setActiveTab(item);

    if (currentRole !== 'administrador') {
      navigateToScreen(getScreenForRole(currentRole));
      return;
    }

    if (item === 'Más') {
      setShowMoreMenu(true);
      return;
    }

    if (item === 'Panel') {
      navigateToScreen('administrador');
      return;
    }

    if (item === 'Clientes') {
      navigateToScreen('comercial');
      return;
    }

    if (item === 'Instalaciones' || item === 'Reposiciones') {
      navigateToScreen('cliente');
      if (item === 'Reposiciones') setDemoNotice('Vista de reposiciones de ejemplo.');
    }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Escribe tu correo y contraseña.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');
    try {
      const role = await signInForRole(loginEmail.trim(), loginPassword, loginRole);
      setIsAuthenticated(true);
      setCurrentRole(role);
      setActiveTab(role === 'administrador' ? 'Panel' : role === 'comercial' ? 'Clientes' : 'Instalaciones');
      setShowLogin(false);
      setLoginPassword('');
      navigateToScreen(getScreenForRole(role), role, true);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = () => {
    setCurrentRole(loginRole);
    setActiveTab(loginRole === 'administrador' ? 'Panel' : loginRole === 'comercial' ? 'Clientes' : 'Instalaciones');
    setShowLogin(false);
    navigateToScreen(getScreenForRole(loginRole), loginRole);
  };

  const handleLogout = async () => {
    setShowMoreMenu(false);
    setShowLogin(false);
    setLoginPassword('');
    setIsAuthenticated(false);
    try {
      await signOutUser();
    } finally {
      setCurrentRole('administrador');
      setActiveTab('Panel');
      navigateToScreen('landing', 'administrador');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHistoryChange = () => {
      const requestedScreen = getScreenFromLocation();
      const canOpenProtectedScreen = !isSupabaseConfigured || isAuthenticated;
      const destination = requestedScreen === 'landing' || canOpenProtectedScreen
        ? currentRole === 'administrador' || requestedScreen === 'landing' ? requestedScreen : getScreenForRole(currentRole)
        : 'landing';
      setScreen(destination);

      if (destination !== requestedScreen) {
        const url = new URL(window.location.href);
        url.hash = destination;
        window.history.replaceState({ screen: destination }, '', url);
      }
    };

    window.addEventListener('popstate', handleHistoryChange);
    window.addEventListener('hashchange', handleHistoryChange);

    return () => {
      window.removeEventListener('popstate', handleHistoryChange);
      window.removeEventListener('hashchange', handleHistoryChange);
    };
  }, [currentRole, isAuthenticated]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let isMounted = true;

    void restoreUserRole()
      .then((role) => {
        if (!isMounted || !role) return;
        setIsAuthenticated(true);
        setCurrentRole(role);
        setActiveTab(role === 'administrador' ? 'Panel' : role === 'comercial' ? 'Clientes' : 'Instalaciones');
        navigateToScreen(getScreenForRole(role), role, true);
      })
      .catch(() => {
        if (isMounted) setLoginError('No se pudo restaurar la sesión. Inicia sesión de nuevo.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && isAuthenticated) {
        setIsAuthenticated(false);
        setCurrentRole('administrador');
        setActiveTab('Panel');
        setShowLogin(false);
        navigateToScreen('landing', 'administrador');
      }
    });

    return () => subscription.unsubscribe();
  }, [isAuthenticated]);

  const renderBottomNav = () => (
    <View style={styles.bottomNav}>
      {bottomNavItems.map((item) => (
        <Pressable key={item.label} onPress={() => handleBottomNavPress(item.label)} style={[styles.navItem, activeTab === item.label && styles.navItemActive]}>
          <Text style={[styles.navIcon, activeTab === item.label && styles.navIconActive]}>{item.icon}</Text>
          <Text style={[styles.navLabel, activeTab === item.label && styles.navLabelActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderLanding = () => (
    <View style={[styles.landingPanel, isMobile ? styles.landingPanelMobile : styles.landingPanelDesktop]}>
      <View style={styles.logoCircle}><Text style={styles.logoText}>S</Text></View>
      <Text style={styles.brand}>SENSORA</Text>
      <Text style={styles.brandSub}>AMBIENTADORES • GRANADA</Text>
      <Text style={styles.tagline}>{`El arte de aromatizar espacios,\n gestionado con elegancia.`}</Text>

      <Text style={styles.sectionLabel}>{isSupabaseConfigured ? 'ACCESO POR PERFIL' : 'ACCESO DE DEMOSTRACIÓN'}</Text>

      {roleOptions.map((role) => (
        <Pressable
          key={role.key}
          onPress={() => {
            setLoginRole(role.key);
            setShowMoreMenu(false);
            setLoginEmail('');
            setLoginPassword('');
            setLoginError('');
            setShowLogin(true);
          }}
          style={styles.roleCard}
        >
          <View style={styles.roleIcon}><Text style={styles.roleIconText}>{role.icon}</Text></View>
          <View style={styles.roleCopy}>
            <Text style={styles.roleTitle}>{role.label}</Text>
            <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );

  const renderLogin = () => {
    const role = roleOptions.find((option) => option.key === loginRole);

    return (
      <View style={[styles.landingPanel, isMobile ? styles.landingPanelMobile : styles.landingPanelDesktop]}>
        <View style={styles.logoCircle}><Text style={styles.logoText}>S</Text></View>
        <Text style={styles.brand}>SENSORA</Text>
        <Text style={styles.brandSub}>ACCESO SEGURO</Text>

        <View style={styles.loginCard}>
          <View style={styles.loginHeader}>
            <View style={styles.roleIcon}><Text style={styles.roleIconText}>{role?.icon}</Text></View>
            <View style={styles.loginCopy}>
              <Text style={styles.loginTitle}>Acceso {role?.label.toLowerCase()}</Text>
              <Text style={styles.loginSubtitle}>{role?.subtitle}</Text>
            </View>
          </View>

          <TextInput
            style={styles.loginInput}
            value={loginEmail}
            onChangeText={setLoginEmail}
            placeholder="Correo electrónico"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextInput
            style={styles.loginInput}
            value={loginPassword}
            onChangeText={setLoginPassword}
            placeholder="Contraseña"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={() => {
              if (isSupabaseConfigured) void handleLogin();
            }}
          />
          {loginError ? <Text style={styles.loginError}>{loginError}</Text> : null}
          <Pressable
            disabled={!isSupabaseConfigured || isLoggingIn}
            style={[styles.loginButton, (!isSupabaseConfigured || isLoggingIn) && styles.loginButtonDisabled]}
            onPress={() => void handleLogin()}
          >
            <Text style={styles.loginButtonText}>
              {isLoggingIn ? 'Verificando…' : isSupabaseConfigured ? 'Iniciar sesión' : 'Conexión pendiente'}
            </Text>
          </Pressable>

          {!isSupabaseConfigured ? (
            <>
              <View style={styles.loginNotice}>
                <Text style={styles.loginNoticeText}>Añade la URL y la clave pública de Supabase a `.env` para habilitar el acceso real.</Text>
              </View>
              <Pressable style={styles.loginButton} onPress={handleDemoLogin}>
                <Text style={styles.loginButtonText}>Entrar en modo demo</Text>
              </Pressable>
            </>
          ) : null}

          <Pressable style={styles.loginBackButton} onPress={() => setShowLogin(false)}>
            <Text style={styles.loginBackText}>Volver a los accesos</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderAdminDashboard = () => (
    <SafeAreaView style={styles.safeAreaContent}>
      <View style={[styles.screenWrap, styles.adminScreenWrap]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.layoutPanel, isMobile ? styles.layoutPanelMobile : styles.layoutPanelDesktop]}>
        <View style={styles.topHeader}>
          <Text style={styles.brandSmall}>SENSORA</Text>
          <Pressable style={styles.roleBadge} onPress={() => void handleLogout()}>
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </Pressable>
        </View>

        <Text style={styles.dateText}>SÁBADO, 14 DE NOVIEMBRE</Text>
        <Text style={styles.mainTitle}>Buenos días</Text>

        {demoNotice ? <View style={styles.noticeBanner}><Text style={styles.noticeText}>{demoNotice}</Text></View> : null}

        <View style={styles.featureCard}>
          <Text style={styles.featureLabel}>PRÓXIMA REPOSICIÓN</Text>
          <Text style={styles.featureName}>Spa y wellness</Text>
          <Text style={styles.featureDate}>09 nov 2026 • 5 días</Text>
        </View>

        <View style={styles.metricsGrid}>
          {adminMetrics.map((item) => (
            <View key={item.label} style={styles.metricCard}>
              <Text style={styles.metricIcon}>{item.icon}</Text>
              <Text style={styles.metricValue}>{item.value}</Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Solicitudes recientes</Text>

        <View style={styles.requestList}>
          {recentRequests.map((request) => (
            <Pressable key={request.title} style={styles.requestCard} onPress={() => navigateToScreen('adminSolicitudes')}>
              <View style={styles.requestTextWrap}>
                <Text style={styles.requestTitle}>{request.title}</Text>
                <Text style={styles.requestSubtitle}>{request.subtitle}</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{request.status}</Text>
              </View>
            </Pressable>
          ))}
        </View>

          </View>
        </ScrollView>
        {renderBottomNav()}
      </View>
    </SafeAreaView>
  );

  const renderAdminSolicitudes = () => (
    <SafeAreaView style={styles.safeAreaContent}>
      <View style={[styles.screenWrap, styles.adminScreenWrap]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.layoutPanel, isMobile ? styles.layoutPanelMobile : styles.layoutPanelDesktop]}>
        <View style={styles.topHeader}>
          <Text style={styles.brandSmall}>SENSORA</Text>
          <Pressable style={styles.roleBadge} onPress={() => void handleLogout()}>
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabelSmall}>PETICIONES DE CLIENTES</Text>
        <Text style={styles.mainTitle}>Solicitudes</Text>

        <View style={styles.filterRow}>
          {filters.map((filter) => {
            const isActive = adminFilter === filter;
            return (
              <Pressable key={filter} onPress={() => setAdminFilter(filter)} style={[styles.filterPill, isActive && styles.filterPillActive]}>
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{filter}</Text>
              </Pressable>
            );
          })}
        </View>

        {demoNotice ? <View style={styles.noticeBanner}><Text style={styles.noticeText}>{demoNotice}</Text></View> : null}

        <View style={styles.requestListDetail}>
          {visibleRequests.map((request) => {
            const currentStatus = requestStatus[request.id] ?? request.status;
            const isSingleAction = request.actions.length === 1;

            return (
              <View key={request.id} style={styles.detailCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardClient}>{request.client}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>{currentStatus}</Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{request.title}</Text>
                <Text style={styles.cardDetail}>{request.detail}</Text>
                {request.note ? <Text style={styles.cardNote}>{request.note}</Text> : null}

                {isSingleAction ? (
                  <Pressable style={styles.fullButton} onPress={() => handleRequestAction(request.id, request.actions[0])}>
                    <Text style={styles.fullButtonText}>{request.actions[0]}</Text>
                  </Pressable>
                ) : (
                  <View style={styles.buttonRow}>
                    <Pressable style={styles.secondaryButton} onPress={() => handleRequestAction(request.id, request.actions[0])}>
                      <Text style={styles.secondaryButtonText}>{request.actions[0]}</Text>
                    </Pressable>
                    <Pressable style={styles.primaryButton} onPress={() => handleRequestAction(request.id, request.actions[1])}>
                      <Text style={styles.primaryButtonText}>{request.actions[1]}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>

          </View>
        </ScrollView>
        {renderBottomNav()}
      </View>
    </SafeAreaView>
  );

  const renderCommercial = () => (
    <SafeAreaView style={styles.safeAreaContent}>
      <View style={styles.screenWrap}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.layoutPanel, isMobile ? styles.layoutPanelMobile : styles.layoutPanelDesktop]}>
            <View style={styles.topHeader}>
              <Text style={styles.brandSmall}>SENSORA</Text>
              <Pressable style={styles.roleBadge} onPress={() => void handleLogout()}>
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </Pressable>
            </View>

            <Text style={styles.dateText}>CLIENTES E INSTALACIONES</Text>
            <Text style={styles.mainTitle}>Panel comercial</Text>

            {demoNotice ? <View style={styles.noticeBanner}><Text style={styles.noticeText}>{demoNotice}</Text></View> : null}

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricIcon}>👥</Text>
                <Text style={styles.metricValue}>24</Text>
                <Text style={styles.metricLabel}>Clientes</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricIcon}>📍</Text>
                <Text style={styles.metricValue}>38</Text>
                <Text style={styles.metricLabel}>Instalaciones</Text>
              </View>
            </View>

            {currentRole === 'administrador' || activeTab === 'Clientes' ? (
              <>
                <Text style={styles.sectionTitle}>Clientes activos</Text>

                <View style={styles.requestList}>
                  {commercialClients.map((client) => (
                    <View key={client.name} style={styles.detailCard}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardClient}>{client.area}</Text>
                        <View style={styles.statusPill}>
                          <Text style={styles.statusText}>{client.nextVisit}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardTitle}>{client.name}</Text>
                      <Text style={styles.cardDetail}>{client.installs} instalaciones activas</Text>
                      <Pressable style={styles.fullButton} onPress={() => {
                        setSelectedCommercialClient(client.name);
                        setActiveTab('Instalaciones');
                        setDemoNotice(`Mostrando instalaciones de ${client.name}.`);
                      }}>
                        <Text style={styles.fullButtonText}>Ver instalaciones</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {currentRole === 'administrador' || activeTab === 'Instalaciones' ? (
              <View style={styles.requestList}>
                {(selectedCommercialClient
                  ? [[selectedCommercialClient, commercialInstallationsByClient[selectedCommercialClient] ?? []] as const]
                  : Object.entries(commercialInstallationsByClient)
                ).map(([clientName, installations]) => (
                  <View key={clientName} style={styles.detailCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardClient}>{clientName}</Text>
                      {selectedCommercialClient ? (
                        <Pressable onPress={() => setSelectedCommercialClient(null)}>
                          <Text style={styles.closeLink}>Ver todas</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    {installations.map((installation) => (
                      <View key={installation.name} style={styles.miniListRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.miniTitle}>{installation.name}</Text>
                          <Text style={styles.miniDetail}>{installation.scent}</Text>
                        </View>
                        <View style={styles.smallTag}>
                          <Text style={styles.smallTagText}>{installation.status}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>

        {renderBottomNav()}
      </View>
    </SafeAreaView>
  );

  const renderClient = () => (
    <SafeAreaView style={styles.safeAreaContent}>
      <View style={styles.screenWrap}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.layoutPanel, isMobile ? styles.layoutPanelMobile : styles.layoutPanelDesktop]}>
            <View style={styles.topHeader}>
              <Text style={styles.brandSmall}>SENSORA</Text>
              <Pressable style={styles.roleBadge} onPress={() => void handleLogout()}>
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </Pressable>
            </View>

            <Text style={styles.dateText}>INSTALACIONES Y SOLICITUDES</Text>
            <Text style={styles.mainTitle}>Tus instalaciones</Text>

            {demoNotice ? <View style={styles.noticeBanner}><Text style={styles.noticeText}>{demoNotice}</Text></View> : null}

            {currentRole === 'administrador' || activeTab === 'Instalaciones' ? (
              <View style={styles.requestList}>
                {clientInstallations.map((installation) => (
                  <View key={installation.name} style={styles.detailCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardClient}>{installation.type}</Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusText}>{installation.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardTitle}>{installation.name}</Text>
                    <Text style={styles.cardDetail}>{installation.scent}</Text>
                    <Pressable style={styles.fullButton} onPress={() => {
                      setClientRequestDraft({
                        installation: installation.name,
                        example: `Cambio de reponedor solicitado para ${installation.name}. Se propone aroma ${installation.scent.toLowerCase()} y revisión en 48 horas.`,
                      });
                      setActiveTab('Instalaciones');
                      setDemoNotice(`Solicitud de cambio a reponedor creada para ${installation.name}.`);
                    }}>
                      <Text style={styles.fullButtonText}>Solicitar cambio a reponedor</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {clientRequestDraft && (currentRole === 'administrador' || activeTab === 'Instalaciones') ? (
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardClient}>SOLICITUD DE EJEMPLO</Text>
                  <Pressable onPress={() => setClientRequestDraft(null)}>
                    <Text style={styles.closeLink}>Cerrar</Text>
                  </Pressable>
                </View>
                <Text style={styles.cardTitle}>{clientRequestDraft.installation}</Text>
                <Text style={styles.cardDetail}>{clientRequestDraft.example}</Text>
                <Pressable style={styles.primaryButton} onPress={() => {
                  setClientRequestList((current) => [{
                    id: `client-request-${nextDemoRequestId}`,
                    title: 'Cambio a reponedor',
                    subtitle: clientRequestDraft.installation,
                    date: 'Solicitado • hoy',
                    status: 'PENDIENTE',
                  }, ...current]);
                  setNextDemoRequestId((current) => current + 1);
                  if (currentRole === 'cliente') setActiveTab('Solicitudes');
                  setDemoNotice(`Solicitud enviada correctamente para ${clientRequestDraft.installation}.`);
                  setClientRequestDraft(null);
                }}>
                  <Text style={styles.primaryButtonText}>Enviar ejemplo</Text>
                </Pressable>
              </View>
            ) : null}

            {currentRole === 'administrador' || activeTab === 'Solicitudes' ? (
              <>
                <Text style={styles.sectionTitle}>Solicitudes</Text>

                <View style={styles.requestList}>
                  {clientRequestList.map((request) => (
                    <View key={request.id} style={styles.detailCard}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardClient}>{request.date}</Text>
                        <View style={styles.statusPill}>
                          <Text style={styles.statusText}>{request.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardTitle}>{request.title}</Text>
                      <Text style={styles.cardDetail}>{request.subtitle}</Text>
                      <Pressable style={styles.deleteButton} onPress={() => {
                        setClientRequestList((current) => current.filter((item) => item.id !== request.id));
                        setDemoNotice(`Solicitud eliminada: ${request.title}.`);
                      }}>
                        <Text style={styles.deleteButtonText}>Eliminar</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>

        {renderBottomNav()}
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      {screen === 'landing' && (showLogin ? renderLogin() : renderLanding())}
      {screen === 'administrador' && renderAdminDashboard()}
      {screen === 'adminSolicitudes' && renderAdminSolicitudes()}
      {screen === 'comercial' && renderCommercial()}
      {screen === 'cliente' && renderClient()}

      {currentRole === 'administrador' && showMoreMenu ? (
        <View style={styles.moreOverlay}>
          <View style={styles.moreMenuCard}>
            <View style={styles.moreHeader}>
              <Text style={styles.moreTitle}>Menú</Text>
              <Pressable onPress={() => setShowMoreMenu(false)}>
                <Text style={styles.closeMore}>×</Text>
              </Pressable>
            </View>

            <View style={styles.moreGrid}>
              {moreMenuItems.map((item) => (
                <Pressable
                  key={item.key}
                  style={[styles.moreItem, item.danger && styles.moreItemDanger]}
                  onPress={() => handleMoreMenuAction(item.key)}
                >
                  <Text style={[styles.moreIcon, item.danger && styles.moreIconDanger]}>{item.icon}</Text>
                  <Text style={[styles.moreItemText, item.danger && styles.moreItemTextDanger]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const colors = {
  cream: '#e9e1d4',
  dark: '#0b0d0b',
  gold: '#d8b66d',
  goldSoft: '#efd8a3',
  white: '#f6f0e9',
  muted: '#706d67',
  line: '#d6c7a5',
  card: '#f3efe8',
  cardSoft: '#efe8de',
  red: '#d75d5d',
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  safeAreaContent: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  screenWrap: { flex: 1, width: '100%', position: 'relative' },
  adminScreenWrap: { maxWidth: 1100, alignSelf: 'center' },
  scrollContent: { flexGrow: 1, paddingBottom: 110 },
  landingPanel: {
    flex: 1,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 26,
    paddingBottom: 28,
  },
  landingPanelMobile: { width: '100%', maxWidth: 430, justifyContent: 'center' },
  landingPanelDesktop: { width: '100%', maxWidth: '100%', minHeight: '100%', justifyContent: 'center', paddingLeft: 20, paddingRight: 20 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: 'rgba(216, 182, 109, 0.08)' },
  logoText: { color: colors.gold, fontSize: 32, fontWeight: '500', fontFamily: 'Georgia' },
  brand: { marginTop: 18, color: colors.gold, fontSize: 52, letterSpacing: 1.8, fontWeight: '500', fontFamily: 'Georgia', textAlign: 'center' },
  brandSub: { marginTop: 6, color: colors.gold, fontSize: 10, letterSpacing: 2.8, textTransform: 'uppercase', fontWeight: '600', textAlign: 'center' },
  tagline: { marginTop: 22, color: colors.white, textAlign: 'center', fontSize: 19, lineHeight: 28, fontStyle: 'italic', fontFamily: 'Georgia', paddingHorizontal: 28 },
  sectionLabel: { marginTop: 74, marginBottom: 12, color: colors.gold, fontSize: 11, letterSpacing: 2, fontWeight: '700', textAlign: 'center' },
  sectionLabelSmall: { color: colors.muted, fontSize: 10, letterSpacing: 2, marginTop: 2, marginBottom: 4, textTransform: 'uppercase' },
  roleCard: { width: '84%', maxWidth: 540, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: colors.gold, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  roleIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  roleIconText: { color: colors.dark, fontSize: 18, fontWeight: '700' },
  roleCopy: { flex: 1 },
  roleTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  roleSubtitle: { marginTop: 2, color: colors.muted, fontSize: 12 },
  layoutPanel: { width: '100%', maxWidth: 1100, flex: 1, backgroundColor: colors.cream, paddingHorizontal: 24, paddingTop: 26, paddingBottom: 110, alignSelf: 'center' },
  layoutPanelMobile: { maxWidth: 430 },
  layoutPanelDesktop: { maxWidth: 1100 },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  brandSmall: { color: colors.dark, fontSize: 20, letterSpacing: 2, fontWeight: '700', fontFamily: 'Georgia' },
  roleBadge: { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.line },
  roleBadgeText: { color: colors.dark, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  dateText: { color: colors.muted, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2, marginBottom: 4 },
  mainTitle: { color: colors.dark, fontSize: 40, lineHeight: 46, fontWeight: '700', fontFamily: 'Georgia', marginBottom: 18 },
  featureCard: { backgroundColor: colors.dark, borderRadius: 26, paddingHorizontal: 22, paddingVertical: 20, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4, borderWidth: 1, borderColor: 'rgba(216,182,109,0.2)' },
  featureLabel: { color: colors.gold, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 },
  featureName: { color: colors.white, fontSize: 30, fontWeight: '700', fontFamily: 'Georgia', marginBottom: 6 },
  featureDate: { color: colors.white, fontSize: 16, opacity: 0.9 },
  noticeBanner: { backgroundColor: colors.dark, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, borderWidth: 1, borderColor: colors.gold },
  noticeText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  infoCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, marginTop: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  closeLink: { color: colors.red, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  miniListRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, marginTop: 10 },
  miniTitle: { color: colors.dark, fontSize: 15, fontWeight: '700' },
  miniDetail: { color: colors.muted, fontSize: 12, marginTop: 2 },
  smallTag: { backgroundColor: colors.cardSoft, borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 8, paddingVertical: 6 },
  smallTagText: { color: colors.dark, fontSize: 10, fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  metricCard: { width: '47%', backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 18, paddingVertical: 16, minHeight: 120, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  metricIcon: { color: colors.gold, fontSize: 24, marginBottom: 8, textAlign: 'center' },
  metricValue: { color: colors.dark, fontSize: 28, fontWeight: '700', lineHeight: 32, fontFamily: 'Georgia' },
  metricLabel: { marginTop: 4, color: colors.dark, fontSize: 14 },
  sectionTitle: { color: colors.dark, fontSize: 20, fontWeight: '700', marginBottom: 14, fontFamily: 'Georgia' },
  requestList: { gap: 12 },
  requestCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16 },
  requestTextWrap: { flex: 1, paddingRight: 12 },
  requestTitle: { color: colors.dark, fontSize: 18, marginBottom: 4, fontWeight: '500' },
  requestSubtitle: { color: colors.muted, fontSize: 13 },
  statusPill: { backgroundColor: colors.cardSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.line },
  statusText: { color: colors.dark, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  filterPill: { borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: colors.line, paddingHorizontal: 18, paddingVertical: 9 },
  filterPillActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  filterText: { color: colors.dark, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: colors.white },
  requestListDetail: { gap: 12 },
  detailCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2, borderLeftWidth: 3, borderLeftColor: colors.gold },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardClient: { color: colors.muted, fontSize: 10, letterSpacing: 1.8, lineHeight: 15, textTransform: 'uppercase', flex: 1, paddingRight: 12 },
  cardTitle: { color: colors.dark, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  cardDetail: { color: colors.muted, fontSize: 13, marginBottom: 8 },
  cardNote: { color: colors.dark, fontSize: 14, fontStyle: 'italic', marginBottom: 18 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  secondaryButton: { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.red, borderRadius: 999, paddingVertical: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  secondaryButtonText: { color: colors.red, fontSize: 14, fontWeight: '700' },
  primaryButton: { flex: 1, backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  primaryButtonText: { color: colors.dark, fontSize: 14, fontWeight: '700' },
  fullButton: { backgroundColor: colors.cardSoft, borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingVertical: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  fullButtonText: { color: colors.dark, fontWeight: '700', fontSize: 14 },
  loginCard: { width: '100%', maxWidth: 460, marginTop: 28, padding: 22, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(216,182,109,0.55)', backgroundColor: 'rgba(255,255,255,0.035)' },
  loginHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  loginCopy: { flex: 1 },
  loginTitle: { color: colors.white, fontSize: 21, fontWeight: '700' },
  loginSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  loginInput: { minHeight: 50, color: colors.white, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(216,182,109,0.4)', borderRadius: 10, paddingHorizontal: 14, marginBottom: 12, fontSize: 15 },
  loginError: { color: '#ff9b8f', fontSize: 13, marginBottom: 12 },
  loginNotice: { backgroundColor: 'rgba(216,182,109,0.1)', borderWidth: 1, borderColor: colors.gold, borderRadius: 10, padding: 12, marginBottom: 14 },
  loginNoticeText: { color: colors.white, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  loginButton: { minHeight: 48, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: colors.dark, fontSize: 14, fontWeight: '700' },
  loginBackButton: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  loginBackText: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  deleteButton: { marginTop: 12, alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(215, 93, 93, 0.08)', borderWidth: 1, borderColor: colors.red },
  deleteButtonText: { color: colors.red, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  bottomNav: { position: 'absolute', left: 20, right: 20, bottom: 18, backgroundColor: colors.dark, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 10, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.dark, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 8 },
  navItemActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  navIcon: { color: colors.gold, fontSize: 18, marginBottom: 4 },
  navIconActive: { color: colors.white },
  navLabel: { color: colors.gold, fontSize: 9, fontWeight: '600' },
  navLabelActive: { color: colors.white },
  moreOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(12, 11, 11, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  moreMenuCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.cream,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  moreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  moreTitle: { color: colors.dark, fontSize: 26, fontWeight: '700', fontFamily: 'Georgia' },
  closeMore: { color: colors.dark, fontSize: 28, fontWeight: '400' },
  moreGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  moreItem: {
    width: '30%',
    minHeight: 90,
    backgroundColor: colors.cardSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  moreItemDanger: { borderColor: colors.red },
  moreIcon: { color: colors.dark, fontSize: 28, marginBottom: 6 },
  moreIconDanger: { color: colors.red },
  moreItemText: { color: colors.dark, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  moreItemTextDanger: { color: colors.red },
});

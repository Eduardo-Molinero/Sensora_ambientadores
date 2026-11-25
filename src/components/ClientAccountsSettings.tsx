import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  loadClientAccounts,
  loadCommercialAccounts,
  manageClientAccount,
  type ClientAccount,
  type ClientAccountInput,
  type CommercialAccount,
} from '../lib/clientAccounts';

const emptyForm = (): ClientAccountInput => ({
  name: '', companyName: '', contactName: '', email: '', phone: '', city: '', commercialId: '', password: '',
});

export default function ClientAccountsSettings({ onBack }: { onBack: () => void }) {
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [commercials, setCommercials] = useState<CommercialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<ClientAccountInput>(emptyForm);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ClientAccount | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [clients, salespeople] = await Promise.all([loadClientAccounts(), loadCommercialAccounts()]);
      setAccounts(clients);
      setCommercials(salespeople);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const openForm = (account?: ClientAccount, createAccess = false) => {
    setError('');
    setNotice('');
    setConfirmPassword('');
    setForm(account ? {
      clientId: account.id,
      name: account.name,
      companyName: account.company_name,
      contactName: account.contact_name,
      email: account.auth_email || account.email,
      phone: account.phone,
      city: account.city,
      commercialId: account.commercial_user_id || '',
      password: '',
    } : emptyForm());
    setMode(!account || createAccess ? 'create' : 'edit');
  };

  const setField = (field: keyof ClientAccountInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeForm = () => {
    if (busyRef.current) return;
    setMode(null);
    setForm(emptyForm());
    setConfirmPassword('');
    setError('');
  };

  const save = async () => {
    if (busyRef.current || !mode) return;
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Indica el nombre del cliente y un correo válido.');
      return;
    }
    if (mode === 'create' || form.password) {
      if (form.password.length < 12 || form.password.length > 72) {
        setError('La contraseña debe tener entre 12 y 72 caracteres.');
        return;
      }
      if (form.password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await manageClientAccount(mode === 'create' ? 'create' : 'update', form);
      setMode(null);
      setForm(emptyForm());
      setConfirmPassword('');
      setNotice(mode === 'create' ? 'Acceso de cliente creado.' : 'Datos del cliente actualizados.');
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el cliente.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const removeAccess = async () => {
    if (!deleteTarget || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await manageClientAccount('delete', { clientId: deleteTarget.id });
      setDeleteTarget(null);
      setNotice('Acceso eliminado. Se conservan las instalaciones y los pedidos.');
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el acceso.');
      setDeleteTarget(null);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const visibleAccounts = accounts.filter((account) =>
    [account.name, account.company_name, account.contact_name, account.auth_email, account.email]
      .some((value) => value.toLowerCase().includes(search.trim().toLowerCase())));
  const hasAccount = !!accounts.find((account) => account.id === form.clientId)?.client_user_id;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.brand}>SENSORA</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver al panel" style={styles.back} onPress={onBack} disabled={busy}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
        </View>
        <Text style={styles.eyebrow}>ADMINISTRADOR</Text>
        <Text style={styles.title}>Gestión de clientes</Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error && !mode ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {mode ? (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>{mode === 'create' ? 'Crear acceso de cliente' : 'Editar cliente'}</Text>
            <Text style={styles.label}>Nombre de la empresa *</Text>
            <TextInput accessibilityLabel="Nombre de la empresa" style={styles.input} value={form.name} onChangeText={(value) => setField('name', value)} maxLength={150} editable={!busy} />
            <Text style={styles.label}>Sector o razón social</Text>
            <TextInput accessibilityLabel="Sector o razón social" style={styles.input} value={form.companyName} onChangeText={(value) => setField('companyName', value)} maxLength={150} editable={!busy} />
            <Text style={styles.label}>Persona de contacto</Text>
            <TextInput accessibilityLabel="Persona de contacto" style={styles.input} value={form.contactName} onChangeText={(value) => setField('contactName', value)} maxLength={150} editable={!busy} />
            <Text style={styles.label}>Correo de acceso *</Text>
            <TextInput accessibilityLabel="Correo de acceso" style={styles.input} value={form.email} onChangeText={(value) => setField('email', value)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} editable={!busy} />
            <Text style={styles.label}>Teléfono</Text>
            <TextInput accessibilityLabel="Teléfono" style={styles.input} value={form.phone} onChangeText={(value) => setField('phone', value)} keyboardType="phone-pad" maxLength={40} editable={!busy} />
            <Text style={styles.label}>Ciudad</Text>
            <TextInput accessibilityLabel="Ciudad" style={styles.input} value={form.city} onChangeText={(value) => setField('city', value)} maxLength={100} editable={!busy} />
            <Text style={styles.label}>Comercial asignado</Text>
            <View style={styles.commercialChoices}>
              {[{ user_id: '', full_name: 'Sin asignar' }, ...commercials].map((commercial) => (
                <Pressable key={commercial.user_id || 'none'} accessibilityRole="radio" accessibilityState={{ checked: form.commercialId === commercial.user_id }} disabled={busy} onPress={() => setField('commercialId', commercial.user_id)} style={[styles.choice, form.commercialId === commercial.user_id && styles.choiceSelected]}>
                  <Text style={[styles.choiceText, form.commercialId === commercial.user_id && styles.choiceTextSelected]}>{commercial.full_name || 'Comercial'}</Text>
                </Pressable>
              ))}
            </View>
            {mode === 'create' || hasAccount ? (
              <>
                <Text style={styles.label}>{mode === 'create' ? 'Contraseña *' : 'Nueva contraseña (opcional)'}</Text>
                <TextInput accessibilityLabel="Contraseña del cliente" style={styles.input} value={form.password} onChangeText={(value) => setField('password', value)} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" maxLength={72} editable={!busy} />
                <Text style={styles.hint}>Entre 12 y 72 caracteres.</Text>
                <Text style={styles.label}>Confirmar contraseña</Text>
                <TextInput accessibilityLabel="Confirmar contraseña del cliente" style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" maxLength={72} editable={!busy} />
              </>
            ) : null}
            {error ? <Text accessibilityRole="alert" style={[styles.error, styles.formError]}>{error}</Text> : null}
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" style={styles.secondary} onPress={closeForm} disabled={busy}><Text style={styles.secondaryText}>Cancelar</Text></Pressable>
              <Pressable accessibilityRole="button" style={[styles.primary, busy && styles.disabled]} onPress={() => void save()} disabled={busy}><Text style={styles.primaryText}>{busy ? 'Guardando…' : mode === 'create' ? 'Crear acceso' : 'Guardar cambios'}</Text></Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Clientes ({accounts.length})</Text>
              <Pressable accessibilityRole="button" style={styles.create} onPress={() => openForm()} disabled={loading}><Text style={styles.createText}>+ Nuevo cliente</Text></Pressable>
            </View>
            <TextInput accessibilityLabel="Buscar clientes" style={styles.search} value={search} onChangeText={setSearch} placeholder="Buscar por empresa o correo" placeholderTextColor="#706d67" />
            {loading ? <Text style={styles.muted}>Cargando clientes…</Text> : null}
            {!loading && error ? <Pressable accessibilityRole="button" style={styles.retry} onPress={() => void refresh()}><Text style={styles.primaryText}>Reintentar</Text></Pressable> : null}
            {!loading && !error && visibleAccounts.length === 0 ? <Text style={styles.muted}>No hay clientes que mostrar.</Text> : null}
            {visibleAccounts.map((account) => (
              <View key={account.id} style={styles.row}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowName}>{account.name}</Text>
                  <Text style={styles.accountStatus}>{account.client_user_id ? 'Acceso activo' : 'Sin acceso'}</Text>
                </View>
                <Text style={styles.rowDetail}>{account.auth_email || account.email || 'Sin correo'}</Text>
                {account.phone ? <Text style={styles.rowDetail}>{account.phone}</Text> : null}
                <View style={styles.rowActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${account.name}`} style={styles.rowButton} onPress={() => openForm(account)}><Text style={styles.rowButtonText}>Editar</Text></Pressable>
                  {account.client_user_id ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar acceso de ${account.name}`} style={styles.rowButton} onPress={() => { setError(''); setDeleteTarget(account); }}><Text style={styles.deleteText}>Eliminar acceso</Text></Pressable>
                  ) : (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Crear acceso para ${account.name}`} style={styles.rowButton} onPress={() => openForm(account, true)}><Text style={styles.rowButtonText}>Crear acceso</Text></Pressable>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      {deleteTarget ? (
        <View style={styles.overlay}>
          <View style={styles.confirmDialog}>
            <Text style={styles.sectionTitle}>Eliminar acceso</Text>
            <Text style={styles.confirmText}>Se eliminará el acceso de {deleteTarget.name}. Sus instalaciones y pedidos se conservarán.</Text>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => setDeleteTarget(null)} disabled={busy}><Text style={styles.secondaryText}>Cancelar</Text></Pressable>
              <Pressable accessibilityRole="button" style={[styles.danger, busy && styles.disabled]} onPress={() => void removeAccess()} disabled={busy}><Text style={styles.dangerText}>{busy ? 'Eliminando…' : 'Eliminar acceso'}</Text></Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', backgroundColor: '#e9e1d4' },
  content: { width: '100%', maxWidth: 850, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 26, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  brand: { color: '#0b0d0b', fontFamily: 'Georgia', fontWeight: '700', fontSize: 20, letterSpacing: 2 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d6c7a5' },
  backText: { color: '#0b0d0b', fontSize: 24 },
  eyebrow: { color: '#706d67', fontSize: 12, marginBottom: 4 },
  title: { color: '#0b0d0b', fontFamily: 'Georgia', fontSize: 32, fontWeight: '700', marginBottom: 20 },
  sectionTitle: { color: '#0b0d0b', fontFamily: 'Georgia', fontSize: 20, fontWeight: '700' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  create: { backgroundColor: '#0b0d0b', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11 },
  createText: { color: '#d8b66d', fontSize: 13, fontWeight: '700' },
  search: { backgroundColor: '#f6f0e9', color: '#0b0d0b', borderWidth: 1, borderColor: '#d6c7a5', borderRadius: 8, minHeight: 46, paddingHorizontal: 12, marginVertical: 14 },
  row: { borderBottomWidth: 1, borderColor: '#d6c7a5', paddingVertical: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  rowName: { flex: 1, color: '#0b0d0b', fontSize: 16, fontWeight: '700' },
  accountStatus: { color: '#706d67', fontSize: 11, fontWeight: '700' },
  rowDetail: { color: '#706d67', fontSize: 13, marginTop: 4 },
  rowActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  rowButton: { paddingVertical: 8, paddingHorizontal: 4 },
  rowButtonText: { color: '#3e4d3e', fontSize: 13, fontWeight: '700' },
  deleteText: { color: '#ae3f3f', fontSize: 13, fontWeight: '700' },
  form: { paddingTop: 4 },
  label: { color: '#0b0d0b', fontSize: 13, fontWeight: '700', marginTop: 15, marginBottom: 6 },
  input: { minHeight: 46, backgroundColor: '#f6f0e9', color: '#0b0d0b', borderWidth: 1, borderColor: '#d6c7a5', borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  hint: { color: '#706d67', fontSize: 12, marginTop: 5 },
  commercialChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderColor: '#d6c7a5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  choiceSelected: { backgroundColor: '#0b0d0b', borderColor: '#0b0d0b' },
  choiceText: { color: '#0b0d0b', fontSize: 12 },
  choiceTextSelected: { color: '#f6f0e9' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  primary: { flex: 1, minHeight: 46, backgroundColor: '#d8b66d', borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
  primaryText: { color: '#0b0d0b', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  secondary: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: '#d6c7a5', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { color: '#0b0d0b', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  muted: { color: '#706d67', fontSize: 13, marginVertical: 12 },
  notice: { color: '#254d36', backgroundColor: '#dfeade', padding: 12, borderRadius: 8, marginBottom: 12 },
  error: { color: '#8f2929', backgroundColor: '#f6dedd', padding: 12, borderRadius: 8, marginBottom: 12 },
  formError: { marginTop: 16, marginBottom: 0 },
  retry: { alignSelf: 'flex-start', backgroundColor: '#d8b66d', borderRadius: 8, padding: 12 },
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmDialog: { width: '100%', maxWidth: 420, backgroundColor: '#f3efe8', borderWidth: 1, borderColor: '#d8b66d', borderRadius: 8, padding: 20 },
  confirmText: { color: '#0b0d0b', fontSize: 14, lineHeight: 20, marginTop: 10 },
  danger: { flex: 1, minHeight: 46, backgroundColor: '#ae3f3f', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  dangerText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
import { useEffect, useState, type FormEvent } from 'react';
import {
  User,
  LogOut,
  RefreshCw,
  Package,
  MessageSquare,
  Lock,
  Save,
  KeyRound,
} from 'lucide-react';
import type { Order } from '../types';
import { useAuth } from '../services/auth/AuthContext';
import { authApi } from '../services/auth/authClient';

type Mode = 'guest' | 'login' | 'register' | 'profile';

const INPUT_CLS =
  'w-full border border-neutral-300 px-3 py-2 text-xs uppercase focus:border-black focus:outline-none bg-white';
const LABEL_CLS = 'text-[10px] font-extrabold tracking-widest uppercase block mb-1';
const BTN_PRIMARY =
  'w-full bg-black text-white py-3 text-xs font-extrabold tracking-widest uppercase hover:bg-neutral-900 transition-colors flex items-center justify-center gap-2';

/**
 * Tercera pestaña del Store (NL-13): cuenta del comprador.
 * - Invitado: formularios de inicio de sesión / registro (email+contraseña).
 * - Registrado: perfil (nombre/teléfono), historial de pedidos, cambio de
 *   contraseña, "Contact Us" (crea tickets gestionables en el Admin).
 */
export default function ProfileView() {
  const { user, validating, login, register, logout, refresh, updateProfile, changePassword, createTicket } =
    useAuth();

  const [mode, setMode] = useState<Mode>(user ? 'profile' : 'guest');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  // Profile edit
  const [editName, setEditName] = useState(user?.fullName ?? '');
  const [editPhone, setEditPhone] = useState(user?.phone ?? '');
  // Password change
  const [curPassword, setCurPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  // Contact form
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.fullName ?? '');
      setEditPhone(user.phone ?? '');
      setMode('profile');
    }
  }, [user]);

  const handleAuthAction = async (
    action: () => Promise<void>,
    errorLabel: string,
  ): Promise<void> => {
    setBusy(true);
    setError(null);
    setNotice(null);
    await new Promise((r) => setTimeout(r, 0));
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : errorLabel);
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginEmail || !loginPassword) {
      setError('Ingresa email y contraseña');
      return;
    }
    await handleAuthAction(
      () => login(loginEmail, loginPassword),
      'No se pudo iniciar sesión',
    );
  };

  const submitRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regName.trim() || !/^[0-9+]{8,20}$/.test(regPhone)) {
      setError('Verifica nombre y teléfono (8-20 dígitos, con + si aplica)');
      return;
    }
    if (regPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    await handleAuthAction(
      () =>
        register({
          email: regEmail,
          password: regPassword,
          fullName: regName.trim(),
          phone: regPhone.trim(),
        }),
      'No se pudo crear la cuenta',
    );
  };

  const submitProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const msg = await updateProfile({
      fullName: editName.trim() || undefined,
      phone: editPhone.trim() || undefined,
    });
    setBusy(false);
    if (msg) setError(msg);
    else {
      setNotice('PERFIL ACTUALIZADO');
      setTimeout(() => setNotice(null), 2500);
    }
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    setBusy(true);
    const msg = await changePassword({ currentPassword: curPassword, newPassword });
    setBusy(false);
    if (msg) setError(msg);
    else {
      setCurPassword('');
      setNewPassword('');
      setNotice('CONTRASEÑA ACTUALIZADA');
      setTimeout(() => setNotice(null), 2500);
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    setError(null);
    const res = await authApi.myOrders(() => void refresh());
    setLoadingOrders(false);
    if (res.ok) setOrders(res.data as Order[]);
    else setError(res.error.message);
  };

  const submitContact = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!user) return;
    if (!contactSubject.trim() || contactMessage.trim().length < 5) {
      setError('Asunto obligatorio y mensaje de al menos 5 caracteres');
      return;
    }
    setBusy(true);
    const msg = await createTicket({
      name: user.fullName ?? '',
      email: user.email,
      phone: user.phone ?? '',
      subject: contactSubject.trim(),
      message: contactMessage.trim(),
    });
    setBusy(false);
    if (msg) setError(msg);
    else {
      setContactSubject('');
      setContactMessage('');
      setNotice('MENSAJE ENVIADO: pronto responderemos por tu contacto.');
      setTimeout(() => setNotice(null), 3000);
    }
  };

  if (validating) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-neutral-400 gap-2">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <p className="text-xs font-bold tracking-widest uppercase">Validando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 space-y-4">
        <div className="border-b border-neutral-200 pb-3">
          <h2 className="text-sm font-extrabold tracking-widest uppercase text-black">MI CUENTA</h2>
          <p className="text-[10px] text-neutral-400 tracking-wider uppercase">
            Inicia sesión o crea una cuenta para ver tus pedidos
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 text-[10px] font-bold px-3 py-2 uppercase">
            {error}
          </div>
        )}

        {mode === 'guest' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('login')}
              className={BTN_PRIMARY}
            >
              <User className="w-4 h-4" /> INICIAR SESIÓN
            </button>
            <button
              onClick={() => setMode('register')}
              className="w-full border border-black py-3 text-xs font-extrabold tracking-widest uppercase hover:bg-neutral-100"
            >
              CREAR CUENTA
            </button>
            <p className="text-[9px] text-neutral-500 uppercase text-center leading-relaxed">
              Consulta tu historial, gestiona tus datos y contáctanos.
            </p>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={submitLogin} className="space-y-3">
            <div>
              <label className={LABEL_CLS}>EMAIL</label>
              <input
                type="email"
                className={INPUT_CLS}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>CONTRASEÑA</label>
              <input
                type="password"
                className={INPUT_CLS}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              ENTRAR
            </button>
            <button
              type="button"
              onClick={() => setMode('guest')}
              className="text-[10px] font-bold text-neutral-400 hover:text-black uppercase underline"
            >
              Volver
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={submitRegister} className="space-y-3">
            <div>
              <label className={LABEL_CLS}>NOMBRE</label>
              <input
                className={INPUT_CLS}
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>EMAIL</label>
              <input
                type="email"
                className={INPUT_CLS}
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>TELÉFONO / WHATSAPP</label>
              <input
                type="tel"
                className={INPUT_CLS}
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="573001234567"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>CONTRASEÑA (mín. 6)</label>
              <input
                type="password"
                className={INPUT_CLS}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
              CREAR CUENTA
            </button>
            <button
              type="button"
              onClick={() => setMode('guest')}
              className="text-[10px] font-bold text-neutral-400 hover:text-black uppercase underline"
            >
              Volver
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="border-b border-neutral-200 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-extrabold tracking-widest uppercase text-black">MI CUENTA</h2>
          <p className="text-[10px] text-neutral-400 tracking-wider uppercase">
            {user.email} · {user.fullName ?? ''}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 hover:text-black uppercase underline"
        >
          <LogOut className="w-3.5 h-3.5" /> SALIR
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 text-[10px] font-bold px-3 py-2 uppercase">
          {error}
        </div>
      )}
      {notice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-700 text-[10px] font-bold px-3 py-2 uppercase">
          {notice}
        </div>
      )}

      {/* PERFIL */}
      <section className="border border-neutral-200 p-3 space-y-2">
        <h3 className="text-[11px] font-extrabold tracking-widest uppercase flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" /> MIS DATOS
        </h3>
        <form onSubmit={submitProfile} className="space-y-2">
          <input
            className={INPUT_CLS}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nombre"
          />
          <input
            type="tel"
            className={INPUT_CLS}
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            placeholder="Teléfono / WhatsApp"
          />
          <button type="submit" disabled={busy} className="w-full border border-black py-2 text-[10px] font-extrabold tracking-widest uppercase hover:bg-neutral-100 flex items-center justify-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> GUARDAR PERFIL
          </button>
        </form>
      </section>

      {/* HISTORIAL DE PEDIDOS */}
      <section className="border border-neutral-200 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-extrabold tracking-widest uppercase flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> MIS PEDIDOS
          </h3>
          <button
            onClick={loadOrders}
            disabled={loadingOrders}
            className="text-[10px] font-bold text-neutral-400 hover:text-black uppercase underline"
          >
            {loadingOrders ? 'CARGANDO...' : 'VER HISTORIAL'}
          </button>
        </div>
        {orders && (
          <div className="space-y-2">
            {orders.length === 0 ? (
              <p className="text-[10px] text-neutral-500 uppercase">Aún no tienes pedidos registrados.</p>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="bg-neutral-50 border border-neutral-200 p-2 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold uppercase">{o.id.slice(0, 8)}</span>
                    <span className="font-extrabold">${o.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500 uppercase mt-0.5">
                    <span>{new Date(o.createdAt).toLocaleDateString('es-CO')}</span>
                    <span>{o.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* CAMBIO DE CONTRASEÑA */}
      <section className="border border-neutral-200 p-3 space-y-2">
        <h3 className="text-[11px] font-extrabold tracking-widest uppercase flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5" /> CAMBIAR CONTRASEÑA
        </h3>
        <form onSubmit={submitPassword} className="space-y-2">
          <input
            type="password"
            className={INPUT_CLS}
            value={curPassword}
            onChange={(e) => setCurPassword(e.target.value)}
            placeholder="Contraseña actual"
          />
          <input
            type="password"
            className={INPUT_CLS}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nueva contraseña"
          />
          <button type="submit" disabled={busy} className="w-full border border-black py-2 text-[10px] font-extrabold tracking-widest uppercase hover:bg-neutral-100 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> CAMBIAR
          </button>
        </form>
      </section>

      {/* CONTACT US */}
      <section className="border border-neutral-200 p-3 space-y-2">
        <h3 className="text-[11px] font-extrabold tracking-widest uppercase flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> CONTÁCTANOS
        </h3>
        <p className="text-[9px] text-neutral-500 uppercase tracking-wide">
          ¿Dudas sobre tu pedido, envíos o productos? Escríbenos.
        </p>
        <form onSubmit={submitContact} className="space-y-2">
          <input
            className={INPUT_CLS}
            value={contactSubject}
            onChange={(e) => setContactSubject(e.target.value)}
            placeholder="Asunto"
          />
          <textarea
            className="w-full border border-neutral-300 px-3 py-2 text-xs focus:border-black focus:outline-none resize-none"
            rows={4}
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            placeholder="Tu mensaje..."
          />
          <button type="submit" disabled={busy} className={BTN_PRIMARY}>
            <MessageSquare className="w-4 h-4" /> ENVIAR
          </button>
        </form>
      </section>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import {
  Layers,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Send,
  ExternalLink,
  Clock,
  KeyRound,
} from 'lucide-react';
import {
  api,
  setAuthToken,
  setStoredUser,
  addRegisteredAccount,
} from '../lib/api';
import { User } from '../types';
import {
  auth,
  googleProvider,
  signInWithPopup,
  doc,
  setDoc,
  serverTimestamp,
  db as firestoreDb,
} from '../lib/firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';

export type AuthMode =
  | 'login'
  | 'register'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password';

interface AuthPageProps {
  mode: AuthMode;
  onNavigate: (to: string) => void;
  onSuccess: (user: User, token: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  mode,
  onNavigate,
  onSuccess,
}) => {
  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Loading & status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email verification state
  const [verificationPending, setVerificationPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);

  // Password reset state
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  // Resend state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Token auto-verifying state (from URL query)
  const [tokenVerifying, setTokenVerifying] = useState(false);
  const [tokenVerifySuccess, setTokenVerifySuccess] = useState<string | null>(null);
  const [tokenVerifyError, setTokenVerifyError] = useState<string | null>(null);

  const isRegister = mode === 'register';
  const isForgotPassword = mode === 'forgot-password';
  const isResetPassword = mode === 'reset-password';
  const isVerifyEmail = mode === 'verify-email';

  // Listen to cross-tab verification signals and poll verification status
  useEffect(() => {
    const activeTargetEmail = (registeredEmail || email).trim().toLowerCase();
    if (!verificationPending || !activeTargetEmail) return;

    let isMounted = true;

    // 1. Cross-tab BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('arah_market_auth');
      bc.onmessage = (event) => {
        if (event.data?.type === 'EMAIL_VERIFIED' && event.data?.token && event.data?.user) {
          setTokenVerifySuccess('Email berhasil diverifikasi! Membuka terminal trading...');
          setAuthToken(event.data.token);
          setStoredUser(event.data.user);
          setTimeout(() => {
            onSuccess(event.data.user, event.data.token);
          }, 600);
        }
      };
    } catch {}

    // 2. Storage event listener (fallback for browsers without BroadcastChannel)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'arah_market_verified_ping' || e.key === 'arah_market_auth_token') {
        const storedToken = localStorage.getItem('arah_market_auth_token');
        if (storedToken) {
          api.getMe()
            .then(meRes => {
              if (isMounted && meRes?.user) {
                setTokenVerifySuccess('Email berhasil diverifikasi! Membuka terminal...');
                setAuthToken(storedToken);
                setStoredUser(meRes.user);
                setTimeout(() => onSuccess(meRes.user, storedToken), 600);
              }
            })
            .catch(() => {});
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Regular active polling every 2.5 seconds to detect email clicks without refreshing
    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const status = await api.checkVerificationStatus(activeTargetEmail);
        if (status.is_verified && status.token && status.user) {
          clearInterval(pollInterval);
          setTokenVerifySuccess('Email Anda telah aktif! Membuka terminal...');
          setAuthToken(status.token);
          setStoredUser(status.user);
          setTimeout(() => {
            onSuccess(status.user!, status.token!);
          }, 600);
        }
      } catch {}
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorage);
      try { bc?.close(); } catch {}
    };
  }, [verificationPending, registeredEmail, email, onSuccess]);

  // Check URL query parameters on mount or mode change
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const emailParam = urlParams.get('email');
    const verifiedParam = urlParams.get('verified');

    if (emailParam) {
      setEmail(emailParam);
    }

    if (verifiedParam === 'true' || verifiedParam === '1') {
      setTokenVerifySuccess('Email Anda telah terverifikasi. Silakan masuk dengan akun Anda.');
    }

    if (token) {
      if (isResetPassword || window.location.pathname === '/reset-password') {
        setResetToken(token);
      } else {
        setTokenVerifying(true);
        setError(null);
        setTokenVerifyError(null);
        api.verifyEmail(token)
          .then((res) => {
            setTokenVerifySuccess('Verifikasi email berhasil! Membuka terminal trading...');
            setAuthToken(res.token);
            setStoredUser(res.user);
            setTimeout(() => {
              onSuccess(res.user, res.token);
            }, 1000);
          })
          .catch((err: any) => {
            setTokenVerifyError(err.message || 'Token verifikasi tidak valid atau telah kedaluwarsa.');
          })
          .finally(() => {
            setTokenVerifying(false);
          });
      }
    }
  }, [isResetPassword, isVerifyEmail, onSuccess]);

  // Clear transient error when switching mode
  useEffect(() => {
    setError(null);
    setErrorCode(null);
    setSuccessMessage(null);
    setResendStatus(null);
  }, [mode]);

  // Forgot Password Request
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Silakan masukkan alamat email Anda.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await api.forgotPassword(email.trim());
      setSuccessMessage(res.message || 'Tautan reset password telah dikirim ke email Anda.');
      if (res.resetUrl) {
        setResetUrl(res.resetUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal meminta reset kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  // Reset Password Execution
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.resetPassword({
        token: resetToken || undefined,
        email: email.trim() || undefined,
        directReset: !resetToken,
        newPassword,
      });

      setSuccessMessage('Kata sandi berhasil diperbarui! Mengalihkan ke terminal...');
      setAuthToken(res.token);
      setStoredUser(res.user);
      addRegisteredAccount({
        email: res.user.email,
        name: res.user.name,
        role: res.user.role,
      });
      setTimeout(() => {
        onSuccess(res.user, res.token);
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Gagal mereset kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  // Google Sign-In with Firebase Auth
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (!fbUser.email) throw new Error('Akun Google tidak memiliki alamat email publik.');

      // 1. Authenticate with backend API
      const apiRes = await api.firebaseLogin({
        email: fbUser.email,
        name: fbUser.displayName || 'Trader',
        uid: fbUser.uid,
        photoURL: fbUser.photoURL || undefined,
      });

      // 2. Persist user document to Firestore database
      try {
        const userDocRef = doc(firestoreDb, 'users', fbUser.uid);
        await setDoc(userDocRef, {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'Trader',
          photoURL: fbUser.photoURL || '',
          lastLogin: serverTimestamp(),
          role: 'USER',
          plan: 'PRO',
        }, { merge: true });
      } catch (fsErr) {
        console.warn('[Firestore] User document sync notice:', fsErr);
      }

      setAuthToken(apiRes.token);
      setStoredUser(apiRes.user);
      onSuccess(apiRes.user, apiRes.token);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(err.message || 'Gagal masuk dengan Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Standard Submit Handler (Login / Register)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setResendStatus(null);
    setSuccessMessage(null);

    try {
      if (isRegister) {
        if (!name.trim()) {
          throw new Error('Silakan isi nama lengkap atau trading handle Anda.');
        }
        const res = await api.register({
          email: email.trim(),
          password,
          name: name.trim(),
        });

        if (res.token && res.user) {
          setSuccessMessage(`Selamat datang, ${res.user.name || name}! Akun Anda telah aktif dan tersimpan permanen.`);
          setAuthToken(res.token);
          setStoredUser(res.user);
          addRegisteredAccount({
            email: res.user.email,
            name: res.user.name,
            role: res.user.role,
          });
          setTimeout(() => {
            onSuccess(res.user, res.token!);
          }, 600);
          return;
        }

        setRegisteredEmail(email.trim());
        setVerificationPending(true);
      } else {
        const res = await api.login({
          email: email.trim(),
          password,
        });
        setAuthToken(res.token);
        setStoredUser(res.user);
        addRegisteredAccount({
          email: res.user.email,
          name: res.user.name,
          role: res.user.role,
        });
        onSuccess(res.user, res.token);
      }
    } catch (err: any) {
      setError(err.message || 'Otentikasi gagal. Silakan periksa kembali email dan kata sandi Anda.');
      if (err.code) {
        setErrorCode(err.code);
      }
      if (err.email) {
        setRegisteredEmail(err.email);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend Email Verification
  const handleResendVerification = async (targetEmail?: string) => {
    const emailToUse = targetEmail || registeredEmail || email;
    if (!emailToUse.trim()) {
      setError('Silakan masukkan alamat email terlebih dahulu.');
      return;
    }

    setResendLoading(true);
    setResendStatus(null);
    try {
      const res = await api.resendVerification(emailToUse.trim());
      setResendStatus(res.message || 'Tautan verifikasi baru berhasil dikirim ke email Anda.');
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim ulang email verifikasi.');
    } finally {
      setResendLoading(false);
    }
  };

  // 6-Digit OTP Verification Handler
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode) {
      setError('Silakan masukkan 6 angka kode verifikasi dari email Anda.');
      return;
    }
    const targetEmail = registeredEmail || email;
    if (!targetEmail.trim()) {
      setError('Alamat email belum ditentukan. Silakan masukkan email Anda.');
      return;
    }

    setOtpVerifying(true);
    setError(null);
    try {
      const res = await api.verifyCode(targetEmail.trim(), cleanCode);
      setTokenVerifySuccess('Email berhasil diverifikasi! Membuka terminal trading...');
      setAuthToken(res.token);
      setStoredUser(res.user);
      addRegisteredAccount({
        email: res.user.email,
        name: res.user.name,
        role: res.user.role,
      });
      setTimeout(() => {
        onSuccess(res.user, res.token);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Kode verifikasi tidak sesuai atau telah kedaluwarsa.');
    } finally {
      setOtpVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="px-4 sm:px-8 py-4 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 backdrop-blur-sm z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('/')}
          className="text-slate-400 hover:text-slate-100 font-mono"
          id="back-home-btn"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Beranda</span>
        </Button>

        <div
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold text-xs">
            <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span className="font-mono text-xs font-bold tracking-wider text-slate-200">
            ARAHMARKET <span className="text-cyan-400">TERMINAL</span>
          </span>
        </div>

        <div className="hidden sm:flex items-center">
          <Badge variant="cyan" className="gap-1.5 py-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>INSTITUTIONAL GATEWAY</span>
          </Badge>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10">
        <Card className="w-full max-w-md bg-slate-900/90 border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">

          {/* STATE 1: Token Verifying in Progress */}
          {tokenVerifying && (
            <div className="text-center py-8 space-y-4 font-mono">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-700/80 flex items-center justify-center mx-auto text-cyan-400 shadow-inner">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Memvalidasi Tautan Akses...</h2>
              <p className="text-xs text-slate-400 font-sans">
                Mohon tunggu sejenak, sistem sedang mengonfirmasi token otentikasi akun Anda.
              </p>
            </div>
          )}

          {/* STATE 2: Token Verification Success Banner */}
          {tokenVerifySuccess && !tokenVerifying && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-600/80 text-emerald-300 text-xs space-y-2 font-sans">
              <div className="flex items-center gap-2 font-semibold text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Otentikasi Berhasil</span>
              </div>
              <p>{tokenVerifySuccess}</p>
            </div>
          )}

          {/* STATE 3: Success Message Banner */}
          {successMessage && !tokenVerifySuccess && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-600/80 text-emerald-300 text-xs space-y-2 font-sans">
              <div className="flex items-center gap-2 font-semibold text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Berhasil</span>
              </div>
              <p>{successMessage}</p>
            </div>
          )}

          {/* STATE 4: Token Verification Error Banner */}
          {tokenVerifyError && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-700/80 text-rose-300 text-xs space-y-3 font-sans">
              <div className="flex items-center gap-2 font-semibold text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Validasi Tautan Gagal</span>
              </div>
              <p>{tokenVerifyError}</p>
              <button
                type="button"
                onClick={() => {
                  setTokenVerifyError(null);
                  onNavigate('/login');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono font-medium transition cursor-pointer"
              >
                <span>Buka Formulir Masuk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* VIEW: Email Verification Pending View (After Register) */}
          {verificationPending ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/90 border border-cyan-600/60 flex items-center justify-center mx-auto text-cyan-400 mb-3 shadow-lg shadow-cyan-950/60 relative">
                  <Mail className="w-7 h-7" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <Clock className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
                  </span>
                </div>
                <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
                  Aktivasi Email Anda
                </h1>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Tautan dan kode verifikasi telah dikirimkan ke:
                </p>
                <div className="inline-block px-3 py-1.5 rounded-lg bg-slate-950 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-semibold">
                  {registeredEmail}
                </div>
              </div>

              {/* Form Input 6-Digit OTP Code */}
              <form onSubmit={handleVerifyOtp} className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    Aktivasi dengan 6-Digit Kode Email
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    Bebas Hambatan
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  Ketik 6 angka kode aktivasi yang dikirim ke email Anda di bawah ini (solusi tercepat jika tautan email terhalang izin browser):
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="Contoh: 849201"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 px-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg text-center font-mono text-base tracking-[0.25em] font-bold text-cyan-300 outline-none placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs transition"
                  />
                  <button
                    type="submit"
                    disabled={otpVerifying || otpCode.trim().length < 4}
                    className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {otpVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Verifikasi</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono pt-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse inline-block shrink-0" />
                  <span>Sistem otomatis mendeteksi ketika Anda mengklik tautan di email.</span>
                </div>
              </form>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={resendLoading}
                  onClick={() => handleResendVerification()}
                  className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-mono text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                  <span>{resendLoading ? 'Mengirim Ulang...' : 'Kirim Ulang Email Verifikasi'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerificationPending(false);
                    onNavigate('/login');
                  }}
                  className="w-full py-2 rounded-lg text-slate-400 hover:text-slate-200 font-mono text-xs transition cursor-pointer text-center"
                >
                  Sudah terverifikasi? Masuk ke Akun
                </button>
              </div>
            </div>
          ) : isForgotPassword ? (
            /* VIEW: Forgot Password */
            <div className="space-y-5">
              <div className="text-center space-y-1.5">
                <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center mx-auto text-cyan-400 mb-3 shadow-inner">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
                  Lupa Kata Sandi
                </h1>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Masukkan email akun Anda. Kami akan mengirimkan tautan untuk membuat kata sandi baru.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs space-y-2 font-sans">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Instant Reset URL fallback */}
              {resetUrl && (
                <div className="p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-700/80 text-cyan-200 text-xs space-y-2">
                  <div className="font-mono text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tautan Reset Instan Siap Digunakan</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Klik tombol di bawah untuk langsung membuka formulir pembuatan kata sandi baru:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const match = resetUrl.match(/token=([^&]+)/);
                      if (match) {
                        setResetToken(decodeURIComponent(match[1]));
                      }
                      onNavigate(`/reset-password?token=${encodeURIComponent(resetToken || '')}`);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>Buka Formulir Buat Password Baru</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4 font-mono text-xs">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 text-[11px] font-semibold">
                    Alamat Email Terdaftar
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contoh: trader@marketintel.pro"
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full mt-2"
                >
                  {loading ? (
                    <span>Mengirim permintaan...</span>
                  ) : (
                    <>
                      <span>Kirim Tautan Atur Ulang Kata Sandi</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="text-cyan-400 hover:underline font-mono text-xs cursor-pointer inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Halaman Masuk</span>
                </button>
              </div>
            </div>
          ) : isResetPassword ? (
            /* VIEW: Reset Password (Set New Password) */
            <div className="space-y-5">
              <div className="text-center space-y-1.5">
                <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center mx-auto text-cyan-400 mb-3 shadow-inner">
                  <Lock className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
                  Buat Kata Sandi Baru
                </h1>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Masukkan kata sandi baru untuk akun Anda (minimal 6 karakter).
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs space-y-2 font-sans">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4 font-mono text-xs">
                {!resetToken && (
                  <div className="space-y-1.5">
                    <label className="block text-slate-300 text-[11px] font-semibold">
                      Alamat Email Akun
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="trader@marketintel.pro"
                        className="pl-9 h-10"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-slate-300 text-[11px] font-semibold">
                    Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <Input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 text-[11px] font-semibold">
                    Ulangi Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <Input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full mt-2"
                >
                  {loading ? (
                    <span>Memperbarui kata sandi...</span>
                  ) : (
                    <>
                      <span>Simpan Kata Sandi & Masuk</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="text-slate-400 hover:text-slate-200 font-mono text-xs cursor-pointer"
                >
                  Batal dan kembali ke halaman masuk
                </button>
              </div>
            </div>
          ) : (
            /* VIEW: Standard Login & Register */
            <>
              {/* Header */}
              <div className="text-center space-y-1.5">
                <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center mx-auto text-cyan-400 mb-3 shadow-inner">
                  <Lock className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
                  {isRegister ? 'Daftar Akun Trader' : 'Otentikasi Terminal'}
                </h1>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  {isRegister
                    ? 'Daftarkan akun Anda untuk mengakses intelijen pasar. Tautan verifikasi akan dikirimkan ke email Anda.'
                    : 'Masuk untuk mengakses ruang kerja intelijen makro dan telemetri pasar.'}
                </p>
              </div>

              {/* Mode Tabs (Sign In vs Register) */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-850 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className={`py-2 rounded-lg font-semibold transition cursor-pointer ${
                    !isRegister
                      ? 'bg-slate-900 text-cyan-300 shadow-xs border border-slate-800'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  id="tab-login"
                >
                  Masuk
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/register')}
                  className={`py-2 rounded-lg font-semibold transition cursor-pointer ${
                    isRegister
                      ? 'bg-slate-900 text-cyan-300 shadow-xs border border-slate-800'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  id="tab-register"
                >
                  Buat Akun Baru
                </button>
              </div>

              {/* Error Message Box with Intelligent Action Buttons */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs space-y-3 font-sans">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span className="leading-relaxed">{error}</span>
                  </div>

                  {/* Resolution Paths for Invalid Password */}
                  {errorCode === 'INVALID_PASSWORD' && (
                    <div className="pt-2 border-t border-rose-900/60 space-y-2">
                      <p className="text-[11px] text-rose-200/90 font-mono">Lupa atau ingin mengganti kata sandi?</p>
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            onNavigate(`/forgot-password?email=${encodeURIComponent(email.trim())}`);
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 font-mono text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          <span>Atur Ulang Kata Sandi (Reset Password)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Resolution Paths for Unverified Email */}
                  {(errorCode === 'EMAIL_NOT_VERIFIED' || errorCode === 'ALREADY_REGISTERED_UNVERIFIED') && (
                    <div className="pt-2 border-t border-rose-900/60 space-y-2.5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider block">
                          Masukkan 6-Digit Kode dari Email:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="6-digit kode OTP"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded text-center font-mono text-sm tracking-widest font-bold text-cyan-300 outline-none placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleVerifyOtp()}
                            disabled={otpVerifying || otpCode.trim().length < 4}
                            className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                          >
                            {otpVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            <span>Aktifkan</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-rose-900/40">
                        <button
                          type="button"
                          onClick={() => {
                            setRegisteredEmail(email.trim());
                            setVerificationPending(true);
                          }}
                          className="text-[11px] text-cyan-400 hover:underline font-mono"
                        >
                          Buka Layar Aktivasi Penuh →
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResendVerification(email || registeredEmail)}
                          disabled={resendLoading}
                          className="px-2.5 py-1 rounded bg-rose-900/50 hover:bg-rose-900/90 text-rose-200 text-[11px] font-mono font-medium transition cursor-pointer flex items-center gap-1 shrink-0"
                          id="unverified-resend-btn"
                        >
                          <Send className="w-3 h-3" />
                          <span>{resendLoading ? 'Mengirim...' : 'Kirim Ulang Email'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Resolution Path for User Not Found */}
                  {errorCode === 'USER_NOT_FOUND' && (
                    <div className="pt-2 border-t border-rose-900/60">
                      <button
                        type="button"
                        onClick={() => onNavigate('/register')}
                        className="w-full py-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Daftarkan Akun Ini Sekarang</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Resend Status Message */}
              {resendStatus && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 text-xs flex items-center gap-2 font-sans">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{resendStatus}</span>
                </div>
              )}

              {/* Google Firebase Authentication */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || googleLoading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold font-sans transition-all duration-150 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer border border-slate-200"
                  id="google-signin-btn"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{googleLoading ? 'Menghubungkan Google...' : 'Masuk dengan Google (Firebase Auth)'}</span>
                </button>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-[#0b0e14] px-3 text-[10px] uppercase font-mono tracking-widest text-slate-500 shrink-0">
                    atau lanjutkan dengan email
                  </span>
                  <div className="border-t border-slate-800 w-full" />
                </div>
              </div>

              {/* Standard Password Login / Register Form */}
              <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
                  {isRegister && (
                    <div className="space-y-1.5">
                      <label className="block text-slate-300 text-[11px] font-semibold">
                        Nama Lengkap / Trading Desk Handle
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                        <Input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="contoh: Alexander Vance"
                          className="pl-9 h-10"
                          id="auth-name-input"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-slate-300 text-[11px] font-semibold">
                      Alamat Email (Wajib Aktif)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contoh: trader@marketintel.pro"
                        className="pl-9 h-10"
                        id="auth-email-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-slate-300 text-[11px] font-semibold">
                        Kata Sandi
                      </label>
                      {!isRegister && (
                        <button
                          type="button"
                          onClick={() => onNavigate(`/forgot-password?email=${encodeURIComponent(email.trim())}`)}
                          className="text-[11px] text-cyan-400 hover:underline font-mono cursor-pointer"
                        >
                          Lupa kata sandi?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                      <Input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        minLength={6}
                        className="pl-9 h-10"
                        id="auth-password-input"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    size="lg"
                    className="w-full mt-2"
                    id="auth-submit-btn"
                  >
                    {loading ? (
                      <span>Memproses otentikasi...</span>
                    ) : (
                      <>
                        <span>{isRegister ? 'Daftar Akun' : 'Masuk ke Terminal'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </form>

              {/* Footer Links */}
              <div className="text-center text-[11px] text-slate-400 font-sans pt-2 border-t border-slate-850">
                {isRegister ? (
                  <p>
                    Sudah memiliki akun?{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate('/login')}
                      className="text-cyan-400 hover:underline font-semibold cursor-pointer"
                    >
                      Masuk
                    </button>
                  </p>
                ) : (
                  <p>
                    Belum memiliki akun terminal?{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate('/register')}
                      className="text-cyan-400 hover:underline font-semibold cursor-pointer"
                    >
                      Daftar akun baru
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      </main>

      {/* Bottom Disclaimer */}
      <footer className="py-4 text-center text-[10px] text-slate-600 font-mono border-t border-slate-900">
        ARAHMARKET INTELLIGENCE TERMINAL • SECURE ENCRYPTED VERIFICATION GATEWAY
      </footer>
    </div>
  );
};

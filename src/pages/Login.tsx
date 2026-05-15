import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../context/ThemeContext';

export const Login: React.FC = () => {
  const { settings } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [isRecoveryMode, setIsRecoveryMode] = useState(window.location.search.includes('type=recovery'));
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('Acceso concedido. Redirigiendo...');
      setTimeout(() => navigate('/admin'), 1500);
    } catch (error: any) {
      toast.error(error.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error('Por favor, ingresa tu email corporativo primero');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?type=recovery`,
      });

      if (error) throw error;

      toast.success('Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.');
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres');

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Contraseña actualizada correctamente. Iniciando sesión...');
      setTimeout(() => navigate('/admin'), 1500);
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      
      {/* Dynamic Background */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <button 
        onClick={() => navigate('/')}
        className="back-to-store-btn"
      >
        <ArrowLeft size={18} />
        Volver a la tienda
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="login-card"
      >
        <div className="login-glass">
          <div className="login-header">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="logo-container"
            >
              {settings.logoUrl && (
                <img src={settings.logoUrl} alt={settings.siteName} className="main-logo" />
              )}
            </motion.div>
            
            <div className="title-group">
              <h1>{isRecoveryMode ? 'Restablecer Clave' : 'Admin Access'}</h1>
              <div className="admin-badge">
                <ShieldCheck size={14} />
                <span>{isRecoveryMode ? 'Security Action' : 'Secure Portal'}</span>
              </div>
            </div>
            <p className="subtitle">
              {isRecoveryMode 
                ? 'Ingresa tu nueva contraseña para recuperar el acceso' 
                : `Ingresa a la consola de administración de ${settings.siteName}`}
            </p>
          </div>

          {!isRecoveryMode ? (
            <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>Email Corporativo</label>
              <div className="input-box">
                <Mail className="field-icon" size={18} />
                <input
                  type="email"
                  placeholder="admin@charlyhome.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <div className="label-row">
                <label>Contraseña</label>
                <button 
                  type="button"
                  onClick={handleResetPassword}
                  className="forgot-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  ¿Olvidaste la clave?
                </button>
              </div>
              <div className="input-box">
                <Lock className="field-icon" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              className="submit-btn" 
              disabled={loading}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="btn-content"
                  >
                    <Loader2 className="spinner" size={20} />
                    <span>Autenticando...</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="normal"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="btn-content"
                  >
                    <span>Entrar al Sistema</span>
                    <ArrowRight size={20} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="login-form">
              <div className="input-group">
                <label>Nueva Contraseña</label>
                <div className="input-box">
                  <Lock className="field-icon" size={18} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                className="submit-btn" 
                disabled={loading}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="btn-content"
                    >
                      <Loader2 className="spinner" size={20} />
                      <span>Actualizando...</span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="normal"
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="btn-content"
                    >
                      <span>Cambiar Contraseña</span>
                      <ArrowRight size={20} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              
              <button 
                type="button" 
                onClick={() => setIsRecoveryMode(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', marginTop: '10px' }}
              >
                Volver al inicio de sesión
              </button>
            </form>
          )}

          <div className="login-footer">
            <p>© 2026 {settings.siteName} • Sistema de Gestión de Inventario</p>
          </div>
        </div>
      </motion.div>

      <style>{`
        .login-wrapper {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #0c0c0c;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* Ambient Background Glows */
        .bg-glow-1 {
          position: absolute;
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(230, 0, 0, 0.08) 0%, transparent 70%);
          top: -200px;
          left: -200px;
          z-index: 1;
        }

        .bg-glow-2 {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(230, 0, 0, 0.05) 0%, transparent 70%);
          bottom: -100px;
          right: -100px;
          z-index: 1;
        }

        .login-card {
          width: 100%;
          max-width: 480px;
          padding: 20px;
          position: relative;
          z-index: 10;
        }

        .login-glass {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 32px;
          padding: 48px;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);
        }

        .login-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .logo-container {
          margin-bottom: 24px;
          display: inline-block;
        }

        .main-logo {
          height: 70px;
          filter: drop-shadow(0 0 20px rgba(230, 0, 0, 0.15));
        }

        .title-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .title-group h1 {
          color: white;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .admin-badge {
          background: rgba(230, 0, 0, 0.1);
          border: 1px solid rgba(230, 0, 0, 0.3);
          color: #ff4d4d;
          padding: 4px 10px;
          border-radius: 100px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .subtitle {
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          line-height: 1.5;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .input-group label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          font-weight: 600;
        }

        .forgot-link {
          color: rgba(230, 0, 0, 0.8);
          font-size: 11px;
          font-weight: 600;
          text-decoration: none;
        }

        .forgot-link:hover {
          color: #ff4d4d;
          text-decoration: underline;
        }

        .input-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-icon {
          position: absolute;
          left: 18px;
          color: rgba(255, 255, 255, 0.3);
          transition: var(--transition);
        }

        .input-box input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 16px 16px 16px 52px;
          color: white;
          font-size: 15px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .input-box input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(230, 0, 0, 0.5);
          box-shadow: 0 0 0 4px rgba(230, 0, 0, 0.15);
        }

        .input-box input:focus + .field-icon {
          color: #ff4d4d;
        }

        .submit-btn {
          margin-top: 12px;
          background: #E60000;
          color: white;
          padding: 16px;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          box-shadow: 0 10px 30px rgba(230, 0, 0, 0.3);
        }

        .submit-btn:hover:not(:disabled) {
          background: #ff1a1a;
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(230, 0, 0, 0.4);
        }

        .submit-btn:active {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          filter: grayscale(0.5);
        }

        .btn-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .login-footer {
          margin-top: 40px;
          text-align: center;
        }

        .login-footer p {
          color: rgba(255, 255, 255, 0.3);
          font-size: 11px;
          letter-spacing: 0.02em;
        }

        .back-to-store-btn {
          position: absolute;
          top: 30px;
          left: 30px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          padding: 10px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          z-index: 10;
        }

        .back-to-store-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          transform: translateY(-2px);
        }

        @media (max-width: 480px) {
          .login-glass {
            padding: 32px 24px;
          }
        }
      `}</style>
    </div>
  );
};

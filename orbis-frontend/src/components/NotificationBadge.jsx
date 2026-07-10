import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, CheckCheck, ExternalLink, RefreshCw, Info, AlertTriangle, CheckCircle, ShieldAlert, MessageSquare } from 'lucide-react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/notifications` 
  : "http://localhost:5001/api/notifications";

const WS_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : "http://localhost:5001";

const TYPE_CONFIG = {
  info:       { icon: Info,         color: 'text-blue-400',  bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  warning:    { icon: AlertTriangle,color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  success:    { icon: CheckCircle,  color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
  role_change:{ icon: ShieldAlert,  color: 'text-violet-400', bg: 'bg-violet-500/10',border: 'border-violet-500/20' },
  deal_update:{ icon: RefreshCw,    color: 'text-teal-400',  bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  goal_update:{ icon: Info,         color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
};

export default function NotificationBadge() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const socketRef = useRef(null);

  // Récupérer l'ID utilisateur
  const getUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.id || null;
    } catch { return null; }
  };

  // Récupérer les notifications depuis l'API
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?limit=10`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('[Notif] Erreur chargement:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Récupérer le compteur de messages non lus depuis l'API
  const fetchUnreadMessageCount = useCallback(async () => {
    try {
      const API_MESSAGES_URL = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/messages/unread/count` 
        : "http://localhost:5001/api/messages/unread/count";
      const res = await fetch(API_MESSAGES_URL, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUnreadMessages(data.unreadMessages || 0);
      }
    } catch {}
  }, []);

  // Connexion WebSocket
  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;

    // Connexion Socket.io
    const socket = io(WS_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[Notif WS] Connecté');
      socket.emit('auth', userId);
    });

    socket.on('notification', (data) => {
      console.log('[Notif WS] Nouvelle notification:', data);
      // Ajouter la notification et incrémenter le compteur
      // Utiliser le vrai _id MongoDB s'il existe, sinon un ID temporaire
      const newNotif = {
        _id: data._id || Date.now().toString(),
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        read: false,
        createdAt: data.createdAt || new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 20));
      setUnreadCount(prev => prev + 1);

      // Notification native PWA si le document est caché
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Orbis CRM', {
          body: data.title,
          icon: '/outpout/icons/icon-transparent-192x192.png'
        });
      }
    });

    socket.on('unread_messages_count', (count) => {
      setUnreadMessages(count);
    });

    socket.on('disconnect', () => {
      console.log('[Notif WS] Déconnecté');
    });

    socketRef.current = socket;

    // Charger les notifications existantes
    fetchNotifications();
    fetchUnreadMessageCount();

    return () => {
      socket.disconnect();
    };
  }, [fetchNotifications, fetchUnreadMessageCount]);

  // Demander la permission de notification native
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Marquer comme lu
  const markAsRead = async (id) => {
    try {
      // Si l'ID est un ID temporaire (commence par un nombre = Date.now()), traiter localement
      const isLocalId = typeof id === 'string' && /^\d+$/.test(id);
      
      if (!isLocalId) {
        await fetch(`${API_URL}/${id}/read`, {
          method: 'PUT',
          credentials: 'include'
        });
      }
      
      setNotifications(prev => prev.map(n => 
        n._id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  // Marquer tout comme lu
  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/read-all`, {
        method: 'PUT',
        credentials: 'include'
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  // Fermer le panneau au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPanel(false);
      }
    };
    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPanel]);

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return "à l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    return `il y a ${Math.floor(diff / 86400)} j`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bouton cloche + badge messages */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all duration-200"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-[9px] font-bold text-white flex items-center justify-center shadow-lg shadow-rose-500/30 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {/* Badge messages non lus */}
        {unreadMessages > 0 && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[7px] font-bold text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            {unreadMessages > 9 ? '9+' : unreadMessages}
          </span>
        )}
      </button>

      {/* Panneau de notifications */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 z-50 overflow-hidden animate-fadeIn">
          {/* En-tête */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-mono">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Tout lu
                </button>
              )}
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-t-emerald-400 border-slate-700 rounded-full animate-spin"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {notifications.map(n => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n._id}
                      onClick={() => !n.read && markAsRead(n._id)}
                      className={`px-4 py-3 transition-all cursor-pointer hover:bg-slate-800/40 ${
                        !n.read ? 'bg-slate-800/20 border-l-2 border-l-emerald-500' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-0.5 w-7 h-7 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{n.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[9px] text-slate-600 mt-1 font-mono">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pied */}
          <div className="px-4 py-2 border-t border-slate-800 text-center">
            <button
              onClick={fetchNotifications}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              <RefreshCw className="inline-block w-3 h-3 mr-1" />
              Actualiser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { MessageSquare, Send, X, Search, Users, User, ChevronLeft, Phone, Mail, Clock, CheckCheck, Check, Plus, Edit3 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/messages` 
  : "http://localhost:5001/api/messages";

const WS_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : "http://localhost:5001";

export default function ChatPanel({ isOpen, onClose }) {
  const [view, setView] = useState('conversations'); // 'conversations' | 'chat'
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const socketRef = useRef(null);
  const chatContainerRef = useRef(null);

  const getUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.id || user?._id || null;
    } catch { return null; }
  };

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch { return {}; }
  };

  // Initialiser la connexion WebSocket
  useEffect(() => {
    const userId = getUserId();
    if (!userId || !isOpen) return;

    const socket = io(WS_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('auth', userId);
    });

    socket.on('new_message', (msg) => {
      if (activeChat && (msg.sender._id === activeChat._id || msg.recipient._id === activeChat._id)) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
      // Mettre à jour les conversations
      fetchConversations();
    });

    socket.on('message_sent', (msg) => {
      if (activeChat) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
      fetchConversations();
    });

    socket.on('unread_messages_count', (count) => {
      setUnreadCount(count);
    });

    socket.on('user_typing', (data) => {
      if (activeChat && data.userId === activeChat._id) {
        setTypingUser(data.isTyping ? activeChat : null);
        if (data.isTyping) {
          clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setTypingUser(null), 3000);
        } else {
          setTypingUser(null);
        }
      }
    });

    // Écouter les statuts en ligne
    socket.on('users_online', (onlineIds) => {
      setOnlineUsers(onlineIds || []);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      clearTimeout(typingTimeout.current);
    };
  }, [isOpen, activeChat]);

  // Charger tous les utilisateurs
  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/users/all`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) fetchAllUsers();
  }, [isOpen, fetchAllUsers]);

  // Vérifier si un utilisateur est en ligne
  const isOnline = (userId) => onlineUsers.includes(userId);

  // Charger les conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/conversations`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        const totalUnread = data.reduce((sum, c) => sum + c.unreadCount, 0);
        setUnreadCount(totalUnread);
      }
    } catch {}
  }, []);

  // Charger les messages d'une conversation
  const fetchMessages = useCallback(async (userId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/${userId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        scrollToBottom();
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isOpen) fetchConversations();
  }, [isOpen, fetchConversations]);

  useEffect(() => {
    if (activeChat) fetchMessages(activeChat._id);
  }, [activeChat, fetchMessages]);

  // Recherche d'utilisateurs
  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/search/users?q=${encodeURIComponent(q)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {}
  };

  // Envoyer un message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const content = newMessage.trim();
    setNewMessage('');

    // Envoyer via socket pour temps réel
    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        recipientId: activeChat._id,
        content
      });
    } else {
      // Fallback via API
      try {
        const res = await fetch(`${API_URL}/`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipientId: activeChat._id, content })
        });
        if (res.ok) {
          const msg = await res.json();
          setMessages(prev => [...prev, msg]);
          scrollToBottom();
          fetchConversations();
        }
      } catch {}
    }
  };

  // Indicateur de frappe
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (socketRef.current && activeChat) {
      socketRef.current.emit('typing', { recipientId: activeChat._id, isTyping: e.target.value.length > 0 });
    }
  };

  // Ouvrir une conversation
  const openChat = (user) => {
    setActiveChat(user);
    setView('chat');
    setSearchQuery('');
    setSearchResults([]);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "à l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const currentUser = getCurrentUser();
  const currentUserId = getUserId();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      {/* Panneau de chat */}
      <div className="relative w-full sm:max-w-lg h-[85vh] sm:h-[600px] bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto animate-slideUp">
        
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
          {view === 'chat' ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setView('conversations'); setActiveChat(null); }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {activeChat && (
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    {activeChat.avatarUrl ? (
                      <img src={activeChat.avatarUrl} className="w-8 h-8 rounded-full object-cover border border-emerald-500/30" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-black text-slate-950">
                        {activeChat.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Point de statut en ligne */}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                      isOnline(activeChat._id) ? 'bg-emerald-500' : 'bg-slate-500'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{activeChat.name}</p>
                    <p className={`text-[10px] font-medium ${isOnline(activeChat._id) ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {isOnline(activeChat._id) ? 'En ligne' : 'Hors ligne'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Messagerie</h3>
                <p className="text-[10px] text-slate-500">Discutez avec votre équipe</p>
              </div>
              {/* Bouton Nouvelle Conversation */}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  document.getElementById('chat-search-input')?.focus();
                }}
                className="ml-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1 text-[10px] font-semibold"
                title="Démarrer une nouvelle conversation"
              >
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">Nouvelle</span>
              </button>
            </div>
          )}
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {view === 'conversations' ? (
            <>
              {/* Barre de recherche */}
              <div className="p-3 border-b border-slate-800/60">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    id="chat-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Rechercher un collaborateur..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>

                {/* Résultats de recherche */}
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-slate-600 px-1 uppercase tracking-wider">Résultats</p>
                    {searchResults.map(user => (
                      <button
                        key={user._id}
                        onClick={() => openChat(user)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/40 transition-all text-left"
                      >
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-medium">Chat →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Liste des conversations */}
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 && searchQuery.length < 2 ? (
                  <>
                    {/* Section Tous les collaborateurs quand aucune conversation */}
                    {allUsers.length > 0 && (
                      <div className="px-3 pt-2 pb-1">
                        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                          <Users className="w-3 h-3" />
                          Tous les collaborateurs
                        </p>
                        <div className="grid grid-cols-1 gap-1">
                          {allUsers.map(user => (
                            <button
                              key={user._id}
                              onClick={() => openChat(user)}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/40 transition-all text-left group"
                            >
                              <div className="relative">
                                {user.avatarUrl ? (
                                  <img src={user.avatarUrl} className="w-9 h-9 rounded-full object-cover" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-bold text-slate-400">
                                    {user.name?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                                  isOnline(user._id) ? 'bg-emerald-500' : 'bg-slate-600'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">{user.name}</p>
                                <p className={`text-[10px] ${isOnline(user._id) ? 'text-emerald-500' : 'text-slate-600'}`}>
                                  {isOnline(user._id) ? '● En ligne' : 'Hors ligne'} · {user.role}
                                </p>
                              </div>
                              <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">Chat →</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                        <MessageSquare className="w-7 h-7 text-emerald-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-300">Aucune conversation</p>
                      <p className="text-[10px] text-slate-600 mt-1 text-center max-w-[200px]">
                        Cliquez sur un collaborateur ci-dessus pour démarrer
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Section Tous les collaborateurs */}
                    {allUsers.length > 0 && (
                      <div className="px-3 pt-2 pb-1">
                        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                          <Users className="w-3 h-3" />
                          Collaborateurs
                          <span className="ml-1 text-[9px] font-mono text-emerald-500">{onlineUsers.length} en ligne</span>
                        </p>
                      </div>
                    )}
                    {/* Liste des collaborateurs */}
                    <div className="px-3 pb-2 border-b border-slate-800/40 mb-1">
                      <div className="grid grid-cols-1 gap-0.5">
                        {allUsers.filter(u => isOnline(u._id)).slice(0, 5).map(user => (
                          <button
                            key={user._id}
                            onClick={() => openChat(user)}
                            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/30 transition-all text-left group"
                          >
                            <div className="relative">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} className="w-7 h-7 rounded-full object-cover" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[9px] font-black text-slate-950">
                                  {user.name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-slate-900 bg-emerald-500" />
                            </div>
                            <p className="text-xs text-slate-300 truncate group-hover:text-emerald-400 transition-colors">{user.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Conversations existantes */}
                    <div className="divide-y divide-slate-800/40">
                      {conversations.map(conv => (
                        <button
                          key={conv.conversationId}
                          onClick={() => openChat(conv.otherUser)}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800/30 transition-all text-left ${
                            conv.unreadCount > 0 ? 'bg-emerald-500/5' : ''
                          }`}
                        >
                          <div className="relative">
                            {conv.otherUser?.avatarUrl ? (
                              <img src={conv.otherUser.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-bold text-slate-400 border border-slate-700">
                                {conv.otherUser?.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                              isOnline(conv.otherUser?._id) ? 'bg-emerald-500' : 'bg-slate-600'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-slate-200 truncate">{conv.otherUser?.name || 'Inconnu'}</p>
                              <span className="text-[9px] text-slate-600 font-mono whitespace-nowrap ml-2">
                                {formatTime(conv.lastMessage.createdAt)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{conv.lastMessage.content}</p>
                          </div>
                          {conv.unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            /* Vue Chat */
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
              >
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-5 h-5 border-2 border-t-emerald-400 border-slate-700 rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs">Aucun message</p>
                    <p className="text-[10px] text-slate-600 mt-1">Envoyez le premier message !</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.sender?._id === currentUserId || msg.sender === currentUserId;
                    return (
                      <div key={msg._id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] ${isMine ? 'order-1' : 'order-1'}`}>
                          {!isMine && (
                            <p className="text-[9px] text-slate-600 mb-1 ml-1">
                              {msg.sender?.name || 'Inconnu'}
                            </p>
                          )}
                          <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMine 
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-br-md'
                              : 'bg-slate-800/60 text-slate-200 rounded-bl-md border border-slate-700/40'
                          }`}>
                            <p>{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[8px] text-slate-600 font-mono">
                              {formatTime(msg.createdAt)}
                            </span>
                            {isMine && (
                              msg.read ? (
                                <CheckCheck className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Check className="w-3 h-3 text-slate-600" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                
                {/* Indicateur de frappe amélioré */}
                {typingUser && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 animate-fadeIn">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      <span className="font-semibold">{typingUser.name}</span> écrit
                    </span>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Barre de saisie */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800/60 bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Écrivez votre message..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                    maxLength={1000}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

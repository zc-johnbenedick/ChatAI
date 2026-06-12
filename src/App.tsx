import { useState, useRef, useEffect, useCallback } from 'react';
import { Sun, Moon, Menu, X, ArrowUp } from 'lucide-react';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { askAssistant, type ChatTurn } from './lib/api';
import { Markdown } from './components/Markdown';
import { useMediaQuery } from './hooks/useMediaQuery';
import './App.css';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  animate?: boolean;
}

interface TicketInfo {
  dateStr: string;
  timeStr: string;
  ticketId: string;
  isHistory: boolean;
}

interface HistoryEntry extends TicketInfo {
  preview: string;
  messages: Message[];
}

type Theme = 'light' | 'dark';

const SUGGESTIONS = [
  'How do I add a new team member?',
  'How do I reset my password?',
  'How do I upgrade my plan?',
  'How do I enable two-factor authentication?',
];

function createTicketInfo(): TicketInfo {
  const now = new Date();
  const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}-${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;
  const ticketId = `TKT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  return { dateStr, timeStr, ticketId, isHistory: false };
}

function formatTicketDate(dateStr: string, timeStr: string): string {
  const [month, day, year] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfTicketDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfTicketDay.getTime()) / 86_400_000,
  );

  if (dayDiff === 0) return timeStr;
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return `${dayDiff}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 769px)').matches,
  );
  const [allTickets, setAllTickets] = useState<HistoryEntry[]>([]);

  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const [ticketInfo, setTicketInfo] = useState<TicketInfo>(() => {
    const stored = localStorage.getItem('current_ticket_info');
    if (stored) {
      try {
        return JSON.parse(stored) as TicketInfo;
      } catch {
        /* fall through */
      }
    }
    const info = createTicketInfo();
    localStorage.setItem('current_ticket_info', JSON.stringify(info));
    return info;
  });

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = messages.length === 0;

  const isDesktop = useMediaQuery('(min-width: 769px)');

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const closeSidebarIfMobile = useCallback(() => {
    if (!isDesktop) setSidebarOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) closeSidebar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen, closeSidebar]);

  useEffect(() => {
    if (!isDesktop && sidebarOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isDesktop, sidebarOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchData = async () => {
      const savedMessages = localStorage.getItem(
        `chat_messages_${ticketInfo.ticketId}`,
      );
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages) as Message[];
          if (parsed.length > 0) setMessages(parsed);
        } catch (e) {
          console.error('Failed to parse local messages', e);
        }
      }

      const savedHistory = localStorage.getItem('chat_history');
      if (savedHistory) {
        try {
          setAllTickets(JSON.parse(savedHistory) as HistoryEntry[]);
        } catch {
          console.error('Failed to parse local history');
        }
      }

      try {
        const chatDoc = doc(
          db,
          'chat',
          ticketInfo.dateStr,
          ticketInfo.timeStr,
          ticketInfo.ticketId,
        );
        const chatSnap = await getDoc(chatDoc);
        if (chatSnap.exists()) {
          const data = chatSnap.data();
          if (data.messages?.length > 0) {
            setMessages((prev) => (prev.length === 0 ? data.messages : prev));
          }
        }
      } catch (e) {
        console.error('Failed to sync from Firebase', e);
      }
    };
    fetchData();
  }, [ticketInfo.dateStr, ticketInfo.timeStr, ticketInfo.ticketId]);

  const scrollToBottom = useCallback(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!isEmpty || isAiTyping) {
      const id = setTimeout(scrollToBottom, 80);
      return () => clearTimeout(id);
    }
  }, [messages, isAiTyping, isEmpty, scrollToBottom]);

  useEffect(() => {
    const autoSave = async () => {
      localStorage.setItem(
        `chat_messages_${ticketInfo.ticketId}`,
        JSON.stringify(messages),
      );

      if (messages.length > 0) {
        setAllTickets((prev) => {
          const newHistory = [...prev];
          const existingIdx = newHistory.findIndex(
            (t) => t.ticketId === ticketInfo.ticketId,
          );
          const lastMessage = messages[messages.length - 1].content;
          const entry: HistoryEntry = {
            ...ticketInfo,
            preview:
              lastMessage.length > 52
                ? `${lastMessage.slice(0, 52)}…`
                : lastMessage,
            messages,
          };
          if (existingIdx >= 0) newHistory[existingIdx] = entry;
          else newHistory.unshift(entry);
          localStorage.setItem('chat_history', JSON.stringify(newHistory));
          return newHistory;
        });

        try {
          const chatDoc = doc(
            db,
            'chat',
            ticketInfo.dateStr,
            ticketInfo.timeStr,
            ticketInfo.ticketId,
          );
          await setDoc(chatDoc, { messages });
        } catch (e) {
          console.error('Failed to save to Firebase', e);
        }
      }
    };
    autoSave();
  }, [messages, ticketInfo]);

  const startNewChat = useCallback(() => {
    const info = createTicketInfo();
    setMessages([]);
    setInput('');
    setError(null);
    setTicketInfo(info);
    closeSidebarIfMobile();
    localStorage.setItem(`chat_messages_${info.ticketId}`, '[]');
    localStorage.setItem('current_ticket_info', JSON.stringify(info));
  }, [closeSidebarIfMobile]);

  const loadTicket = useCallback((ticket: HistoryEntry) => {
    const info: TicketInfo = {
      dateStr: ticket.dateStr,
      timeStr: ticket.timeStr,
      ticketId: ticket.ticketId,
      isHistory: true,
    };
    setMessages(ticket.messages);
    setTicketInfo(info);
    setInput('');
    setError(null);
    closeSidebarIfMobile();
    localStorage.setItem('current_ticket_info', JSON.stringify(info));
  }, [closeSidebarIfMobile]);

  const deleteTicket = useCallback(
    async (e: React.MouseEvent, ticket: HistoryEntry) => {
      e.stopPropagation();
      setAllTickets((prev) => {
        const next = prev.filter((t) => t.ticketId !== ticket.ticketId);
        localStorage.setItem('chat_history', JSON.stringify(next));
        return next;
      });
      localStorage.removeItem(`chat_messages_${ticket.ticketId}`);
      try {
        await deleteDoc(
          doc(db, 'chat', ticket.dateStr, ticket.timeStr, ticket.ticketId),
        );
      } catch (err) {
        console.error('Failed to delete from Firebase', err);
      }
      if (ticket.ticketId === ticketInfo.ticketId) startNewChat();
    },
    [ticketInfo.ticketId, startNewChat],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isAiTyping || ticketInfo.isHistory) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: trimmed,
      };

      const history: ChatTurn[] = messages.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }));

      setMessages((prev) => [...prev, { ...userMessage, animate: true }]);
      setInput('');
      setError(null);
      setIsAiTyping(true);

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      try {
        const answer = await askAssistant(trimmed, history);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: answer,
            animate: true,
          },
        ]);
      } catch (err) {
        console.error('Error during request:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.',
        );
      } finally {
        setIsAiTyping(false);
      }
    },
    [isAiTyping, messages, ticketInfo.isHistory],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const toggleTheme = () =>
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {!isDesktop && sidebarOpen && (
        <div
          className="scrim"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        id="sidebar"
        className="sidebar"
        aria-hidden={!sidebarOpen}
      >
        <div className="sidebar-head">
          <div className="brand">
            <span className="brand-mark">S</span>
            <span className="brand-name">Support Desk</span>
          </div>
        </div>

        <button className="btn-new" onClick={startNewChat}>
          New conversation
        </button>

        <div className="ticket-list">
          <div className="ticket-list-head">
            <span className="ticket-list-title">Conversations</span>
            {allTickets.length > 0 && (
              <span className="ticket-list-count">{allTickets.length}</span>
            )}
          </div>

          {allTickets.length === 0 ? (
            <div className="ticket-empty">
              <p>No conversations yet</p>
              <span>Start a new one to see it listed here.</span>
            </div>
          ) : (
            <ul className="ticket-items">
              {allTickets.map((ticket, index) => {
                const isActive = ticket.ticketId === ticketInfo.ticketId;
                return (
                  <li
                    key={ticket.ticketId}
                    style={{ '--i': Math.min(index, 12) } as React.CSSProperties}
                  >
                    <div
                      className={`ticket-card ${isActive ? 'active' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => loadTicket(ticket)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          loadTicket(ticket);
                        }
                      }}
                    >
                      <p className="ticket-preview">{ticket.preview}</p>
                      <div className="ticket-meta">
                        <span className="ticket-id">{ticket.ticketId}</span>
                        <time dateTime={`${ticket.dateStr} ${ticket.timeStr}`}>
                          {formatTicketDate(ticket.dateStr, ticket.timeStr)}
                        </time>
                      </div>
                      <button
                        type="button"
                        className="ticket-delete"
                        onClick={(e) => deleteTicket(e, ticket)}
                        aria-label={`Delete ${ticket.ticketId}`}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="sidebar-foot">
          <button className="btn-theme" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <button
            type="button"
            className="btn-icon sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="header-center">
            <h1 className="header-title">Support Assistant</h1>
            <span className="ticket-badge">{ticketInfo.ticketId}</span>
          </div>
        </header>

        <div className="chat-window">
          {isEmpty && !isAiTyping && !ticketInfo.isHistory ? (
            <div className="welcome">
              <div className="welcome-icon">S</div>
              <h2 className="welcome-title">What can we help with?</h2>
              <p className="welcome-desc">
                Ask about your account, billing, team settings, or anything else.
              </p>
              <div className="chips">
                {SUGGESTIONS.map((s, index) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    style={{ '--i': index } as React.CSSProperties}
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages view-enter">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`bubble-row ${msg.role}${msg.animate ? ' animate-in' : ''}`}
                >
                  <div className={`bubble ${msg.role}`}>
                    {msg.role === 'ai' ? (
                      <Markdown>{msg.content}</Markdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {isAiTyping && (
                <div className="bubble-row ai animate-in">
                  <div className="bubble ai typing-bubble">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              )}

              <div ref={endOfMessagesRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="error-banner animate-in" role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss">
              Dismiss
            </button>
          </div>
        )}

        <div className="composer-area">
          {ticketInfo.isHistory ? (
            <div className="readonly">
              This conversation is read-only.
              <button type="button" onClick={startNewChat}>
                Start a new one
              </button>
            </div>
          ) : (
            <form className="composer" onSubmit={handleSubmit}>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Type your message…"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isAiTyping}
              />
              <button
                type="submit"
                className="btn-send"
                disabled={!input.trim() || isAiTyping}
                aria-label="Send message"
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

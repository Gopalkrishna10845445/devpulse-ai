'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NavSection } from './Sidebar';
import {
  Menu,
  Search,
  Bell,
  GitBranch,
  RefreshCw,
  User,
  Settings,
  Bot,
  FolderGit2,
  Shield,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  X,
  Lock,
  Check,
  Radio,
  Github,
  LogOut,
  Loader2,
} from 'lucide-react';
import { useSession } from '@/lib/auth/useSession';

interface TopBarProps {
  activeSection: NavSection;
  currentRepo?: string;
  onSelectRepo?: (repo: string) => void;
  onNavigateSection?: (section: NavSection) => void;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const sectionTitles: Record<string, string> = {
  overview: 'Overview',
  agent: 'DevPilot Agent',
  codebase: 'Codebase',
  ingestion: 'Repository Ingestion',
  intelligence: 'Codebase Intelligence',
  qa: 'Q&A',
  rag: 'Q&A',
  engineering: 'Engineering',
  github: 'GitHub Intelligence',
  skills: 'Technology Intelligence',
  aireview: 'AI Code Review',
  activity: 'Text Heuristics',
  insights: 'Investigation Q&A',
  settings: 'Settings',
  security: 'Security',
  pullrequests: 'Pull Requests',
  events: 'Events & Hooks',
};

const KNOWN_REPOSITORIES = [
  'Gopalkrishna10845445/devpulse-ai',
  'facebook/react',
  'vercel/next.js',
  'tailwindlabs/tailwindcss',
  'microsoft/TypeScript',
];

interface SystemNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'system' | 'security' | 'intelligence' | 'webhook';
  read: boolean;
}

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'n-1',
    title: 'Webhook Dispatcher Online',
    description: 'HMAC SHA-256 verification and delivery deduplication active.',
    timestamp: 'Just now',
    type: 'webhook',
    read: false,
  },
  {
    id: 'n-2',
    title: 'Rate Limit Guard Active',
    description: 'Autonomous rate quota monitor: 60 req/hr unauth / 5,000 auth.',
    timestamp: '2m ago',
    type: 'system',
    read: false,
  },
  {
    id: 'n-3',
    title: 'AST Intelligence Ready',
    description: 'Deterministic dependency graph and symbol index mounted.',
    timestamp: '15m ago',
    type: 'intelligence',
    read: true,
  },
  {
    id: 'n-4',
    title: 'Security Scanner Standby',
    description: '6 deterministic vulnerability and secret rules ready.',
    timestamp: '1h ago',
    type: 'security',
    read: true,
  },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  currentRepo = 'Gopalkrishna10845445/devpulse-ai',
  onSelectRepo,
  onNavigateSection,
  onOpenMobileMenu,
  onOpenSearch,
  onRefresh = () => {},
  isRefreshing = false,
}) => {
  // Authentication session state
  const { user, authenticated, loading: sessionLoading, logout } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Dropdown states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRepoSwitcherOpen, setIsRepoSwitcherOpen] = useState(false);

  // Avatar image error fallback
  const [avatarError, setAvatarError] = useState(false);

  // Custom repo input in switcher
  const [customRepoInput, setCustomRepoInput] = useState('');

  // Real GitHub repositories state for authenticated user
  const [userRepos, setUserRepos] = useState<Array<{ name: string; fullName: string; isPrivate: boolean; stars: number; language?: string }>>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoFetchError, setRepoFetchError] = useState<string | null>(null);

  const fetchRepositories = useCallback(async () => {
    setIsLoadingRepos(true);
    setRepoFetchError(null);
    try {
      const url = user?.githubLogin
        ? `/api/repository/list?username=${encodeURIComponent(user.githubLogin)}`
        : '/api/repository/list';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.repos)) {
          setUserRepos(data.repos);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setRepoFetchError(errData.error || 'Failed to fetch repositories');
      }
    } catch (err: any) {
      setRepoFetchError(err.message || 'Failed to load repositories');
    } finally {
      setIsLoadingRepos(false);
    }
  }, [user?.githubLogin]);

  useEffect(() => {
    if (isRepoSwitcherOpen) {
      fetchRepositories();
    }
  }, [isRepoSwitcherOpen, fetchRepositories]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const success = await logout();
      if (success) {
        setIsProfileOpen(false);
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Notifications state
  const [notifications, setNotifications] = useState<SystemNotification[]>(INITIAL_NOTIFICATIONS);

  // Refs for click outside
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const repoSwitcherRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or Escape
  const closeAllMenus = useCallback(() => {
    setIsProfileOpen(false);
    setIsNotificationsOpen(false);
    setIsRepoSwitcherOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAllMenus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (repoSwitcherRef.current && !repoSwitcherRef.current.contains(target)) {
        setIsRepoSwitcherOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeAllMenus]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleSelectRepository = (repo: string) => {
    if (onSelectRepo && repo.trim()) {
      onSelectRepo(repo.trim());
      setIsRepoSwitcherOpen(false);
      setCustomRepoInput('');
    }
  };

  const handleNavigate = (section: NavSection) => {
    if (onNavigateSection) {
      onNavigateSection(section);
      closeAllMenus();
    }
  };

  return (
    <header className="h-topbar-h fixed top-0 right-0 left-0 lg:left-sidebar-w z-30 bg-surface border-b border-border px-4 sm:px-5 flex items-center justify-between">
      {/* Left: Mobile menu trigger + Section Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-1.5 text-body-sm">
          <span className="font-mono text-text-muted hidden sm:inline">DevPilot</span>
          <span className="text-text-muted hidden sm:inline">/</span>
          <h1 className="font-semibold text-text-primary">
            {sectionTitles[activeSection] || activeSection}
          </h1>
        </div>
      </div>

      {/* Center/Right: Repository Switcher + Search + Refresh + Notifications + User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* 1. Repository Quick-Switcher */}
        <div className="relative" ref={repoSwitcherRef}>
          <button
            onClick={() => {
              setIsRepoSwitcherOpen((prev) => !prev);
              setIsProfileOpen(false);
              setIsNotificationsOpen(false);
            }}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-alt border border-border text-caption font-mono max-w-[240px] hover:border-border-strong transition-colors cursor-pointer"
            aria-label="Select active repository"
            aria-expanded={isRepoSwitcherOpen}
          >
            <span className="w-2 h-2 rounded-full bg-semantic-green flex-shrink-0" />
            <span className="text-text-primary truncate font-medium">{currentRepo}</span>
            <span className="text-text-muted flex-shrink-0">:main</span>
            <ChevronDown size={12} className="text-text-muted ml-0.5 flex-shrink-0" />
          </button>

          {/* Repo Switcher Dropdown */}
          {isRepoSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-md bg-surface border border-border shadow-lg z-50 p-3 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-caption font-mono text-text-muted uppercase tracking-wider">
                  Active Repository
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-alt text-text-muted border border-border">
                  Commit-Scoped
                </span>
              </div>

              {/* Custom Repo Switch Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customRepoInput.trim()) {
                    handleSelectRepository(customRepoInput.trim());
                  }
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  placeholder="owner/repo..."
                  value={customRepoInput}
                  onChange={(e) => setCustomRepoInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-caption font-mono bg-surface-alt border border-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
                />
                <button
                  type="submit"
                  disabled={!customRepoInput.trim()}
                  className="px-2.5 py-1.5 text-caption font-medium rounded bg-text-primary text-surface hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  Switch
                </button>
              </form>

              {/* Real Ingested / User Repositories */}
              <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-medium text-text-muted block">
                    {authenticated && user?.githubLogin ? `${user.githubLogin}'s Repositories` : 'Repositories'}
                  </span>
                  {isLoadingRepos && <Loader2 size={11} className="animate-spin text-text-muted" />}
                </div>

                {isLoadingRepos && userRepos.length === 0 && (
                  <div className="py-3 flex items-center justify-center gap-2 text-caption text-text-muted">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Loading repositories...</span>
                  </div>
                )}

                {repoFetchError && (
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-[11px] text-semantic-red">
                    <span>{repoFetchError}</span>
                  </div>
                )}

                {!isLoadingRepos && userRepos.length === 0 && !repoFetchError && (
                  <p className="text-[11px] text-text-muted py-1">No repositories found.</p>
                )}

                {userRepos.map((repo) => {
                  const isSelected = repo.fullName === currentRepo;
                  return (
                    <button
                      key={repo.fullName}
                      onClick={() => handleSelectRepository(repo.fullName)}
                      className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between gap-2 text-caption font-mono transition-colors ${
                        isSelected
                          ? 'bg-surface-alt text-text-primary font-medium border border-border'
                          : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FolderGit2 size={13} className={isSelected ? 'text-semantic-green' : 'text-text-muted'} />
                        <span className="truncate">{repo.name}</span>
                        {repo.isPrivate && <Lock size={10} className="text-text-muted flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {repo.stars > 0 && (
                          <span className="text-[10px] text-text-muted">★{repo.stars}</span>
                        )}
                        {isSelected && <Check size={13} className="text-semantic-green" />}
                      </div>
                    </button>
                  );
                })}

                {/* Preset Repositories fallback if list is empty or for quick access */}
                {userRepos.length === 0 && (
                  <div className="pt-2 border-t border-border space-y-1">
                    <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">
                      Presets
                    </span>
                    {KNOWN_REPOSITORIES.map((repo) => {
                      const isSelected = repo === currentRepo;
                      return (
                        <button
                          key={repo}
                          onClick={() => handleSelectRepository(repo)}
                          className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between gap-2 text-caption font-mono transition-colors ${
                            isSelected
                              ? 'bg-surface-alt text-text-primary font-medium border border-border'
                              : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FolderGit2 size={13} className={isSelected ? 'text-semantic-green' : 'text-text-muted'} />
                            <span className="truncate">{repo}</span>
                          </div>
                          {isSelected && <Check size={13} className="text-semantic-green flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Command Search Bar Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-surface text-body-sm text-text-muted hover:text-text-primary hover:border-border-strong transition-colors"
          aria-label="Open command search"
        >
          <Search size={14} />
          <span className="hidden sm:inline text-caption">Search code or ask a question...</span>
          <kbd className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border border-border text-[10px] font-mono text-text-muted">
            ⌘K
          </kbd>
        </button>

        {/* 3. Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-md border border-border text-text-muted hover:text-text-primary hover:border-border-strong transition-colors"
          title="Refresh repository telemetry"
          aria-label="Refresh telemetry"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
        </button>

        {/* 4. Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => {
              setIsNotificationsOpen((prev) => !prev);
              setIsProfileOpen(false);
              setIsRepoSwitcherOpen(false);
            }}
            className="relative p-1.5 rounded-md border border-border text-text-muted hover:text-text-primary hover:border-border-strong transition-colors"
            aria-label="Notifications"
            aria-expanded={isNotificationsOpen}
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-semantic-green ring-2 ring-surface animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-md bg-surface border border-border shadow-lg z-50 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-body-sm font-semibold text-text-primary">System Signals</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-semantic-green/10 text-semantic-green text-[10px] font-mono font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearNotifications}
                      className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="py-8 text-center text-caption text-text-muted space-y-1">
                  <CheckCircle2 size={24} className="mx-auto text-semantic-green opacity-80" />
                  <p className="font-medium text-text-primary">All systems normal</p>
                  <p>No unread alerts or background errors.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded border transition-colors ${
                        n.read
                          ? 'bg-surface border-border opacity-70'
                          : 'bg-surface-alt border-border-strong'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-caption font-semibold text-text-primary">
                          {n.title}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          {n.timestamp}
                        </span>
                      </div>
                      <p className="text-caption text-text-secondary mt-0.5 leading-snug">
                        {n.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Profile / User Avatar & Menu */}
        <div className="relative" ref={profileRef}>
          {sessionLoading ? (
            <div className="w-8 h-8 rounded-full bg-surface-alt animate-pulse flex items-center justify-center border border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-text-muted/40" />
            </div>
          ) : !authenticated || !user ? (
            <a
              href="/api/auth/github"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-alt border border-border hover:border-border-strong text-caption font-medium text-text-primary transition-colors cursor-pointer"
              title="Sign in with GitHub"
            >
              <Github size={14} className="text-text-primary flex-shrink-0" />
              <span className="hidden sm:inline">Sign in with GitHub</span>
              <span className="sm:hidden">Sign In</span>
            </a>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsProfileOpen((prev) => !prev);
                  setIsNotificationsOpen(false);
                  setIsRepoSwitcherOpen(false);
                }}
                className="flex items-center gap-2 p-0.5 rounded-full border border-border hover:border-border-strong transition-colors focus:outline-none focus:ring-2 focus:ring-text-muted"
                aria-label="User profile menu"
                aria-haspopup="true"
                aria-expanded={isProfileOpen}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-surface-alt flex items-center justify-center">
                  {!avatarError && user.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName || user.githubLogin || 'User'}
                      onError={() => setAvatarError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-caption font-mono font-bold text-text-primary">
                      {(user.displayName || user.githubLogin || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </button>

              {/* Profile Dropdown Overlay */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-md bg-surface border border-border shadow-lg z-50 p-4 space-y-3">
                  {/* User Identity Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-border">
                    <div className="w-10 h-10 rounded-full bg-surface-alt border border-border flex items-center justify-center flex-shrink-0">
                      {!avatarError && user.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName || user.githubLogin || 'User'}
                          onError={() => setAvatarError(true)}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-body-sm font-mono font-bold text-text-primary">
                          {(user.displayName || user.githubLogin || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-body-sm font-semibold text-text-primary truncate">
                        {user.displayName || user.githubLogin || 'GitHub User'}
                      </div>
                      <div className="text-caption font-mono text-text-muted truncate">
                        @{user.githubLogin}
                      </div>
                      <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded bg-surface-alt text-[10px] font-mono text-text-secondary border border-border">
                        <span>{user.role === 'ADMIN' ? 'Admin' : (user.role || 'Member')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Chips */}
                  <div className="space-y-1.5 bg-surface-alt p-2.5 rounded border border-border text-[11px] font-mono text-text-secondary">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Environment:</span>
                      <span className="text-text-primary font-medium">Staging</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Client Secrets:</span>
                      <span className="text-semantic-green font-medium">0 Exposed</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">GitHub Mode:</span>
                      <span className="text-text-primary font-medium">OAuth 2.0 Connected</span>
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="space-y-1 pt-1">
                    <button
                      onClick={() => handleNavigate('settings')}
                      className="w-full text-left px-2.5 py-2 rounded text-body-sm text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors flex items-center gap-2.5"
                    >
                      <Settings size={14} className="text-text-muted" />
                      <span>Settings &amp; Configuration</span>
                    </button>

                    <button
                      onClick={() => handleNavigate('agent')}
                      className="w-full text-left px-2.5 py-2 rounded text-body-sm text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors flex items-center gap-2.5"
                    >
                      <Bot size={14} className="text-text-muted" />
                      <span>DevPilot Agent Workspace</span>
                    </button>

                    <button
                      onClick={() => handleNavigate('ingestion')}
                      className="w-full text-left px-2.5 py-2 rounded text-body-sm text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors flex items-center gap-2.5"
                    >
                      <FolderGit2 size={14} className="text-text-muted" />
                      <span>Repository Ingestion</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full text-left px-2.5 py-2 rounded text-body-sm text-semantic-red hover:bg-surface-alt transition-colors flex items-center gap-2.5 disabled:opacity-50 cursor-pointer"
                      aria-label="Sign out"
                    >
                      <LogOut size={14} className={isLoggingOut ? 'animate-spin' : 'text-semantic-red'} />
                      <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
                    </button>
                  </div>

                  {/* Session / Authentication Footer */}
                  <div className="pt-2 border-t border-border flex items-center justify-between text-caption text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-semantic-green" />
                      <span className="text-[11px] font-mono">Server Session Active</span>
                    </div>
                    <button
                      onClick={() => handleNavigate('settings')}
                      className="text-[11px] text-text-muted hover:text-text-primary hover:underline"
                    >
                      Configure Keys
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

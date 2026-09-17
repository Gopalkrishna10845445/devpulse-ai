'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileCode, MessageSquare, GitBranch, ExternalLink, LayoutDashboard, Shield, X } from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: CommandItem[] = [
    {
      id: 'overview',
      label: 'Go to Overview',
      description: 'Dashboard and health metrics',
      icon: <LayoutDashboard size={16} />,
      action: () => { onNavigate('overview'); onClose(); },
      group: 'Navigation',
    },
    {
      id: 'codebase',
      label: 'Explore codebase',
      description: 'Architecture, symbols, and files',
      icon: <FileCode size={16} />,
      action: () => { onNavigate('codebase'); onClose(); },
      group: 'Navigation',
    },
    {
      id: 'qa',
      label: 'Ask codebase question',
      description: 'Natural language Q&A with citations',
      icon: <MessageSquare size={16} />,
      action: () => { onNavigate('qa'); onClose(); },
      group: 'Navigation',
    },
    {
      id: 'engineering',
      label: 'View engineering metrics',
      description: 'GitHub intelligence and analysis',
      icon: <GitBranch size={16} />,
      action: () => { onNavigate('engineering'); onClose(); },
      group: 'Navigation',
    },
    {
      id: 'security',
      label: 'Security Intelligence',
      description: 'Secrets, vulnerabilities, and security signals',
      icon: <Shield size={16} />,
      action: () => { onNavigate('security'); onClose(); },
      group: 'Navigation',
    },
    {
      id: 'settings',
      label: 'Open settings',
      description: 'Configuration and profile analysis',
      icon: <Search size={16} />,
      action: () => { onNavigate('settings'); onClose(); },
      group: 'Navigation',
    },
    {
      id: 'github',
      label: 'Open on GitHub',
      description: 'View repository on GitHub',
      icon: <ExternalLink size={16} />,
      action: () => { window.open('https://github.com/Gopalkrishna10845445/devpulse-ai', '_blank'); onClose(); },
      group: 'Actions',
    },
  ];

  const filtered = query
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
      )
    : items;

  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
    }
  }, [filtered, selectedIndex, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4 command-overlay" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-surface rounded-lg border border-border shadow-modal overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border text-[10px] font-mono text-text-muted">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-body-sm text-text-muted text-center">No results found.</p>
          ) : (
            Object.entries(groups).map(([group, groupItems]) => (
              <div key={group}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-mono text-text-muted uppercase tracking-wider">{group}</p>
                {groupItems.map((item) => {
                  const currentIndex = flatIndex++;
                  const isSelected = currentIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left text-body-sm transition-colors ${
                        isSelected ? 'bg-surface-alt text-text-primary' : 'text-text-secondary hover:bg-surface-alt'
                      }`}
                    >
                      <span className="text-text-muted flex-shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{item.label}</span>
                        {item.description && (
                          <span className="text-caption text-text-muted ml-2">{item.description}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

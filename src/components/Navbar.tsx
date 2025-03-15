'use client';

import { Database, Home, Key, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

export function Navbar() {
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/fhe-keys', label: 'FHE Keys', icon: Key },
    { href: '/data', label: 'Data', icon: Database },
  ];

  return (
    <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full justify-center">
        <nav className="flex h-14 w-full max-w-screen-md items-center justify-between px-4">
          <div className="flex items-center gap-4">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Button>
              </Link>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="ml-auto"
          >
            {theme === 'dark'
              ? (
                  <Moon className="size-5" />
                )
              : (
                  <Sun className="size-5" />
                )}
          </Button>
        </nav>
      </div>
    </div>
  );
}

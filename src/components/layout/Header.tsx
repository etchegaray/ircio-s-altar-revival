import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, LogIn, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import CartSheet from '@/components/shop/CartSheet';

const Header = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  const navItems = [
    { path: '/', label: t('nav.home') },
    { path: '/finances', label: t('nav.finances') },
    { path: '/shop', label: t('nav.shop') },
    { path: '/events', label: t('nav.events') },
    { path: '/donations', label: t('nav.donations') },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-['Playfair_Display'] text-xl font-bold text-primary">
            Retablo de Ircio
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive(item.path) ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${
                location.pathname.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              {t('nav.admin')}
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <CartSheet />
          <LanguageSwitcher />
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" />
              {t('nav.logout')}
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                <LogIn className="h-4 w-4 mr-1" />
                {t('nav.login')}
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4 space-y-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`block text-sm font-medium py-2 transition-colors hover:text-primary ${
                isActive(item.path) ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className={`block text-sm font-medium py-2 transition-colors hover:text-primary flex items-center gap-1 ${
                location.pathname.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              {t('nav.admin')}
            </Link>
          )}
          <div className="pt-2 flex items-center gap-3">
            <CartSheet />
            <LanguageSwitcher />
            {user ? (
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-1" />
                {t('nav.logout')}
              </Button>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm">
                  <LogIn className="h-4 w-4 mr-1" />
                  {t('nav.login')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Building2,
  Users,
  IndianRupee,
  Wrench,
  LogOut,
  LayoutDashboard,
  FileText,
  PlusCircle,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { userRole, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const adminLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tenants', label: 'Tenants', icon: Users },
    { href: '/rent', label: 'Rent Tracking', icon: IndianRupee },
    { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  ];

  const tenantLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/my-rent', label: 'My Rent History', icon: FileText },
    { href: '/submit-request', label: 'Submit Request', icon: PlusCircle },
  ];

  const links = userRole === 'admin' ? adminLinks : tenantLinks;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-sidebar-primary" />
          <span className="font-semibold text-sidebar-foreground">PG Manager</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-sidebar z-40 transform transition-transform duration-200 ease-in-out',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border">
            <Building2 className="w-7 h-7 text-sidebar-primary" />
            <span className="font-bold text-lg text-sidebar-foreground">PG Manager</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-3 space-y-1">
            {links.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-xs font-medium text-sidebar-foreground">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">
                  {userRole}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

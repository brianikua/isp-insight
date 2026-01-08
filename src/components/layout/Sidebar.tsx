import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  Router, 
  Users, 
  Activity, 
  Bell, 
  Settings,
  LogOut,
  Network,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Routers', href: '/routers', icon: Router },
  { name: 'Resellers', href: '/resellers', icon: Users },
  { name: 'Sessions', href: '/sessions', icon: Activity },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const location = useLocation();
  const { signOut, profile, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = navigation.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className={cn(
      "flex flex-col h-screen bg-card border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center w-full")}>
          <div className="p-2 rounded-lg bg-primary/10">
            <Network className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground">ISP Monitor</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border space-y-2">
        {!collapsed && profile && (
          <div className="px-3 py-2 rounded-lg bg-muted/50">
            <p className="text-sm font-medium truncate">{profile.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={cn("w-full", collapsed ? "justify-center" : "justify-start")}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-20 -right-3 p-1 rounded-full bg-background border border-border shadow-sm hover:bg-muted"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

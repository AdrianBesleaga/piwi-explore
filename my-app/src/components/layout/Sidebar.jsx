import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Home, Users, FileStack, Settings, Database } from 'lucide-react';
import { cn } from '../../lib/utils';

const Sidebar = ({ isOpen }) => {
  const clients = useSelector((state) => state.clients.items);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Templates', path: '/templates', icon: FileStack },
    { name: 'Settings', path: '/settings', icon: Settings }
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-[57px] h-[calc(100vh-57px)] bg-white border-r border-gray-200 transition-transform duration-300 w-64 z-20",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors font-medium",
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Recent Clients */}
      {clients.length > 0 && (
        <div className="px-4 py-2 mt-4">
          <Separator className="mb-4" />
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recent Clients
          </h3>
          <div className="space-y-1">
            {clients.slice(0, 5).map((client) => (
              <NavLink
                key={client.id}
                to={`/clients/${client.id}`}
                className={({ isActive }) =>
                  cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive ? "bg-gray-100" : "text-gray-700 hover:bg-gray-50"
                  )
                }
              >
                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="truncate">{client.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Clients
            </span>
            <Badge variant="secondary" className="text-xs">
              {clients.length}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 flex items-center gap-1">
              <Database className="w-3 h-3" />
              Storage
            </span>
            <Badge variant="secondary" className="text-xs">
              0 MB
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

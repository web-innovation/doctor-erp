import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  BellIcon,
  ChevronDownIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';

const Header = ({ onMenuClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const quickActionsRef = useRef(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Fetch alerts/notifications from dashboard API
  const { data: alertsData } = useQuery({
    queryKey: ['dashboardAlerts'],
    queryFn: dashboardService.getAlerts,
    refetchInterval: 60000, // Refresh every minute
  });

  // Convert alerts to notifications format
  const notifications = (alertsData?.data?.alerts || []).map((alert, index) => ({
    id: index + 1,
    title: alert.title,
    message: alert.message,
    time: 'Just now',
    unread: true,
    type: alert.type
  }));
  
  // Add upcoming appointments as notifications
  const upcomingAppointments = alertsData?.data?.upcomingAppointments || [];
  upcomingAppointments.forEach((apt, index) => {
    notifications.push({
      id: 100 + index,
      title: 'Upcoming Appointment',
      message: `${apt.patient?.name} at ${apt.timeSlot || 'scheduled'}`,
      time: 'Today',
      unread: true
    });
  });

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Generate breadcrumbs from path
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, index) => ({
      name: path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' '),
      path: '/' + paths.slice(0, index + 1).join('/'),
      isLast: index === paths.length - 1,
    }));
  };

  const breadcrumbs = getBreadcrumbs();

  // Get today's date
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Quick actions - navigate to pages with modals/forms
  const quickActions = [
    { name: 'New Patient', path: '/patients?action=new', icon: UserCircleIcon },
    { name: 'New Appointment', path: '/appointments?action=new', icon: PlusIcon },
    { name: 'New Prescription', path: '/prescriptions/new', icon: PlusIcon },
    { name: 'New Invoice', path: '/billing/new', icon: PlusIcon },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target)) {
        setShowQuickActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to patients page with search query
      navigate(`/patients?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section - Breadcrumbs and Date */}
          <div className="flex-1 min-w-0 hidden md:block">
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-1 text-sm">
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                Home
              </Link>
              {breadcrumbs.map((crumb) => (
                <span key={crumb.path} className="flex items-center">
                  <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-1" />
                  {crumb.isLast ? (
                    <span className="text-gray-900 font-medium">{crumb.name}</span>
                  ) : (
                    <Link to={crumb.path} className="text-gray-500 hover:text-gray-700">
                      {crumb.name}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
            {/* Today's date */}
            <p className="text-xs text-gray-500 mt-1">{today}</p>
          </div>

          {/* Center section - Search */}
          <div className="flex-1 max-w-md mx-4">
            <form onSubmit={handleSearch} className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients, appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </form>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center space-x-4">
            {/* Quick Actions */}
            <div ref={quickActionsRef} className="relative hidden md:block">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <PlusIcon className="h-5 w-5 mr-1" />
                Quick Action
              </button>

              {showQuickActions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {quickActions.map((action) => (
                    <Link
                      key={action.path}
                      to={action.path}
                      onClick={() => setShowQuickActions(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <action.icon className="h-4 w-4 mr-2 text-gray-500" />
                      {action.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div ref={notificationRef} className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${
                            notification.unread ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start">
                            {notification.unread && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                            )}
                            <div className={notification.unread ? '' : 'ml-4'}>
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <p className="text-sm text-gray-500">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-gray-500">
                        No notifications
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-200">
                    <Link
                      to="/dashboard"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      onClick={() => setShowNotifications(false)}
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.split(' ').map((n) => n[0]).join('') || 'U'}
                    </span>
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{user?.role || 'Staff'}</p>
                </div>
                <ChevronDownIcon className="h-4 w-4 text-gray-500 hidden md:block" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-200 md:hidden">
                    <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{user?.role || 'Staff'}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <UserCircleIcon className="h-4 w-4 mr-2 text-gray-500" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Cog6ToothIcon className="h-4 w-4 mr-2 text-gray-500" />
                    Settings
                  </Link>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

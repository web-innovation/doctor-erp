import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientService } from '../../services/patientService';
import labsAgentsService from '../../services/labsAgentsService';
import {
  MagnifyingGlassIcon,
  BellIcon,
  Bars3Icon,
  ChevronDownIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth, useHasPerm } from '../../context/AuthContext';
import staffService from '../../services/staffService';
import authService from '../../services/authService';
import { useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboardService';
import appNotificationService from '../../services/appNotificationService';

const Header = ({ onMenuClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [customNotifications, setCustomNotifications] = useState([]);
  const [seenNotificationKeys, setSeenNotificationKeys] = useState(() => new Set());
  
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const quickActionsRef = useRef(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, activeViewUser, setActiveViewUser, clearActiveViewUser } = useAuth();

  const getNotificationKey = (notification) => {
    const source = notification?.source || 'unknown';
    const idPart = notification?.id ? String(notification.id) : '';
    const titlePart = notification?.title || '';
    const messagePart = notification?.message || '';
    const pathPart = notification?.path || '';
    return `${source}|${idPart}|${titlePart}|${messagePart}|${pathPart}`;
  };

  // Dev debug: log active view changes to help debug role/permission issues
  useEffect(() => {
    console.log('DEBUG activeViewUser changed:', activeViewUser, 'currentUser:', user);
  }, [activeViewUser, user]);

  // Fetch alerts/notifications from dashboard API (scope by activeViewUser when present)
  const { data: alertsData } = useQuery({
    queryKey: ['dashboardAlerts', activeViewUser?.id || null],
    queryFn: () => dashboardService.getAlerts(activeViewUser?.id || null),
    refetchInterval: 60000, // Refresh every minute
  });

  // Convert alerts to notifications format
  const dashboardNotifications = (alertsData?.data?.alerts || []).map((alert, index) => ({
    id: index + 1,
    title: alert.title,
    message: alert.message,
    time: 'Just now',
    unread: true,
    type: alert.type,
    source: 'dashboard'
  }));
  
  // Add upcoming appointments as notifications
  const upcomingAppointments = alertsData?.data?.upcomingAppointments || [];
  upcomingAppointments.forEach((apt, index) => {
    dashboardNotifications.push({
      id: 100 + index,
      title: 'Upcoming Appointment',
      message: `${apt.patient?.name} at ${apt.timeSlot || 'scheduled'}`,
      time: 'Today',
      unread: true,
      source: 'dashboard'
    });
  });

  const localNotifications = (customNotifications || []).map((n) => ({
    ...n,
    time: n?.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now'
  }));

  const notifications = [...localNotifications, ...dashboardNotifications].map((notification) => {
    const seen = seenNotificationKeys.has(getNotificationKey(notification));
    return {
      ...notification,
      unread: !seen && !!notification.unread
    };
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

  const [breadcrumbsState, setBreadcrumbsState] = useState(getBreadcrumbs());

  // Expose a simple `breadcrumbs` variable for JSX usage
  const breadcrumbs = breadcrumbsState;

  // Replace ID segments with readable names for patients and labs when possible
  useEffect(() => {
    let mounted = true;
    const paths = location.pathname.split('/').filter(Boolean);
    const initial = getBreadcrumbs();
    setBreadcrumbsState(initial);

    (async () => {
      try {
        for (let i = 0; i < paths.length; i++) {
          const seg = paths[i];
          const prev = paths[i - 1];
          if (!seg) continue;

          // If path is /patients/:id -> fetch patient name
          if (prev === 'patients') {
            try {
              const resp = await patientService.getById(seg);
              const name = resp?.name || resp?.data?.name || resp?.data;
              if (name && mounted) {
                setBreadcrumbsState((old) => old.map((c, idx) => (idx === i ? { ...c, name } : c)));
              }
            } catch (e) { /* ignore */ }
          }

          // If path is /labs-agents/:id or /labs-agents/:id/... -> fetch lab name
          if (prev === 'labs-agents') {
            try {
              const resp = await labsAgentsService.getLabById(seg);
              const name = resp?.data?.name || resp?.name;
              if (name && mounted) {
                setBreadcrumbsState((old) => old.map((c, idx) => (idx === i ? { ...c, name } : c)));
              }
            } catch (e) { /* ignore */ }
          }
        }
      } catch (err) {
        console.error('Breadcrumb name resolution error', err);
      }
    })();

    return () => { mounted = false; };
  }, [location.pathname]);

  // Get today's date
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Quick actions - navigate to pages with modals/forms
  const quickActions = [
    { name: 'New Patient', path: '/patients?action=new', icon: UserCircleIcon, key: 'patients' },
    { name: 'New Appointment', path: '/appointments?action=new', icon: PlusIcon, key: 'appointments' },
    { name: 'New Prescription', path: '/prescriptions/new', icon: PlusIcon, key: 'prescriptions' },
    { name: 'New Invoice', path: '/billing/new', icon: PlusIcon, key: 'billing' },
  ];

  const canCreatePatient = useHasPerm('patients:create', ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST']);
  const canCreateAppointment = useHasPerm('appointments:create', ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST']);
  const canCreatePrescription = useHasPerm('prescriptions:create', ['SUPER_ADMIN', 'ADMIN', 'DOCTOR']);
  const canCreateBilling = useHasPerm('billing:create', ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT']);

  const allowedQuickActions = quickActions.filter((a) => {
    if (a.key === 'patients') return canCreatePatient;
    if (a.key === 'appointments') return canCreateAppointment;
    if (a.key === 'prescriptions') return canCreatePrescription;
    if (a.key === 'billing') return canCreateBilling;
    return true;
  });

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

  useEffect(() => {
    const sync = () => {
      setCustomNotifications(appNotificationService.list());
    };
    sync();
    window.addEventListener(appNotificationService.updateEvent, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(appNotificationService.updateEvent, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Determine clinic admin flag
  const isClinicAdmin = user?.isClinicAdmin === true || user?.role === 'SUPER_ADMIN' || user?.clinicRole === 'ADMIN' || user?.isOwner === true;
  const userRoleSubtitle = (() => {
    if (user?.role === 'SUPER_ADMIN') return 'Super Admin';
    if (isClinicAdmin) return 'Admin-Doctor';
    return user?.role || 'Staff';
  })();

  // Helper to normalize role strings to canonical uppercase roles used across UI
  const normalizeRole = (role) => {
    if (!role) return 'STAFF';
    const r = role.toString().toLowerCase();
    if (r.includes('super')) return 'SUPER_ADMIN';
    if (r.includes('doctor')) return 'DOCTOR';
    if (r.includes('pharm')) return 'PHARMACIST';
    if (r.includes('recept') || r.includes('reception')) return 'RECEPTIONIST';
    if (r.includes('account')) return 'ACCOUNTANT';
    if (r.includes('nurse')) return 'NURSE';
    if (r.includes('lab')) return 'LAB_TECHNICIAN';
    return r.toUpperCase();
  };

  // Derive role from staff entry if user.role is generic 'STAFF'
  const deriveRoleFromStaff = (staffEntry) => {
    if (!staffEntry) return 'STAFF';
    const possible = [staffEntry.designation, staffEntry.department, staffEntry.role, staffEntry.user?.role, staffEntry.user?.designation];
    for (const p of possible) {
      if (!p) continue;
      const r = p.toString().toLowerCase();
      if (r.includes('pharm')) return 'PHARMACIST';
      if (r.includes('doctor')) return 'DOCTOR';
      if (r.includes('recept') || r.includes('reception')) return 'RECEPTIONIST';
      if (r.includes('account')) return 'ACCOUNTANT';
    }
    // Keep generic staff designations (e.g., nurse/lab assistant) as STAFF so
    // Access Management under STAFF role applies consistently.
    return 'STAFF';
  };

  // Fetch staff list for staff-switcher (visible only to clinic admin)
  const queryClient = useQueryClient();
  const invalidateViewQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardCharts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardAlerts'] });
    queryClient.invalidateQueries({ queryKey: ['patients'] });
    queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
  };
  const { data: staffResp } = useQuery({
    queryKey: ['clinicStaff'],
    queryFn: () => staffService.getAll({ limit: 200 }),
    enabled: !!user && isClinicAdmin
  });
  const staffList = Array.isArray(staffResp) ? staffResp : (staffResp?.data || []);

  const handleViewAsChange = async (e) => {
    const uid = e.target.value;
    if (!uid) {
      // stop impersonation mode
      localStorage.removeItem('impersonationToken');
      localStorage.setItem('impersonationActive', 'false');
      clearActiveViewUser();
      invalidateViewQueries();
      return;
    }

    // If logged-in user is clinic admin (or super admin), use server-side scoping (no impersonation token)
    const isClinicAdmin = user?.isClinicAdmin === true || user?.role === 'SUPER_ADMIN';
    if (isClinicAdmin) {
      // find staff entry locally first
      const staffEntry = staffList.find((s) => (s.user && s.user.id === uid) || s.id === uid);
      if (staffEntry) {
        const raw = staffEntry.user || { id: staffEntry.id, name: staffEntry.name, role: staffEntry.role, email: staffEntry.email };
        let roleCandidate = raw.role;
        if (!roleCandidate || roleCandidate === 'STAFF') roleCandidate = deriveRoleFromStaff(staffEntry);
        const viewUser = { ...raw, role: normalizeRole(roleCandidate) };
        // ensure no impersonation token is used
        localStorage.removeItem('impersonationToken');
        localStorage.setItem('impersonationActive', 'false');
        setActiveViewUser(viewUser);
        // refresh queries which now include activeViewUser id
        invalidateViewQueries();
      } else {
        // as fallback, fetch user via API but do not request impersonation token
        try {
          const resp = await staffService.getById(uid);
          const raw = resp?.data?.user || resp?.data || { id: uid };
          let roleCandidate = raw.role;
          if ((!roleCandidate || roleCandidate === 'STAFF') && resp?.data?.designation) roleCandidate = resp.data.designation;
          const viewUser = { ...raw, role: normalizeRole(roleCandidate) };
          localStorage.removeItem('impersonationToken');
          localStorage.setItem('impersonationActive', 'false');
          setActiveViewUser(viewUser);
          invalidateViewQueries();
        } catch (err) {
          console.error('Failed to fetch staff for view-as:', err);
        }
      }

      return;
    }

    // Non-admin doctors: request server-side impersonation token (short-lived)
    try {
      const resp = await authService.impersonate(uid);
      // store impersonation token and activate
      localStorage.setItem('impersonationToken', resp.token);
      localStorage.setItem('impersonationActive', 'true');
      // set active view user in store (normalize role)
      const userRaw = resp.user || resp;
      setActiveViewUser({ ...userRaw, role: normalizeRole(userRaw.role) });
      // refresh queries
      invalidateViewQueries();
      } catch (err) {
      // fallback: set active view user without impersonation
      const staffEntry = staffList.find((s) => (s.user && s.user.id === uid) || s.id === uid);
      if (staffEntry) {
        const raw = staffEntry.user || { id: staffEntry.id, name: staffEntry.name, role: staffEntry.role };
        let roleCandidate = raw.role;
        if (!roleCandidate || roleCandidate === 'STAFF') roleCandidate = deriveRoleFromStaff(staffEntry);
        setActiveViewUser({ ...raw, role: normalizeRole(roleCandidate) });
        invalidateViewQueries();
      }
      console.error('Impersonation failed:', err);
    }
  };

  const stopViewing = async () => {
    try {
      // Clear impersonation tokens
      localStorage.removeItem('impersonationToken');
      localStorage.setItem('impersonationActive', 'false');
      // notify server if needed
      try { await authService.stopImpersonation(); } catch (e) { /* ignore */ }
    } finally {
      clearActiveViewUser();
      invalidateViewQueries();
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to patients page with search query
      navigate(`/patients?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification) return;
    const notificationKey = getNotificationKey(notification);
    setSeenNotificationKeys((prev) => {
      const next = new Set(prev);
      next.add(notificationKey);
      return next;
    });
    if (notification.source === 'local' && notification.id) {
      appNotificationService.remove(notification.id);
    }
    if (notification.path) {
      navigate(notification.path);
    }
    setShowNotifications(false);
  };

  const handleBellClick = () => {
    if (!showNotifications) {
      setSeenNotificationKeys((prev) => {
        const next = new Set(prev);
        notifications.forEach((notification) => next.add(getNotificationKey(notification)));
        return next;
      });
    }
    setShowNotifications((prev) => !prev);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 md:px-6 lg:px-8">
        {/* Viewing-as banner */}
        {activeViewUser && activeViewUser.id && activeViewUser.id !== user?.id && (
          <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 px-3 py-2 text-sm flex items-center justify-between">
            <div>Viewing as: <strong className="text-yellow-900">{activeViewUser.name || activeViewUser.email}</strong> <span className="text-xs text-gray-600">({activeViewUser.role || 'Staff'})</span></div>
            <div>
              <button onClick={stopViewing} className="ml-2 inline-flex items-center px-3 py-1 bg-white border border-yellow-300 rounded text-sm text-yellow-900 hover:bg-yellow-100">Stop viewing</button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden mr-3 p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

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
            {/* Staff selector for viewing dashboard as another staff (admin/doctor only) - visible only on dashboard */}
              {isClinicAdmin && location.pathname.startsWith('/dashboard') && (
                <div className="hidden sm:block">
                  <select
                    value={activeViewUser?.id || ''}
                    onChange={handleViewAsChange}
                    className="border rounded-md px-2 py-1 text-sm"
                  >
                  {/* Admin clinic is the default; selecting it clears activeViewUser */}
                  <option value="">Admin clinic</option>
                  {staffList
                    .filter((s) => (s.user?.id || s.id) !== user?.id)
                    .map((s) => {
                      const name = s.user?.name || s.name || 'Unknown';
                      const roleRaw = (s.user && s.user.role) || s.role || 'STAFF';
                      const roleLabel = roleRaw.toLowerCase().replace(/_/g, ' ');
                      const label = `${name} - ${roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)}`;
                      return (
                        <option key={s.user?.id || s.id} value={s.user?.id || s.id}>{label}</option>
                      );
                    })}
                </select>
              </div>
            )}
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
                  {allowedQuickActions.map((action) => (
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
                onClick={handleBellClick}
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
                          onClick={() => handleNotificationClick(notification)}
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
                  <p className="text-xs text-gray-500">{userRoleSubtitle}</p>
                </div>
                <ChevronDownIcon className="h-4 w-4 text-gray-500 hidden md:block" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-200 md:hidden">
                    <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{userRoleSubtitle}</p>
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

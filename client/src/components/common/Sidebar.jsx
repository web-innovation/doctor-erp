import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HomeIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ChartBarIcon,
  BeakerIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ClockIcon,
  CalendarIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import settingsService from '../../services/settingsService';
import { dashboardService } from '../../services/dashboardService';

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: HomeIcon, roles: ['admin', 'doctor', 'nurse', 'receptionist', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'ACCOUNTANT', 'SUPER_ADMIN'] },
  { name: 'Patients', path: '/patients', icon: UserGroupIcon, roles: ['admin', 'doctor', 'nurse', 'receptionist', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'ACCOUNTANT', 'SUPER_ADMIN'] },
  { name: 'Appointments', path: '/appointments', icon: CalendarDaysIcon, roles: ['admin', 'doctor', 'nurse', 'receptionist', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'ACCOUNTANT', 'SUPER_ADMIN'] },
  { name: 'Prescriptions', path: '/prescriptions', icon: DocumentTextIcon, roles: ['admin', 'doctor', 'DOCTOR', 'SUPER_ADMIN'] },
  { name: 'Pharmacy', path: '/pharmacy', icon: BuildingStorefrontIcon, roles: ['admin', 'pharmacist', 'DOCTOR', 'PHARMACIST', 'SUPER_ADMIN'] },
  { name: 'Ledger', path: '/ledger', icon: DocumentTextIcon, roles: ['admin', 'doctor', 'pharmacist', 'accountant', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT', 'SUPER_ADMIN'] },
  { name: 'Billing', path: '/billing', icon: CurrencyDollarIcon, roles: ['admin', 'receptionist', 'accountant', 'DOCTOR', 'RECEPTIONIST', 'ACCOUNTANT', 'SUPER_ADMIN'] },
  { name: 'Staff', path: '/staff', icon: UsersIcon, roles: ['admin', 'DOCTOR', 'SUPER_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'STAFF'] },
  { name: 'Attendance', path: '/staff/attendance', icon: ClockIcon, roles: ['admin', 'DOCTOR', 'SUPER_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'STAFF'] },
  { name: 'Leave', path: '/staff/leave', icon: CalendarIcon, roles: ['admin', 'DOCTOR', 'SUPER_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'STAFF'] },
  { name: 'Reports', path: '/reports', icon: ChartBarIcon, roles: ['admin', 'doctor', 'accountant', 'DOCTOR', 'ACCOUNTANT', 'SUPER_ADMIN'] },
  { name: 'Labs', path: '/labs', icon: BeakerIcon, roles: ['admin', 'doctor', 'lab_technician', 'DOCTOR', 'SUPER_ADMIN', 'ACCOUNTANT'] },
  { name: 'Agents & Commissions', path: '/agents', icon: UsersIcon, roles: ['admin', 'accountant', 'DOCTOR', 'SUPER_ADMIN', 'ACCOUNTANT'] },
  { name: 'Settings', path: '/settings', icon: Cog6ToothIcon, roles: ['admin', 'DOCTOR', 'SUPER_ADMIN'] },
];

// Admin menu items for Super Admin only
const adminMenuItems = [
  { name: 'Admin Panel', path: '/admin', icon: BuildingOffice2Icon, roles: ['SUPER_ADMIN'] },
  { name: 'All Clinics', path: '/admin/clinics', icon: BuildingStorefrontIcon, roles: ['SUPER_ADMIN'] },
  { name: 'All Users', path: '/admin/users', icon: UsersIcon, roles: ['SUPER_ADMIN'] },
];

const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const location = useLocation();
  const { user, activeViewUser, normalizeRole } = useAuth();
  
  // Check if we're on admin routes
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Fetch clinic role permissions (if configured)
  const { data: rolePermResp } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: () => settingsService.getRolePermissions(),
    staleTime: 5 * 60 * 1000,
    enabled: !!user && !isAdminRoute,
  });

  const rolePermissions = rolePermResp?.data?.data || rolePermResp?.data || null;

  const { data: accessResp } = useQuery({
    queryKey: ['accessControls'],
    queryFn: () => settingsService.getAccessControls(),
    staleTime: 5 * 60 * 1000,
    enabled: !!user && !isAdminRoute,
  });
  const accessControls = accessResp?.data?.data || accessResp?.data || accessResp || null;
  
  // Get user role from AuthContext — if viewing as another staff, use their role
  const userRoleRaw = activeViewUser?.role || user?.role || 'DOCTOR';
  const normalizedRole = normalizeRole ? normalizeRole(userRoleRaw) : (userRoleRaw || 'DOCTOR').toString().toUpperCase();
  // Map designation-derived staff roles back to STAFF when no explicit role override exists.
  // Also keep historical STAFF->DOCTOR fallback for doctor-staff setups.
  const effectiveRoleForMatch = (() => {
    const role = normalizedRole;
    const isStaffVariant = ['NURSE', 'LAB_TECHNICIAN'].includes(role);
    if (isStaffVariant && rolePermissions && !rolePermissions[role] && rolePermissions.STAFF) {
      return 'STAFF';
    }
    if (role !== 'STAFF') return role;
    if (!rolePermissions) return 'DOCTOR';
    const hasStaffOverride = Object.prototype.hasOwnProperty.call(rolePermissions, 'STAFF');
    const hasDoctorOverride = Object.prototype.hasOwnProperty.call(rolePermissions, 'DOCTOR');
    return !hasStaffOverride && hasDoctorOverride ? 'DOCTOR' : 'STAFF';
  })();

  // Determine if current real user is a clinic admin (some doctor users act as clinic admin)
  const isClinicAdmin = user?.role === 'SUPER_ADMIN' || user?.isClinicAdmin === true || user?.clinicRole === 'ADMIN' || user?.isOwner === true;
  // If viewing as another user, check if that viewed user should be treated as clinic admin
  const viewingAsClinicAdmin = activeViewUser && (activeViewUser.role === 'SUPER_ADMIN' || activeViewUser.isClinicAdmin === true || activeViewUser.clinicRole === 'ADMIN' || activeViewUser.isOwner === true);

  // Determine if admin is actively viewing as another staff user
  const isViewingAsAnother = !!(activeViewUser && activeViewUser.id && user && activeViewUser.id !== user.id);
  // Fetch clinic name from settings (only if not on admin routes)
  const { data: clinicSettings } = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: () => settingsService.getClinicSettings(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !isAdminRoute && normalizedRole !== 'SUPER_ADMIN',
  });
  
  const clinicName = clinicSettings?.clinicName || 'Docsy';
  
  // Fetch today's OPD count from dashboard stats (only if not on admin routes)
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard-stats-sidebar'],
    queryFn: () => dashboardService.getStats(),
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 60000, // Refetch every minute
    enabled: !isAdminRoute,
  });
  
  const todayOPDCount = dashboardStats?.data?.appointments?.total || 0;

  // Map menu paths to permission keys used in rolePermissions.
  // A menu is shown when any mapped permission is granted.
  const menuPermissionMap = {
    '/dashboard': ['dashboard:read', 'dashboard:view'],
    '/patients': ['patients:read', 'patients:create', 'patients:update'],
    '/appointments': ['appointments:read', 'appointments:create', 'appointments:update'],
    '/prescriptions': ['prescriptions:read', 'prescriptions:create'],
    '/pharmacy': ['pharmacy:read', 'pharmacy:create'],
    '/ledger': ['ledger:read', 'ledger:create', 'ledger:update', 'ledger:delete'],
    '/billing': ['billing:read', 'billing:create', 'billing:edit'],
    '/staff': ['staff:read', 'staff:create', 'staff:update'],
    '/staff/attendance': ['staff:read', 'staff:update'],
    '/staff/leave': ['leaves:read', 'leaves:create', 'leaves:update'],
    '/reports': ['reports:opd', 'reports:collections'],
    '/settings': ['settings:clinic'],
    // granular mappings for labs and agents
    '/labs-agents': ['labs:read', 'labs:create', 'labs:update'],
    '/labs': ['labs:read', 'labs:create', 'labs:update', 'labs:tests'],
    '/agents': ['agents:read', 'agents:create', 'agents:update', 'commissions:read', 'commissions:pay']
  };

  // Admin should only bypass clinic-level role permissions when NOT viewing-as another staff.
  // When a clinic admin selects a staff to "view as", the UI should respect that staff's permissions/role.
  const bypassPermissions = (isClinicAdmin && !isViewingAsAnother) || user?.role === 'SUPER_ADMIN';

  // Filter menu items based on user role and clinic-level rolePermissions (if present)
  const filteredMenuItems = menuItems.filter((item) => {
    const normalizeDisabled = (value) => {
      const raw = String(value || '').trim().toLowerCase();
      if (!raw) return '';
      if (raw.startsWith('leader')) return raw.replace(/^leader/, 'ledger');
      return raw;
    };
    const disabledList = Array.isArray(accessControls?.disabledPermissions) ? accessControls.disabledPermissions : [];
    const disabledSet = new Set(disabledList.map(normalizeDisabled).filter(Boolean));
    const requiredPerms = Array.isArray(menuPermissionMap[item.path]) ? menuPermissionMap[item.path] : [];
    const isDisabled = requiredPerms.length
      ? requiredPerms.some((p) => {
          const perm = String(p || '').toLowerCase();
          const resource = perm.split(':')[0];
          return disabledSet.has(perm) || disabledSet.has(resource) || disabledSet.has(`${resource}:*`) || disabledSet.has('*');
        })
      : disabledSet.has('*');

    // Super admin disables should hide for clinic users (including clinic admin)
    if (isDisabled && normalizedRole !== 'SUPER_ADMIN') return false;

    // Admin clinic doctor or super admin can always see everything (unless disabled)
    if (bypassPermissions) return true;

    const roleMatch = item.roles.some(r => r.toString().toUpperCase() === effectiveRoleForMatch);
    const roleKey = normalizedRole;
    const requiredPermKeys = requiredPerms;
    // Determine which role key to use when looking up clinic overrides. If the
    // clinic has an explicit override for the normalizedRole, use it. Otherwise
    // fall back to the effectiveRoleForMatch (e.g., treat STAFF as DOCTOR when
    // only DOCTOR is defined in clinic overrides).
    const roleKeyForPerms = rolePermissions
      ? (rolePermissions[roleKey] ? roleKey : (rolePermissions[effectiveRoleForMatch] ? effectiveRoleForMatch : roleKey))
      : roleKey;
    const permsForRole = rolePermissions && rolePermissions[roleKeyForPerms];

    // If clinic-level overrides are configured, they are authoritative for mapped permissions.
    if (rolePermissions) {
      if (requiredPermKeys.length > 0) {
        // Backward compatibility: older clinics may not have complete permission
        // keys for all roles; fall back to static role mapping in that case.
        if (!Array.isArray(permsForRole) || permsForRole.length === 0) return roleMatch;
        if (requiredPermKeys.some((permKey) => permsForRole.includes(permKey))) return true;

        // For legacy role-permission sets that don't include any `staff:*` keys,
        // keep Staff menu visible for matching roles.
        if (
          requiredPermKeys.some((permKey) => permKey.startsWith('staff:')) &&
          roleMatch &&
          !permsForRole.some((p) => String(p || '').startsWith('staff:'))
        ) {
          return true;
        }
        return false;
      }
      return roleMatch;
    }

    // If there are NO clinic-level overrides, hide any menu item that has a mapped permission
    // (require explicit Access Management entry). If no mapped permission exists, fall back
    // to static role membership.
    if (requiredPermKeys.length > 0) return false;
    return roleMatch;
  });

  const sidebarClasses = `
    fixed top-0 left-0 h-full bg-white shadow-xl z-50
    transition-all duration-300 ease-in-out
    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
    lg:translate-x-0
    ${collapsed ? 'lg:w-20' : 'lg:w-64'}
    w-64
  `;

  return (
    <aside className={sidebarClasses}>
      <div className="flex flex-col h-full">
        {/* Logo section */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 ${isAdminRoute ? 'bg-purple-600' : 'bg-blue-600'} rounded-lg flex items-center justify-center`}>
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-800">{isAdminRoute ? 'Admin Panel' : clinicName}</span>
            </div>
          )}
          
          {collapsed && (
            <div className={`w-10 h-10 ${isAdminRoute ? 'bg-purple-600' : 'bg-blue-600'} rounded-lg flex items-center justify-center mx-auto`}>
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
          )}

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="p-2 rounded-md hover:bg-gray-100 lg:hidden"
          >
            <XMarkIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Show admin menu when on admin routes */}
          {isAdminRoute && normalizedRole === 'SUPER_ADMIN' ? (
            <>
              <ul className="space-y-1 px-3">
                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path ||
                    (item.path !== '/admin' && location.pathname.startsWith(item.path));

                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={onMobileClose}
                        className={`
                          flex items-center px-3 py-2.5 rounded-lg transition-colors duration-200
                          ${isActive
                            ? 'bg-purple-50 text-purple-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }
                          ${collapsed ? 'justify-center' : ''}
                        `}
                        title={collapsed ? item.name : ''}
                      >
                        <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
                        {!collapsed && (
                          <span className="ml-3">{item.name}</span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
              {/* Link back to clinic dashboard */}
              {!collapsed && (
                <div className="px-3 mt-4 mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Switch View
                  </p>
                </div>
              )}
              {collapsed && <div className="border-t border-gray-200 my-2 mx-3"></div>}
              <ul className="space-y-1 px-3">
                <li>
                  <NavLink
                    to="/dashboard"
                    onClick={onMobileClose}
                    className={`
                      flex items-center px-3 py-2.5 rounded-lg transition-colors duration-200
                      text-gray-600 hover:bg-gray-50 hover:text-gray-900
                      ${collapsed ? 'justify-center' : ''}
                    `}
                    title={collapsed ? 'Clinic Dashboard' : ''}
                  >
                    <HomeIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    {!collapsed && (
                      <span className="ml-3">Clinic Dashboard</span>
                    )}
                  </NavLink>
                </li>
              </ul>
            </>
          ) : (
            <>
              <ul className="space-y-1 px-3">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || 
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path) && !location.pathname.startsWith('/admin'));

                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={onMobileClose}
                        className={`
                          flex items-center px-3 py-2.5 rounded-lg transition-colors duration-200
                          ${isActive
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }
                          ${collapsed ? 'justify-center' : ''}
                        `}
                        title={collapsed ? item.name : ''}
                      >
                        <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        {!collapsed && (
                          <span className="ml-3">{item.name}</span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
              
              {/* Admin Menu Link - Only for Super Admin when NOT on admin routes */}
              {normalizedRole === 'SUPER_ADMIN' && (
                <>
                  {!collapsed && (
                    <div className="px-3 mt-4 mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Administration
                      </p>
                    </div>
                  )}
                  {collapsed && <div className="border-t border-gray-200 my-2 mx-3"></div>}
                  <ul className="space-y-1 px-3">
                    <li>
                      <NavLink
                        to="/admin"
                        onClick={onMobileClose}
                        className={`
                          flex items-center px-3 py-2.5 rounded-lg transition-colors duration-200
                          text-gray-600 hover:bg-purple-50 hover:text-purple-600
                          ${collapsed ? 'justify-center' : ''}
                        `}
                        title={collapsed ? 'Admin Panel' : ''}
                      >
                        <BuildingOffice2Icon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                        {!collapsed && (
                          <span className="ml-3">Admin Panel</span>
                        )}
                      </NavLink>
                    </li>
                  </ul>
                </>
              )}
            </>
          )}
        </nav>

        {/* Quick stats - only show when not on admin routes */}
        {!collapsed && !isAdminRoute && (
          <div className="p-4 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Today's OPD</p>
              <p className="text-2xl font-bold text-blue-600">{todayOPDCount}</p>
              <p className="text-xs text-gray-500">patients</p>
            </div>
            <div className="mt-3">
              {/* Quick upload invoice link */}
              <a href="/pharmacy/upload" className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700">
                Upload Invoice
              </a>
            </div>
          </div>
        )}

        {/* Collapse toggle button */}
        <div className="hidden lg:block p-4 border-t border-gray-200">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {collapsed ? (
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            ) : (
              <>
                <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                <span className="ml-2 text-sm text-gray-600">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

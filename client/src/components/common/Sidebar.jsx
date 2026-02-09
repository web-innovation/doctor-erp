import { NavLink, useLocation } from 'react-router-dom';
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
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: HomeIcon, roles: ['admin', 'doctor', 'nurse', 'receptionist', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'ACCOUNTANT', 'SUPER_ADMIN'] },
  { name: 'Patients', path: '/patients', icon: UserGroupIcon, roles: ['admin', 'doctor', 'nurse', 'receptionist', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'ACCOUNTANT', 'SUPER_ADMIN'] },
  { name: 'Appointments', path: '/appointments', icon: CalendarDaysIcon, roles: ['admin', 'doctor', 'nurse', 'receptionist', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'ACCOUNTANT', 'SUPER_ADMIN'] },
  { name: 'Prescriptions', path: '/prescriptions', icon: DocumentTextIcon, roles: ['admin', 'doctor', 'DOCTOR', 'SUPER_ADMIN'] },
  { name: 'Pharmacy', path: '/pharmacy', icon: BuildingStorefrontIcon, roles: ['admin', 'pharmacist', 'DOCTOR', 'PHARMACIST', 'SUPER_ADMIN'] },
  { name: 'Billing', path: '/billing', icon: CurrencyDollarIcon, roles: ['admin', 'receptionist', 'accountant', 'DOCTOR', 'RECEPTIONIST', 'ACCOUNTANT', 'SUPER_ADMIN'] },
  { name: 'Staff', path: '/staff', icon: UsersIcon, roles: ['admin', 'DOCTOR', 'SUPER_ADMIN', 'ACCOUNTANT'] },
  { name: 'Attendance', path: '/staff/attendance', icon: ClockIcon, roles: ['admin', 'DOCTOR', 'SUPER_ADMIN', 'ACCOUNTANT'] },
  { name: 'Leave', path: '/staff/leave', icon: CalendarIcon, roles: ['admin', 'DOCTOR', 'SUPER_ADMIN', 'ACCOUNTANT'] },
  { name: 'Reports', path: '/reports', icon: ChartBarIcon, roles: ['admin', 'doctor', 'accountant', 'DOCTOR', 'ACCOUNTANT', 'SUPER_ADMIN'] },
  { name: 'Labs & Agents', path: '/labs-agents', icon: BeakerIcon, roles: ['admin', 'doctor', 'lab_technician', 'DOCTOR', 'SUPER_ADMIN', 'ACCOUNTANT'] },
  { name: 'Settings', path: '/settings', icon: Cog6ToothIcon, roles: ['admin', 'DOCTOR', 'SUPER_ADMIN'] },
];

const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Get user role from AuthContext
  const userRole = user?.role || 'DOCTOR';
  
  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  // Mock stats - replace with real data from API/context
  const todayOPDCount = 24;

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
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
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
              <span className="text-xl font-bold text-gray-800">DocClinic</span>
            </div>
          )}
          
          {collapsed && (
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
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
          <ul className="space-y-1 px-3">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

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
        </nav>

        {/* Quick stats */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Today's OPD</p>
              <p className="text-2xl font-bold text-blue-600">{todayOPDCount}</p>
              <p className="text-xs text-gray-500">patients</p>
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

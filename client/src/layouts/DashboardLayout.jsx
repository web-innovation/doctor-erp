import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import settingsService from '../services/settingsService';

const DashboardLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: accessResp } = useQuery({
    queryKey: ['accessControls'],
    queryFn: () => settingsService.getAccessControls(),
    staleTime: 60 * 1000,
  });
  const accessControls = accessResp?.data?.data || accessResp?.data || accessResp || null;
  const subscriptionSnapshot = accessControls?.subscriptionSnapshot || null;

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Header */}
        <Header onMenuClick={toggleMobileMenu} />

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          {subscriptionSnapshot && (
            <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              subscriptionSnapshot.status === 'EXPIRED'
                ? 'border-red-300 bg-red-50 text-red-700'
                : subscriptionSnapshot.status === 'GRACE'
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : (subscriptionSnapshot.remindersDue || []).length
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'hidden'
            }`}>
              {subscriptionSnapshot.status === 'EXPIRED'
                ? 'Subscription expired. Account is now read-only. Please upgrade plan.'
                : subscriptionSnapshot.status === 'GRACE'
                  ? `Subscription expired. Grace period active (${subscriptionSnapshot.daysToExpiry} days to lock). Upgrade now to avoid read-only mode.`
                  : `Subscription renewal reminder: ${subscriptionSnapshot.daysToExpiry} day(s) left.`}
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Failsafe mobile menu button (always visible on < lg screens) */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed bottom-5 left-4 z-[70] inline-flex items-center gap-2 px-3 py-2 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-[0.98]"
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {mobileMenuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        <span className="text-sm font-medium">Menu</span>
      </button>
    </div>
  );
};

export default DashboardLayout;

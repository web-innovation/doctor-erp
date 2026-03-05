import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBars, FaHospital, FaTimes } from 'react-icons/fa';

export default function PublicSiteHeader({ isHomePage = false }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const featuresHref = isHomePage ? '#features' : '/#features';
  const whyChooseHref = isHomePage ? '#why-choose' : '/#why-choose';
  const reportsHref = isHomePage ? '#reports' : '/#reports';

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2" aria-label="Go to Docsy ERP home">
            <FaHospital className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Docsy ERP</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <a href={featuresHref} className="text-gray-600 hover:text-blue-600 transition">Features</a>
            <a href={whyChooseHref} className="text-gray-600 hover:text-blue-600 transition">Why Choose Us</a>
            <Link to="/pricing" className="text-gray-600 hover:text-blue-600 transition">Pricing</Link>
            <a href={reportsHref} className="text-gray-600 hover:text-blue-600 transition">Reports</a>
            <Link to="/help-center" className="text-gray-600 hover:text-blue-600 transition">Help Center</Link>
            <Link to="/blogs" className="text-gray-600 hover:text-blue-600 transition">Blogs</Link>
            <Link to="/login" className="text-gray-600 hover:text-blue-600 transition">Login</Link>
          </div>

          <button
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-700"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileNavOpen((prev) => !prev)}
          >
            {mobileNavOpen ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden pb-3 border-t border-gray-100">
            <div className="flex flex-col pt-2">
              <a
                href={featuresHref}
                onClick={() => setMobileNavOpen(false)}
                className="px-2 py-2 text-gray-700 hover:text-blue-600"
              >
                Features
              </a>
              <a
                href={whyChooseHref}
                onClick={() => setMobileNavOpen(false)}
                className="px-2 py-2 text-gray-700 hover:text-blue-600"
              >
                Why Choose Us
              </a>
              <a
                href={reportsHref}
                onClick={() => setMobileNavOpen(false)}
                className="px-2 py-2 text-gray-700 hover:text-blue-600"
              >
                Reports
              </a>
              <Link
                to="/pricing"
                onClick={() => setMobileNavOpen(false)}
                className="px-2 py-2 text-gray-700 hover:text-blue-600"
              >
                Pricing
              </Link>
              <Link
                to="/help-center"
                onClick={() => setMobileNavOpen(false)}
                className="px-2 py-2 text-gray-700 hover:text-blue-600"
              >
                Help Center
              </Link>
              <Link
                to="/blogs"
                onClick={() => setMobileNavOpen(false)}
                className="px-2 py-2 text-gray-700 hover:text-blue-600"
              >
                Blogs
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileNavOpen(false)}
                className="px-2 py-2 text-gray-700 hover:text-blue-600"
              >
                Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

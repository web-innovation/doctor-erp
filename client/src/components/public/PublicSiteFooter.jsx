import { Link } from 'react-router-dom';
import { FaFacebookF, FaHospital, FaYoutube } from 'react-icons/fa';

export default function PublicSiteFooter({ isHomePage = false }) {
  const featuresHref = isHomePage ? '#features' : '/#features';
  const reportsHref = isHomePage ? '#reports' : '/#reports';

  return (
    <footer className="bg-gray-900 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <FaHospital className="h-8 w-8 text-blue-500" />
              <span className="text-xl font-bold text-white">Docsy ERP</span>
            </div>
            <p className="text-gray-400 mb-4">
              Smart healthcare management for modern clinics across India.
            </p>
            <div className="text-gray-400 space-y-1 text-sm">
              <p>support@docsyerp.com</p>
              <p>docsy360@gmail.com</p>
              <p>8284073790, 9306845764</p>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="https://www.facebook.com/profile.php?id=61587785650391"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition"
                aria-label="Facebook Page"
                title="Facebook Page"
              >
                <FaFacebookF className="h-5 w-5" />
              </a>
              <a
                href="https://www.youtube.com/channel/UCC_jW5UEsW0xaasPXVtkfgw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition"
                aria-label="YouTube Channel"
                title="YouTube Channel"
              >
                <FaYoutube className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href={featuresHref} className="text-gray-400 hover:text-white transition">Features</a></li>
              <li><Link to="/features/patient-management-system-for-clinics" className="text-gray-400 hover:text-white transition">Patient Management</Link></li>
              <li><Link to="/features/pharmacy-management-software-tricity" className="text-gray-400 hover:text-white transition">Pharmacy Software</Link></li>
              <li><Link to="/features/smart-prescription-software-for-doctors" className="text-gray-400 hover:text-white transition">Smart Prescription</Link></li>
              <li><Link to="/pricing" className="text-gray-400 hover:text-white transition">Pricing</Link></li>
              <li><Link to="/blogs" className="text-gray-400 hover:text-white transition">Blogs</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/features/patient-management-system-for-clinics" className="text-gray-400 hover:text-white transition">Patient Management</Link></li>
              <li><Link to="/features/pharmacy-management-software-tricity" className="text-gray-400 hover:text-white transition">Pharmacy Software</Link></li>
              <li><Link to="/pricing" className="text-gray-400 hover:text-white transition">Pricing</Link></li>
              <li><Link to="/blogs" className="text-gray-400 hover:text-white transition">Blogs</Link></li>
              <li><Link to="/login" className="text-gray-400 hover:text-white transition">Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="text-gray-400 hover:text-white transition">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-white transition">Terms of Service</Link></li>
              <li><a href={featuresHref} className="text-gray-400 hover:text-white transition">Features</a></li>
              <li><a href={reportsHref} className="text-gray-400 hover:text-white transition">Reports</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-400">
            (c) {new Date().getFullYear()} Docsy ERP. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

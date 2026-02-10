/**
 * HIPAA Compliance - Session Timeout Warning Modal
 * 
 * Warns users before automatic logoff per HIPAA requirements.
 */

import { useSessionTimeout } from '../../hooks/useSessionTimeout';
import Modal from './Modal';
import Button from './Button';
import { FiClock, FiLogOut } from 'react-icons/fi';

const SessionTimeoutWarning = () => {
  const { showWarning, formatTimeRemaining, extendSession, logout } = useSessionTimeout({
    onWarning: () => {
      // Optional: Play a sound or show notification
      console.log('Session expiring soon');
    },
    onTimeout: () => {
      console.log('Session expired');
    }
  });

  if (!showWarning) return null;

  return (
    <Modal
      isOpen={showWarning}
      onClose={extendSession}
      title="Session Expiring"
    >
      <div className="text-center py-4">
        <FiClock className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        
        <p className="text-gray-600 mb-2">
          Your session will expire in
        </p>
        
        <p className="text-3xl font-bold text-red-600 mb-4">
          {formatTimeRemaining()}
        </p>
        
        <p className="text-sm text-gray-500 mb-6">
          For your security, you will be automatically logged out due to inactivity.
          This is required for HIPAA compliance.
        </p>
        
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={logout}
          >
            <FiLogOut className="mr-2" />
            Log Out Now
          </Button>
          
          <Button
            variant="primary"
            onClick={extendSession}
          >
            Stay Logged In
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SessionTimeoutWarning;

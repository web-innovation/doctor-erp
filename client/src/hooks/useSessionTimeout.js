/**
 * HIPAA Compliance - Session Timeout Hook
 * 
 * Monitors user activity and warns before session expires.
 * Implements automatic logoff per HIPAA §164.312(a)(2)(iii)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// Default timeout values (in milliseconds)
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click'
];

export function useSessionTimeout(options = {}) {
  const {
    timeout = SESSION_TIMEOUT,
    warningTime = WARNING_TIME,
    onWarning = () => {},
    onTimeout = () => {}
  } = options;

  const { logout, user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeout);
  
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Reset timers on activity
  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      onWarning();
      
      // Start countdown
      let remaining = warningTime;
      setTimeRemaining(remaining);
      
      countdownRef.current = setInterval(() => {
        remaining -= 1000;
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          clearInterval(countdownRef.current);
        }
      }, 1000);
    }, timeout - warningTime);

    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      onTimeout();
      handleSessionTimeout();
    }, timeout);
  }, [timeout, warningTime, onWarning, onTimeout]);

  // Handle session timeout
  const handleSessionTimeout = useCallback(() => {
    // Clear all timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    // Log out user
    logout();
    
    // Show timeout message
    alert('Your session has expired due to inactivity. Please log in again.');
  }, [logout]);

  // Extend session (called when user clicks "Stay Logged In")
  const extendSession = useCallback(() => {
    resetTimers();
    setShowWarning(false);
  }, [resetTimers]);

  // Set up activity listeners
  useEffect(() => {
    // Only track if user is logged in
    if (!user) return;

    const handleActivity = () => {
      // Only reset if not showing warning (to prevent accidental dismissal)
      if (!showWarning) {
        resetTimers();
      }
    };

    // Add event listeners
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer setup
    resetTimers();

    // Cleanup
    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [user, showWarning, resetTimers]);

  // Format time remaining
  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    showWarning,
    timeRemaining,
    formatTimeRemaining,
    extendSession,
    logout: handleSessionTimeout
  };
}

export default useSessionTimeout;

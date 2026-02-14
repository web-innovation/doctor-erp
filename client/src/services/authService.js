import api from './api';

const authService = {
  /**
   * Login user with email and password
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise} - Response with user data and token
   */
  login: async ({ email, password }) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Register new user
   * @param {Object} data - Registration data
   * @param {string} data.name - User name
   * @param {string} data.email - User email
   * @param {string} data.password - User password
   * @param {string} data.role - User role
   * @returns {Promise} - Response with user data and token
   */
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  /**
   * Logout current user
   * @returns {Promise} - Logout response
   */
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  /**
   * Get current user profile
   * @returns {Promise} - User profile data
   */
  getProfile: async () => {
    // Server exposes current user at /auth/me
    const response = await api.get('/auth/me');
    // Normalize to { data: user } shape so callers expecting response.data === user work
    return { data: response.data.user };
  },

  /**
   * Update user profile
   * @param {Object} data - Profile data to update
   * @param {string} [data.name] - User name
   * @param {string} [data.email] - User email
   * @param {string} [data.phone] - User phone
   * @param {Object} [data.preferences] - User preferences
   * @returns {Promise} - Updated user data
   */
  updateProfile: async (data) => {
    // Server expects PATCH for profile updates
    const response = await api.patch('/auth/profile', data);
    // Normalize to { data: user }
    return { data: response.data.user };
  },

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise} - Success response
   */
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
  
  impersonate: async (targetUserId) => {
    const response = await api.post('/auth/impersonate', { targetUserId });
    return response.data;
  },

  stopImpersonation: async () => {
    // client-side only: remove impersonation token
    return { success: true };
  },
};

export { authService };
export default authService;

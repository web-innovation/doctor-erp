import api from './api';

const blogService = {
  getRecent: async (limit = 3) => {
    const response = await api.get('/blogs/recent', { params: { limit } });
    return response.data;
  },

  getPublicList: async ({ page = 1, limit = 9, search = '' } = {}) => {
    const response = await api.get('/blogs/public', { params: { page, limit, search } });
    return response.data;
  },

  getPublicBySlug: async (slug) => {
    const response = await api.get(`/blogs/public/${slug}`);
    return response.data;
  },

  getManagePosts: async ({ page = 1, limit = 20 } = {}) => {
    const response = await api.get('/blogs/manage/posts', { params: { page, limit } });
    return response.data;
  },

  createPost: async (payload) => {
    const response = await api.post('/blogs/manage/posts', payload);
    return response.data;
  },

  updatePublishStatus: async (id, isPublished) => {
    const response = await api.patch(`/blogs/manage/posts/${id}`, { isPublished });
    return response.data;
  },

  deletePost: async (id) => {
    const response = await api.delete(`/blogs/manage/posts/${id}`);
    return response.data;
  },
};

export default blogService;

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import blogService from '../../services/blogService';

export default function ManageBlogs() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    coverImage: '',
    content: '',
    isPublished: true,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['blogs-manage-list'],
    queryFn: () => blogService.getManagePosts({ page: 1, limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: blogService.createPost,
    onSuccess: () => {
      toast.success('Blog posted');
      setForm({ title: '', excerpt: '', coverImage: '', content: '', isPublished: true });
      queryClient.invalidateQueries({ queryKey: ['blogs-manage-list'] });
      queryClient.invalidateQueries({ queryKey: ['blogs-public'] });
      queryClient.invalidateQueries({ queryKey: ['blogs-recent'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create blog');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isPublished }) => blogService.updatePublishStatus(id, isPublished),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs-manage-list'] });
      queryClient.invalidateQueries({ queryKey: ['blogs-public'] });
      queryClient.invalidateQueries({ queryKey: ['blogs-recent'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update blog status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: blogService.deletePost,
    onSuccess: () => {
      toast.success('Blog deleted');
      queryClient.invalidateQueries({ queryKey: ['blogs-manage-list'] });
      queryClient.invalidateQueries({ queryKey: ['blogs-public'] });
      queryClient.invalidateQueries({ queryKey: ['blogs-recent'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to delete blog');
    },
  });

  const posts = data?.data || [];
  const permissionError = isError && (error?.response?.status === 403);

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h1 className="text-xl font-semibold text-gray-900">Publish Blog</h1>
        <p className="text-sm text-gray-500 mt-1">Super Admin and clinic admins/doctors can post blogs.</p>
        {permissionError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            You do not have permission to manage blogs.
          </div>
        )}
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={permissionError}
              required
            />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
              <input
                value={form.coverImage}
              onChange={(e) => setForm((s) => ({ ...s, coverImage: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="https://..."
              disabled={permissionError}
            />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm((s) => ({ ...s, excerpt: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={permissionError}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={permissionError}
              required
            />
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((s) => ({ ...s, isPublished: e.target.checked }))}
              disabled={permissionError}
            />
            <span className="text-sm text-gray-700">Publish immediately</span>
          </label>
          <div>
            <button
              type="submit"
              disabled={createMutation.isPending || permissionError}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Posting...' : 'Post Blog'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Blog Posts</h2>
        {isLoading ? (
          <p className="text-gray-600">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="text-gray-600">No blog posts yet.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="border border-gray-100 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{post.title}</p>
                  <p className="text-sm text-gray-500">
                    {post.isPublished ? 'Published' : 'Draft'} · {new Date(post.createdAt).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleMutation.mutate({ id: post.id, isPublished: !post.isPublished })}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {post.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(post.id)}
                    className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

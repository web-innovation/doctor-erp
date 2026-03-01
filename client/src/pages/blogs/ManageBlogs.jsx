import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import blogService from '../../services/blogService';

const CATEGORY_OPTIONS = [
  'Clinic Growth',
  'Patient Experience',
  'Practice Management',
  'Billing & Finance',
  'Pharmacy Operations',
  'Digital Health',
  'Product Updates',
];

function estimateReadingMinutes(content) {
  const words = String(content || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export default function ManageBlogs() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    slug: '',
    category: 'Practice Management',
    excerpt: '',
    coverImage: '',
    coverImageAlt: '',
    content: '',
    metaTitle: '',
    metaDescription: '',
    focusKeywords: '',
    canonicalUrl: '',
    readingMinutes: '',
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
      setForm({
        title: '',
        slug: '',
        category: 'Practice Management',
        excerpt: '',
        coverImage: '',
        coverImageAlt: '',
        content: '',
        metaTitle: '',
        metaDescription: '',
        focusKeywords: '',
        canonicalUrl: '',
        readingMinutes: '',
        isPublished: true,
      });
      queryClient.invalidateQueries({ queryKey: ['blogs-manage-list'] });
      queryClient.invalidateQueries({ queryKey: ['blogs-public'] });
      queryClient.invalidateQueries({ queryKey: ['blogs-recent'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create blog');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isPublished }) => blogService.updatePublishStatus(id, isPublished),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs-manage-list'] });
      queryClient.invalidateQueries({ queryKey: ['blogs-public'] });
      queryClient.invalidateQueries({ queryKey: ['blogs-recent'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update blog status');
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
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete blog');
    },
  });

  const posts = data?.data || [];
  const permissionError = isError && (error?.response?.status === 403);

  const metaTitleLength = form.metaTitle.trim().length;
  const metaDescriptionLength = form.metaDescription.trim().length;
  const effectiveExcerpt = form.excerpt.trim() || form.content.trim().slice(0, 200);
  const effectiveReadingMinutes = form.readingMinutes || estimateReadingMinutes(form.content);

  const seoChecks = useMemo(() => {
    return {
      titleOk: form.title.trim().length >= 20 && form.title.trim().length <= 65,
      excerptOk: effectiveExcerpt.length >= 110 && effectiveExcerpt.length <= 180,
      metaTitleOk: metaTitleLength > 0 && metaTitleLength <= 70,
      metaDescriptionOk: metaDescriptionLength > 0 && metaDescriptionLength <= 170,
      keywordOk: form.focusKeywords.trim().split(',').map((k) => k.trim()).filter(Boolean).length >= 2,
      imageAltOk: form.coverImage ? form.coverImageAlt.trim().length > 0 : true,
    };
  }, [form, effectiveExcerpt.length, metaDescriptionLength, metaTitleLength]);

  const seoScore = Object.values(seoChecks).filter(Boolean).length;

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      readingMinutes: form.readingMinutes ? Number(form.readingMinutes) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900">Professional Blog Publisher</h1>
        <p className="text-sm text-gray-500 mt-1">
          SEO-ready publishing for Admin and Super Admin. Compete with top healthcare platforms using structured content.
        </p>
        {permissionError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            You do not have permission to manage blogs.
          </div>
        )}

        <div className="mt-5 grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ex: How Indian Clinics Can Reduce Patient Wait Time by 40%"
                    disabled={permissionError}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Slug (optional)</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="clinic-wait-time-reduction-strategy"
                    disabled={permissionError}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={permissionError}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reading Minutes</label>
                  <input
                    type="number"
                    min="1"
                    value={form.readingMinutes}
                    onChange={(e) => setForm((s) => ({ ...s, readingMinutes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={`Auto: ${estimateReadingMinutes(form.content)} min`}
                    disabled={permissionError}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image ALT text</label>
                  <input
                    value={form.coverImageAlt}
                    onChange={(e) => setForm((s) => ({ ...s, coverImageAlt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Doctor consulting patient in OPD"
                    disabled={permissionError}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excerpt ({effectiveExcerpt.length} chars)
                </label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm((s) => ({ ...s, excerpt: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="2-3 lines summary used in blog cards and search snippets"
                  disabled={permissionError}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Write original, actionable, high-quality content..."
                  disabled={permissionError}
                  required
                />
              </div>

              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <h2 className="font-semibold text-gray-900">SEO Settings</h2>
                <p className="text-xs text-gray-500 mt-1">These fields directly impact search ranking and CTR.</p>
                <div className="grid md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Title ({metaTitleLength}/70)
                    </label>
                    <input
                      value={form.metaTitle}
                      onChange={(e) => setForm((s) => ({ ...s, metaTitle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="SEO title shown in search result"
                      disabled={permissionError}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Focus Keywords</label>
                    <input
                      value={form.focusKeywords}
                      onChange={(e) => setForm((s) => ({ ...s, focusKeywords: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="clinic management software, opd workflow, patient engagement"
                      disabled={permissionError}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Description ({metaDescriptionLength}/170)
                    </label>
                    <textarea
                      value={form.metaDescription}
                      onChange={(e) => setForm((s) => ({ ...s, metaDescription: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="SEO description for search snippet"
                      disabled={permissionError}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Canonical URL (optional)</label>
                    <input
                      value={form.canonicalUrl}
                      onChange={(e) => setForm((s) => ({ ...s, canonicalUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://docsyerp.in/blogs/your-blog-slug"
                      disabled={permissionError}
                    />
                  </div>
                </div>
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
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Posting...' : 'Post SEO Blog'}
                </button>
              </div>
            </form>
          </div>

          <aside className="space-y-4">
            <div className="bg-slate-900 text-white rounded-xl p-4">
              <p className="text-xs uppercase tracking-wide text-slate-300">SEO Readiness</p>
              <p className="text-3xl font-bold mt-1">{seoScore}/6</p>
              <p className="text-xs text-slate-300 mt-2">Target 6/6 before publishing for best outcomes.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-gray-900">Checklist</p>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>{seoChecks.titleOk ? 'OK' : 'Fix'}: Title length 20-65</li>
                <li>{seoChecks.excerptOk ? 'OK' : 'Fix'}: Excerpt 110-180</li>
                <li>{seoChecks.metaTitleOk ? 'OK' : 'Fix'}: Meta title set</li>
                <li>{seoChecks.metaDescriptionOk ? 'OK' : 'Fix'}: Meta description set</li>
                <li>{seoChecks.keywordOk ? 'OK' : 'Fix'}: 2+ focus keywords</li>
                <li>{seoChecks.imageAltOk ? 'OK' : 'Fix'}: Cover image alt text</li>
              </ul>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-gray-900">Search Preview</p>
              <p className="text-sm text-blue-700 mt-2 line-clamp-2">{form.metaTitle || form.title || 'Your blog title'}</p>
              <p className="text-xs text-green-700 mt-1">
                {form.canonicalUrl || `https://docsyerp.in/blogs/${(form.slug || form.title || 'blog-post').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')}`}
              </p>
              <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                {form.metaDescription || effectiveExcerpt || 'Meta description preview appears here.'}
              </p>
              <p className="text-xs text-gray-500 mt-2">Estimated read time: {effectiveReadingMinutes} min</p>
            </div>
          </aside>
        </div>
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
                    {post.category || 'General'} | {post.isPublished ? 'Published' : 'Draft'} | {new Date(post.createdAt).toLocaleDateString('en-GB')}
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

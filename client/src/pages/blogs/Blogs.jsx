import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import blogService from '../../services/blogService';
import SEO from '../../components/seo/SEO';

export default function Blogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['blogs-public', page, search],
    queryFn: () => blogService.getPublicList({ page, limit: 9, search }),
  });

  const posts = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Clinic & Healthcare Blog | Docsy ERP"
        description="Latest clinic management tips, healthcare workflow ideas, and product updates from Docsy ERP."
        path="/blogs"
      />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
            <p className="text-gray-600 mt-1">Recent insights from Docsy ERP and partner clinics</p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search blogs..."
            className="w-full md:w-80 px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {isLoading ? (
          <div className="text-gray-600">Loading blogs...</div>
        ) : posts.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-8 text-gray-600">No blogs found.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <article key={post.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                {post.coverImage && (
                  <img src={post.coverImage} alt={post.title} className="w-full h-44 object-cover" />
                )}
                <div className="p-4">
                  <h2 className="font-semibold text-lg text-gray-900 line-clamp-2">{post.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {post.clinic?.name || 'Docsy ERP'} · {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-GB')}
                  </p>
                  <p className="text-gray-600 text-sm mt-3 line-clamp-3">{post.excerpt || ''}</p>
                  <Link
                    to={`/blogs/${post.slug}`}
                    className="inline-flex mt-4 text-blue-600 font-medium hover:text-blue-700"
                  >
                    Read more
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages || 1, p + 1))}
            disabled={page >= (pagination.totalPages || 1)}
            className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

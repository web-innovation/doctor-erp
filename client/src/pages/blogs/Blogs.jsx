import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaSearch, FaRegClock, FaArrowRight } from 'react-icons/fa';
import blogService from '../../services/blogService';
import SEO from '../../components/seo/SEO';

const BLOG_KEYWORDS = [
  'clinic management blog',
  'healthcare operations blog',
  'patient management insights',
  'clinic growth strategies',
];

export default function Blogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['blogs-public', page, search],
    queryFn: () => blogService.getPublicList({ page, limit: 9, search }),
  });

  const posts = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };
  const featuredPost = useMemo(() => (posts.length ? posts[0] : null), [posts]);
  const gridPosts = useMemo(() => (posts.length > 1 ? posts.slice(1) : posts), [posts]);

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO
        title="Healthcare & Clinic Management Blog | Docsy ERP"
        description="Expert blog on clinic growth, patient experience, billing workflows, and digital healthcare operations."
        keywords={BLOG_KEYWORDS}
        path="/blogs"
        schema={[
          {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'Docsy ERP Blog',
            description: 'Insights on clinic growth, patient workflows, and healthcare operations.',
            url: 'https://docsyerp.in/blogs',
          },
        ]}
      />

      <section className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <p className="text-blue-200 uppercase text-sm tracking-wider font-semibold">Docsy ERP Insights</p>
          <h1 className="text-3xl md:text-5xl font-bold mt-2">Clinic Growth, Operations, and Digital Healthcare Playbooks</h1>
          <p className="text-blue-100 mt-4 max-w-3xl">
            High-quality content for doctors, clinic admins, and healthcare teams who want better systems and better outcomes.
          </p>
          <div className="mt-8 max-w-xl relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search topics: patient wait time, billing leakages, OPD growth..."
              className="w-full rounded-xl pl-12 pr-4 py-3 text-gray-900 border border-white/30"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isLoading ? (
          <div className="text-gray-600">Loading blogs...</div>
        ) : posts.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-8 text-gray-600">No blogs found.</div>
        ) : (
          <>
            {featuredPost && (
              <article className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-8">
                <div className="grid lg:grid-cols-2">
                  <div className="h-72 lg:h-full bg-gray-100">
                    {featuredPost.coverImage ? (
                      <img
                        src={featuredPost.coverImage}
                        alt={featuredPost.coverImageAlt || featuredPost.title}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-6 md:p-8">
                    <span className="inline-flex text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {featuredPost.category || 'Healthcare Insights'}
                    </span>
                    <h2 className="mt-3 text-2xl md:text-3xl font-bold text-gray-900">{featuredPost.title}</h2>
                    <p className="text-sm text-gray-500 mt-2">
                      {featuredPost.clinic?.name || 'Docsy ERP'} | {new Date(featuredPost.publishedAt || featuredPost.createdAt).toLocaleDateString('en-GB')} | <FaRegClock className="inline mb-0.5" /> {featuredPost.readingMinutes || 1} min read
                    </p>
                    <p className="text-gray-700 mt-4 line-clamp-4">{featuredPost.excerpt || ''}</p>
                    <Link
                      to={`/blogs/${featuredPost.slug}`}
                      className="inline-flex items-center gap-2 mt-6 text-blue-700 font-semibold hover:text-blue-800"
                    >
                      Read Featured Story
                      <FaArrowRight />
                    </Link>
                  </div>
                </div>
              </article>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {gridPosts.map((post) => (
                <article key={post.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {post.coverImage && (
                    <img src={post.coverImage} alt={post.coverImageAlt || post.title} className="w-full h-44 object-cover" />
                  )}
                  <div className="p-4">
                    <span className="inline-flex text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {post.category || 'General'}
                    </span>
                    <h2 className="font-semibold text-lg text-gray-900 line-clamp-2 mt-2">{post.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-GB')} | <FaRegClock className="inline mb-0.5" /> {post.readingMinutes || 1} min
                    </p>
                    <p className="text-gray-600 text-sm mt-3 line-clamp-3">{post.excerpt || ''}</p>
                    <Link
                      to={`/blogs/${post.slug}`}
                      className="inline-flex items-center gap-2 mt-4 text-blue-600 font-medium hover:text-blue-700"
                    >
                      Read article
                      <FaArrowRight />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
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

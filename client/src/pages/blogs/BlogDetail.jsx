import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import blogService from '../../services/blogService';
import SEO from '../../components/seo/SEO';

export default function BlogDetail() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog-public-detail', slug],
    queryFn: () => blogService.getPublicBySlug(slug),
    enabled: !!slug,
  });

  const post = data?.data;

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 p-8 text-gray-600">Loading blog...</div>;
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-100 p-8">
          <p className="text-red-600">Blog not found.</p>
          <Link to="/blogs" className="inline-block mt-4 text-blue-600 hover:text-blue-700">Back to blogs</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={`${post.title} | Docsy ERP Blog`}
        description={post.excerpt || 'Healthcare and clinic management blog.'}
        path={`/blogs/${post.slug}`}
      />
      <article className="max-w-4xl mx-auto px-4 py-10">
        <Link to="/blogs" className="text-blue-600 hover:text-blue-700 text-sm">← Back to blogs</Link>
        <div className="mt-4 bg-white rounded-xl border border-gray-100 overflow-hidden">
          {post.coverImage && (
            <img src={post.coverImage} alt={post.title} className="w-full h-64 object-cover" />
          )}
          <div className="p-6 md:p-8">
            <h1 className="text-3xl font-bold text-gray-900">{post.title}</h1>
            <p className="text-sm text-gray-500 mt-2">
              {post.author?.name || 'Docsy ERP'} · {post.clinic?.name || 'Docsy ERP'} · {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-GB')}
            </p>
            {post.excerpt && <p className="mt-4 text-gray-700">{post.excerpt}</p>}
            <div className="mt-6 text-gray-800 whitespace-pre-wrap leading-7">{post.content}</div>
          </div>
        </div>
      </article>
    </div>
  );
}

import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaRegClock } from 'react-icons/fa';
import blogService from '../../services/blogService';
import SEO from '../../components/seo/SEO';

function buildArticleSchema(post) {
  if (!post) return null;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://docsyerp.in';
  const articleUrl = post.canonicalUrl || `${origin}/blogs/${post.slug}`;
  const imageUrl = post.coverImage
    ? (post.coverImage.startsWith('http') ? post.coverImage : `${origin}${post.coverImage}`)
    : undefined;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || '',
      image: imageUrl ? [imageUrl] : undefined,
      author: {
        '@type': 'Person',
        name: post.author?.name || 'Docsy ERP',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Docsy ERP',
        logo: {
          '@type': 'ImageObject',
          url: `${origin}/favicon.ico`,
        },
      },
      datePublished: post.publishedAt || post.createdAt,
      dateModified: post.updatedAt || post.createdAt,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': articleUrl,
      },
      articleSection: post.category || 'Healthcare',
      keywords: post.focusKeywords || undefined,
    },
  ];
}

export default function BlogDetail() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog-public-detail', slug],
    queryFn: () => blogService.getPublicBySlug(slug),
    enabled: !!slug,
  });

  const post = data?.data;

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 p-8 text-gray-600">Loading blog...</div>;
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-100 p-8">
          <p className="text-red-600">Blog not found.</p>
          <Link to="/blogs" className="inline-block mt-4 text-blue-600 hover:text-blue-700">Back to blogs</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO
        title={`${post.metaTitle || post.title} | Docsy ERP Blog`}
        description={post.metaDescription || post.excerpt || 'Healthcare and clinic management blog.'}
        keywords={post.focusKeywords || undefined}
        path={`/blogs/${post.slug}`}
        image={post.coverImage || undefined}
        canonicalUrl={post.canonicalUrl || undefined}
        ogType="article"
        schema={buildArticleSchema(post)}
      />

      <article className="max-w-5xl mx-auto px-4 py-10">
        <Link to="/blogs" className="text-blue-600 hover:text-blue-700 text-sm">Back to blogs</Link>
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {post.coverImage && (
            <img
              src={post.coverImage}
              alt={post.coverImageAlt || post.title}
              className="w-full h-72 md:h-96 object-cover"
            />
          )}
          <div className="p-6 md:p-10">
            <span className="inline-flex text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              {post.category || 'Healthcare Insights'}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">{post.title}</h1>
            <p className="text-sm text-gray-500 mt-3">
              {post.author?.name || 'Docsy ERP'} | {post.clinic?.name || 'Docsy ERP'} | {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-GB')} | <FaRegClock className="inline mb-0.5" /> {post.readingMinutes || 1} min read
            </p>

            {post.excerpt && (
              <p className="mt-6 text-lg text-gray-700 border-l-4 border-blue-500 pl-4">{post.excerpt}</p>
            )}

            <div className="mt-8 text-gray-800 whitespace-pre-wrap leading-8">{post.content}</div>
          </div>
        </div>
      </article>
    </div>
  );
}

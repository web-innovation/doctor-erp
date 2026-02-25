import { useEffect } from 'react';

function upsertMeta(attr, key, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertCanonical(url) {
  if (!url) return;
  let tag = document.head.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', url);
}

export default function SEO({ title, description, keywords = null, path = '/', schema = null, image = null }) {
  useEffect(() => {
    if (title) document.title = title;
    upsertMeta('name', 'description', description);
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      upsertMeta('name', 'keywords', keywords.join(', '));
    } else if (keywords && typeof keywords === 'string') {
      upsertMeta('name', 'keywords', keywords);
    }
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'Docsy ERP');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);

    const origin = window.location.origin || 'https://docsyerp.in';
    const canonical = `${origin}${path}`;
    upsertMeta('property', 'og:url', canonical);
    upsertCanonical(canonical);

    if (image) {
      const fullImage = image.startsWith('http') ? image : `${origin}${image}`;
      upsertMeta('property', 'og:image', fullImage);
      upsertMeta('name', 'twitter:image', fullImage);
    }

    const schemaId = 'docsy-seo-schema';
    const existing = document.getElementById(schemaId);
    if (existing) existing.remove();
    if (schema) {
      const script = document.createElement('script');
      script.id = schemaId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }

    return () => {
      const el = document.getElementById(schemaId);
      if (el) el.remove();
    };
  }, [title, description, keywords, path, schema, image]);

  return null;
}

import express from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function canManageBlogs(req) {
  const role = (req.user?.role || '').toUpperCase();
  if (role === 'SUPER_ADMIN') return true;
  if (req.user?.isClinicAdmin) return true;
  if (req.user?.clinicId && (role === 'ADMIN' || role === 'DOCTOR')) return true;
  return false;
}

async function generateUniqueSlug(title) {
  const base = slugify(title) || 'blog-post';
  let slug = base;
  let suffix = 1;
  while (true) {
    const exists = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

function serializeBlog(post) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: post.coverImage,
    isPublished: post.isPublished,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author ? { id: post.author.id, name: post.author.name } : null,
    clinic: post.clinic ? { id: post.clinic.id, name: post.clinic.name } : null,
  };
}

// Public: recent posts for landing page
router.get('/recent', async (req, res, next) => {
  try {
    const take = Math.min(Math.max(parseInt(req.query.limit || '3', 10), 1), 12);
    const rows = await prisma.blogPost.findMany({
      where: { isPublished: true, publishedAt: { not: null, lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
      take,
      include: {
        author: { select: { id: true, name: true } },
        clinic: { select: { id: true, name: true } },
      },
    });
    return res.json({ success: true, data: rows.map(serializeBlog) });
  } catch (error) {
    return next(error);
  }
});

// Public: paginated list
router.get('/public', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '9', 10), 1), 30);
    const search = String(req.query.search || '').trim();
    const skip = (page - 1) * limit;

    const where = {
      isPublished: true,
      publishedAt: { not: null, lte: new Date() },
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, name: true } },
          clinic: { select: { id: true, name: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return res.json({
      success: true,
      data: rows.map(serializeBlog),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return next(error);
  }
});

// Public: detail by slug
router.get('/public/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').trim();
    const post = await prisma.blogPost.findFirst({
      where: { slug, isPublished: true, publishedAt: { not: null, lte: new Date() } },
      include: {
        author: { select: { id: true, name: true } },
        clinic: { select: { id: true, name: true } },
      },
    });
    if (!post) return res.status(404).json({ success: false, message: 'Blog not found' });
    return res.json({ success: true, data: serializeBlog(post) });
  } catch (error) {
    return next(error);
  }
});

router.use(authenticate);

// Manage: list posts user can manage
router.get('/manage/posts', async (req, res, next) => {
  try {
    if (!canManageBlogs(req)) return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
    const skip = (page - 1) * limit;

    const where = req.user.role === 'SUPER_ADMIN' ? {} : { clinicId: req.user.clinicId };

    const [rows, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, name: true } },
          clinic: { select: { id: true, name: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return res.json({
      success: true,
      data: rows.map(serializeBlog),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return next(error);
  }
});

// Manage: create post
router.post('/manage/posts', async (req, res, next) => {
  try {
    if (!canManageBlogs(req)) return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    const excerptInput = String(req.body?.excerpt || '').trim();
    const coverImage = req.body?.coverImage ? String(req.body.coverImage).trim() : null;
    const isPublished = !!req.body?.isPublished;

    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!content) return res.status(400).json({ success: false, message: 'Content is required' });

    const slug = await generateUniqueSlug(title);
    const excerpt = excerptInput || content.slice(0, 200);
    const publishedAt = isPublished ? new Date() : null;
    const clinicId = req.user.role === 'SUPER_ADMIN' ? (req.body?.clinicId || null) : req.user.clinicId;

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        coverImage,
        isPublished,
        publishedAt,
        authorId: req.user.id,
        clinicId,
      },
      include: {
        author: { select: { id: true, name: true } },
        clinic: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({ success: true, data: serializeBlog(post) });
  } catch (error) {
    return next(error);
  }
});

// Manage: update publish status only
router.patch('/manage/posts/:id', async (req, res, next) => {
  try {
    if (!canManageBlogs(req)) return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    const id = String(req.params.id || '').trim();
    const isPublished = !!req.body?.isPublished;
    const where = req.user.role === 'SUPER_ADMIN' ? { id } : { id, clinicId: req.user.clinicId };
    const existing = await prisma.blogPost.findFirst({ where, select: { id: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Blog not found' });

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
      include: {
        author: { select: { id: true, name: true } },
        clinic: { select: { id: true, name: true } },
      },
    });

    return res.json({ success: true, data: serializeBlog(post) });
  } catch (error) {
    return next(error);
  }
});

// Manage: delete post
router.delete('/manage/posts/:id', async (req, res, next) => {
  try {
    if (!canManageBlogs(req)) return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    const id = String(req.params.id || '').trim();
    const where = req.user.role === 'SUPER_ADMIN' ? { id } : { id, clinicId: req.user.clinicId };
    const existing = await prisma.blogPost.findFirst({ where, select: { id: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Blog not found' });

    await prisma.blogPost.delete({ where: { id } });
    return res.json({ success: true, message: 'Blog deleted' });
  } catch (error) {
    return next(error);
  }
});

export default router;

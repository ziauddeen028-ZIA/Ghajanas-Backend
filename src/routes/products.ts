import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { Prisma } from '@prisma/client';

const router = Router();

// Helper to generate URL-friendly slug
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Helper to format a database product into the frontend Product interface
const formatProduct = (p: any) => {
  const variants = (p.variants || []).map((v: any) => ({
    id: v.id,
    label: v.label,
    price: Number(v.price),
    originalPrice: v.originalPrice !== null && v.originalPrice !== undefined ? Number(v.originalPrice) : undefined,
    inStock: v.inStock,
    stockCount: v.stock,
    isActive: v.isActive,
  }));

  return {
    id: p.id,
    name: p.name,
    tamilName: p.tamilName || undefined,
    slug: p.slug,
    categoryId: p.categoryId,
    categoryName: p.category?.name || '',
    shortDescription: p.shortDescription || '',
    description: p.description || '',
    benefits: Array.isArray(p.benefits) ? p.benefits : [],
    origin: p.origin || 'Tamil Nadu',
    rating: Number(p.rating || 5.0),
    reviewCount: p.reviewCount || 0,
    images: Array.isArray(p.images) ? p.images : [],
    weightOptions: variants,
    isFeatured: p.isFeatured,
    isTopSeller: p.isTopSeller,
    isOrganic: p.isOrganic,
    badge: p.badge || undefined,
    nutritionHighlights: p.nutritionHighlights || undefined,
    isActive: p.isActive,
    createdAt: p.createdAt?.toISOString?.() || p.createdAt,
    updatedAt: p.updatedAt?.toISOString?.() || p.updatedAt,
  };
};

/**
 * GET /api/products
 * Public catalog & admin listing.
 * Supports filters: ?category=<slug_or_id>, ?search=<term>, ?featured=true, ?all=true
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, featured, all, limit } = req.query;

    const whereClause: Prisma.ProductWhereInput = {};

    // Customer catalog hides inactive products by default unless ?all=true is explicitly requested
    if (all !== 'true') {
      whereClause.isActive = true;
    }

    if (featured === 'true') {
      whereClause.isFeatured = true;
    }

    if (category && typeof category === 'string' && category.trim()) {
      whereClause.OR = [
        { categoryId: category.trim() },
        { category: { slug: category.trim() } },
      ];
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      whereClause.AND = [
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { tamilName: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { origin: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          orderBy: { price: 'asc' },
        },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit ? parseInt(String(limit), 10) : undefined,
    });

    res.json({ products: products.map(formatProduct) });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to retrieve products.' });
  }
});

/**
 * GET /api/products/:idOrSlug
 * Public product detail query.
 */
router.get('/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: String(idOrSlug) },
          { slug: String(idOrSlug) },
        ],
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          orderBy: { price: 'asc' },
        },
      },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    res.json({ product: formatProduct(product) });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to retrieve product details.' });
  }
});

/**
 * POST /api/products
 * Admin only: Create product with multiple images and variants.
 */
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      name,
      tamilName,
      slug: customSlug,
      categoryId,
      shortDescription,
      description,
      benefits = [],
      origin = 'Tamil Nadu',
      rating = 5.0,
      reviewCount = 0,
      images = [],
      variants = [],
      isFeatured = false,
      isTopSeller = false,
      isOrganic = true,
      badge,
      nutritionHighlights,
      isActive = true,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Product name is required.' });
      return;
    }

    if (!categoryId || typeof categoryId !== 'string') {
      res.status(400).json({ error: 'Category selection is required.' });
      return;
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId.trim() },
    });

    if (!category) {
      res.status(400).json({ error: 'Selected category does not exist.' });
      return;
    }

    // Process and validate variants
    if (!Array.isArray(variants) || variants.length === 0) {
      res.status(400).json({ error: 'At least one product weight/price variant is required.' });
      return;
    }

    for (const v of variants) {
      if (!v.label || !v.label.trim()) {
        res.status(400).json({ error: 'Each variant must specify a label (e.g. "500 g", "1 kg").' });
        return;
      }
      if (v.price === undefined || v.price === null || isNaN(Number(v.price)) || Number(v.price) < 0) {
        res.status(400).json({ error: `Invalid price for variant "${v.label}". Price must be a positive number.` });
        return;
      }
    }

    // Process images
    const cleanImages: string[] = Array.isArray(images)
      ? images.map((img: string) => String(img).trim()).filter(Boolean)
      : [];

    if (cleanImages.length === 0) {
      cleanImages.push('https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80');
    }

    // Generate slug
    const cleanName = name.trim();
    let finalSlug = customSlug && typeof customSlug === 'string' && customSlug.trim()
      ? slugify(customSlug)
      : slugify(cleanName);

    if (!finalSlug) {
      finalSlug = `product-${Date.now()}`;
    }

    const existingSlug = await prisma.product.findUnique({
      where: { slug: finalSlug },
    });

    if (existingSlug) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    // Create product and variants in a transaction
    const createdProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: cleanName,
          tamilName: tamilName?.trim() || null,
          slug: finalSlug,
          categoryId: category.id,
          shortDescription: shortDescription?.trim() || null,
          description: description?.trim() || null,
          benefits: Array.isArray(benefits) ? benefits.map((b: any) => String(b).trim()).filter(Boolean) : [],
          origin: origin?.trim() || 'Tamil Nadu',
          rating: new Prisma.Decimal(Number(rating) || 5.0),
          reviewCount: Number(reviewCount) || 0,
          images: cleanImages,
          isFeatured: Boolean(isFeatured),
          isTopSeller: Boolean(isTopSeller),
          isOrganic: Boolean(isOrganic),
          badge: badge?.trim() || null,
          nutritionHighlights: nutritionHighlights || null,
          isActive: Boolean(isActive),
          variants: {
            create: variants.map((v: any) => ({
              label: String(v.label).trim(),
              price: new Prisma.Decimal(Number(v.price)),
              originalPrice: v.originalPrice !== undefined && v.originalPrice !== null && !isNaN(Number(v.originalPrice))
                ? new Prisma.Decimal(Number(v.originalPrice))
                : null,
              stock: Number(v.stockCount ?? v.stock ?? 0),
              inStock: v.inStock !== false && Number(v.stockCount ?? v.stock ?? 0) >= 0,
              isActive: v.isActive !== false,
            })),
          },
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          variants: true,
        },
      });

      return product;
    });

    res.status(201).json({
      message: 'Product created successfully.',
      product: formatProduct(createdProduct),
    });
  } catch (error: any) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product.', details: error?.message });
  }
});

/**
 * PUT /api/products/:id
 * Admin only: Update product, images, and sync variants.
 */
router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      tamilName,
      slug: customSlug,
      categoryId,
      shortDescription,
      description,
      benefits,
      origin,
      rating,
      reviewCount,
      images,
      variants,
      isFeatured,
      isTopSeller,
      isOrganic,
      badge,
      nutritionHighlights,
      isActive,
    } = req.body;

    const existing = await prisma.product.findUnique({
      where: { id: String(id) },
      include: { variants: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    // Verify category if changed
    if (categoryId && categoryId !== existing.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: String(categoryId).trim() },
      });
      if (!category) {
        res.status(400).json({ error: 'Selected category does not exist.' });
        return;
      }
    }

    // Validate slug if changed
    let newSlug = existing.slug;
    if (customSlug !== undefined && customSlug.trim() && customSlug.trim() !== existing.slug) {
      const cleanSlug = slugify(customSlug);
      const slugCollision = await prisma.product.findFirst({
        where: {
          slug: cleanSlug,
          NOT: { id: String(id) },
        },
      });
      if (slugCollision) {
        res.status(400).json({ error: 'A product with this URL slug already exists.' });
        return;
      }
      newSlug = cleanSlug;
    }

    // Perform update in transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // 1. Update product scalar fields
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (tamilName !== undefined) updateData.tamilName = tamilName?.trim() || null;
      if (newSlug !== existing.slug) updateData.slug = newSlug;
      if (categoryId !== undefined) updateData.categoryId = String(categoryId).trim();
      if (shortDescription !== undefined) updateData.shortDescription = shortDescription?.trim() || null;
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (benefits !== undefined && Array.isArray(benefits)) {
        updateData.benefits = benefits.map((b: any) => String(b).trim()).filter(Boolean);
      }
      if (origin !== undefined) updateData.origin = origin?.trim() || 'Tamil Nadu';
      if (rating !== undefined) updateData.rating = new Prisma.Decimal(Number(rating));
      if (reviewCount !== undefined) updateData.reviewCount = Number(reviewCount);
      if (images !== undefined && Array.isArray(images)) {
        updateData.images = images.map((img: string) => String(img).trim()).filter(Boolean);
      }
      if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
      if (isTopSeller !== undefined) updateData.isTopSeller = Boolean(isTopSeller);
      if (isOrganic !== undefined) updateData.isOrganic = Boolean(isOrganic);
      if (badge !== undefined) updateData.badge = badge?.trim() || null;
      if (nutritionHighlights !== undefined) updateData.nutritionHighlights = nutritionHighlights;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

      await tx.product.update({
        where: { id: String(id) },
        data: updateData,
      });

      // 2. Sync variants if provided
      if (Array.isArray(variants) && variants.length > 0) {
        const existingVariantIds = new Set(existing.variants.map((v) => v.id));
        const incomingVariantIds = new Set(variants.filter((v: any) => v.id).map((v: any) => v.id));

        // Delete removed variants
        const toDeleteIds = existing.variants
          .filter((v) => !incomingVariantIds.has(v.id))
          .map((v) => v.id);

        if (toDeleteIds.length > 0) {
          await tx.productVariant.deleteMany({
            where: { id: { in: toDeleteIds } },
          });
        }

        // Upsert incoming variants
        for (const v of variants) {
          const vData = {
            label: String(v.label).trim(),
            price: new Prisma.Decimal(Number(v.price)),
            originalPrice: v.originalPrice !== undefined && v.originalPrice !== null && !isNaN(Number(v.originalPrice))
              ? new Prisma.Decimal(Number(v.originalPrice))
              : null,
            stock: Number(v.stockCount ?? v.stock ?? 0),
            inStock: v.inStock !== false && Number(v.stockCount ?? v.stock ?? 0) >= 0,
            isActive: v.isActive !== false,
          };

          if (v.id && existingVariantIds.has(v.id)) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: vData,
            });
          } else {
            await tx.productVariant.create({
              data: {
                ...vData,
                productId: String(id),
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id: String(id) },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          variants: {
            orderBy: { price: 'asc' },
          },
        },
      });
    });

    res.json({
      message: 'Product updated successfully.',
      product: formatProduct(updatedProduct),
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product.', details: error?.message });
  }
});

/**
 * PATCH /api/products/:id/status
 * Admin only: Fast toggle for active / featured status.
 */
router.patch('/:id/status', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, isFeatured } = req.body;

    const data: any = {};
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (isFeatured !== undefined) data.isFeatured = Boolean(isFeatured);

    const updated = await prisma.product.update({
      where: { id: String(id) },
      data,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: true,
      },
    });

    res.json({
      message: 'Product status updated successfully.',
      product: formatProduct(updated),
    });
  } catch (error: any) {
    console.error('Error updating product status:', error);
    res.status(500).json({ error: 'Failed to update product status.', details: error?.message });
  }
});

/**
 * DELETE /api/products/:id
 * Admin only: Delete a product.
 */
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({
      where: { id: String(id) },
    });

    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    await prisma.product.delete({
      where: { id: String(id) },
    });

    res.json({ message: 'Product deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product.', details: error?.message });
  }
});

export default router;


import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

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

/**
 * GET /api/categories
 * Returns categories.
 * Query `?all=true` (for admin) returns inactive categories too.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.all === 'true';

    const categories = await prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    const formatted = categories.map((c) => ({
      id: c.id,
      name: c.name,
      tamilName: c.tamilName || undefined,
      slug: c.slug,
      description: c.description || '',
      image: c.image || '',
      iconName: c.iconName || 'Sparkles',
      itemCount: c._count.products,
      isPopular: c.isPopular,
      isActive: c.isActive,
      displayOrder: c.displayOrder,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    res.json({ categories: formatted });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

/**
 * GET /api/categories/:idOrSlug
 * Returns a single category.
 */
router.get('/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;

    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { id: String(idOrSlug) },
          { slug: String(idOrSlug) },
        ],
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    res.json({
      category: {
        id: category.id,
        name: category.name,
        tamilName: category.tamilName || undefined,
        slug: category.slug,
        description: category.description || '',
        image: category.image || '',
        iconName: category.iconName || 'Sparkles',
        itemCount: category._count.products,
        isPopular: category.isPopular,
        isActive: category.isActive,
        displayOrder: category.displayOrder,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to retrieve category.' });
  }
});

/**
 * POST /api/categories
 * Admin only: Create a new category.
 */
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      name,
      tamilName,
      slug: customSlug,
      description,
      image,
      iconName,
      isPopular = false,
      isActive = true,
      displayOrder = 0,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }

    const cleanName = name.trim();
    let finalSlug = customSlug && typeof customSlug === 'string' && customSlug.trim()
      ? slugify(customSlug)
      : slugify(cleanName);

    if (!finalSlug) {
      finalSlug = `category-${Date.now()}`;
    }

    // Check slug collision
    const existing = await prisma.category.findUnique({
      where: { slug: finalSlug },
    });

    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const created = await prisma.category.create({
      data: {
        name: cleanName,
        tamilName: tamilName?.trim() || null,
        slug: finalSlug,
        description: description?.trim() || null,
        image: image?.trim() || null,
        iconName: iconName?.trim() || 'Sparkles',
        isPopular: Boolean(isPopular),
        isActive: Boolean(isActive),
        displayOrder: Number(displayOrder) || 0,
      },
    });

    res.status(201).json({
      message: 'Category created successfully.',
      category: {
        id: created.id,
        name: created.name,
        tamilName: created.tamilName || undefined,
        slug: created.slug,
        description: created.description || '',
        image: created.image || '',
        iconName: created.iconName || 'Sparkles',
        itemCount: 0,
        isPopular: created.isPopular,
        isActive: created.isActive,
        displayOrder: created.displayOrder,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category.', details: error?.message });
  }
});

/**
 * PUT /api/categories/:id
 * Admin only: Update an existing category.
 */
router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      tamilName,
      slug: customSlug,
      description,
      image,
      iconName,
      isPopular,
      isActive,
      displayOrder,
    } = req.body;

    const existing = await prisma.category.findUnique({
      where: { id: String(id) },
    });

    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (tamilName !== undefined) updateData.tamilName = tamilName?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (image !== undefined) updateData.image = image?.trim() || null;
    if (iconName !== undefined) updateData.iconName = iconName?.trim() || 'Sparkles';
    if (isPopular !== undefined) updateData.isPopular = Boolean(isPopular);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);

    if (customSlug !== undefined && customSlug.trim() && customSlug.trim() !== existing.slug) {
      const cleanSlug = slugify(customSlug);
      const slugCollision = await prisma.category.findFirst({
        where: {
          slug: cleanSlug,
          NOT: { id: String(id) },
        },
      });
      if (slugCollision) {
        res.status(400).json({ error: 'A category with this URL slug already exists.' });
        return;
      }
      updateData.slug = cleanSlug;
    }

    const updated = await prisma.category.update({
      where: { id: String(id) },
      data: updateData,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.json({
      message: 'Category updated successfully.',
      category: {
        id: updated.id,
        name: updated.name,
        tamilName: updated.tamilName || undefined,
        slug: updated.slug,
        description: updated.description || '',
        image: updated.image || '',
        iconName: updated.iconName || 'Sparkles',
        itemCount: updated._count.products,
        isPopular: updated.isPopular,
        isActive: updated.isActive,
        displayOrder: updated.displayOrder,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category.', details: error?.message });
  }
});

/**
 * DELETE /api/categories/:id
 * Admin only: Delete a category (only if no products are assigned).
 */
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findUnique({
      where: { id: String(id) },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    if (existing._count.products > 0) {
      res.status(400).json({
        error: `Cannot delete category "${existing.name}" because it contains ${existing._count.products} products. Reassign or remove these products first.`,
      });
      return;
    }

    await prisma.category.delete({
      where: { id: String(id) },
    });

    res.json({ message: 'Category deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category.', details: error?.message });
  }
});

export default router;


import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/profile
 * Returns saved profile data for the authenticated customer from PostgreSQL.
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Return empty profile with user email / metadata defaults
      res.json({
        profile: {
          userId,
          fullName: req.user!.user_metadata?.full_name || '',
          phone: req.user!.user_metadata?.phone || '',
          alternatePhone: '',
          addressLine: '',
          landmark: '',
          city: 'Tiruchirappalli',
          state: 'Tamil Nadu',
          pincode: '',
          deliveryNotes: '',
          updatedAt: new Date().toISOString(),
        },
        isNew: true,
      });
      return;
    }

    res.json({
      profile: {
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName,
        phone: profile.phone,
        alternatePhone: profile.alternatePhone || '',
        addressLine: profile.addressLine,
        landmark: profile.landmark || '',
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
        deliveryNotes: profile.deliveryNotes || '',
        updatedAt: profile.updatedAt.toISOString(),
      },
      isNew: false,
    });
  } catch (error: any) {
    console.error('Error fetching customer profile:', error);
    res.status(500).json({ error: 'Failed to retrieve profile from database.' });
  }
});

/**
 * PUT /api/profile
 * Updates customer profile data for future orders in PostgreSQL.
 * (Note: Updating profile DOES NOT mutate previous order address snapshots!)
 */
router.put('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      fullName = '',
      phone = '',
      alternatePhone = '',
      addressLine = '',
      landmark = '',
      city = 'Tiruchirappalli',
      state = 'Tamil Nadu',
      pincode = '',
      deliveryNotes = '',
    } = req.body;

    const data = {
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      alternatePhone: alternatePhone ? String(alternatePhone).trim() : null,
      addressLine: String(addressLine).trim(),
      landmark: landmark ? String(landmark).trim() : null,
      city: String(city || 'Tiruchirappalli').trim(),
      state: String(state || 'Tamil Nadu').trim(),
      pincode: String(pincode).trim(),
      deliveryNotes: deliveryNotes ? String(deliveryNotes).trim() : null,
    };

    const saved = await prisma.profile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    res.json({
      message: 'Profile saved successfully.',
      profile: {
        id: saved.id,
        userId: saved.userId,
        fullName: saved.fullName,
        phone: saved.phone,
        alternatePhone: saved.alternatePhone || '',
        addressLine: saved.addressLine,
        landmark: saved.landmark || '',
        city: saved.city,
        state: saved.state,
        pincode: saved.pincode,
        deliveryNotes: saved.deliveryNotes || '',
        updatedAt: saved.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error saving customer profile:', error);
    res.status(500).json({ error: 'Failed to save profile to database.' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { memoryStore, CustomerProfile } from '../store/memoryStore.js';

const router = Router();

/**
 * GET /api/profile
 * Returns saved profile data for the authenticated customer.
 */
router.get('/', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const profile = memoryStore.getProfile(userId);

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

  res.json({ profile, isNew: false });
});

/**
 * PUT /api/profile
 * Updates customer profile data for future orders.
 * (Note: Updating profile DOES NOT mutate previous order address snapshots!)
 */
router.put('/', requireAuth, (req: Request, res: Response) => {
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

  const profileData: CustomerProfile = {
    userId,
    fullName: String(fullName).trim(),
    phone: String(phone).trim(),
    alternatePhone: String(alternatePhone).trim(),
    addressLine: String(addressLine).trim(),
    landmark: String(landmark).trim(),
    city: String(city).trim(),
    state: String(state).trim(),
    pincode: String(pincode).trim(),
    deliveryNotes: String(deliveryNotes).trim(),
    updatedAt: new Date().toISOString(),
  };

  const saved = memoryStore.saveProfile(profileData);

  res.json({
    message: 'Profile saved successfully.',
    profile: saved,
  });
});

export default router;


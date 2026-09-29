import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.ts';
import { users, sellerProfiles, addresses, wishlists, carts, cartItems } from '../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, generateToken } from '../middleware/auth.ts';

const router = Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, role = 'CUSTOMER', storeName, storeDescription } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Please provide email, password, and name.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check existing email
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole = role === 'SELLER' ? 'SELLER' : 'CUSTOMER';

    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      role: assignedRole,
      phone: phone || null,
      createdAt: now,
      updatedAt: now,
    });

    let sellerProfile = null;
    if (assignedRole === 'SELLER') {
      const sellerProfileId = `sel-${Date.now()}`;
      const store = storeName ? storeName.trim() : `${name.trim()}'s Store`;
      await db.insert(sellerProfiles).values({
        id: sellerProfileId,
        userId: userId,
        storeName: store,
        description: storeDescription || `Quality products from ${store}`,
        contactEmail: email.toLowerCase().trim(),
        contactPhone: phone || null,
        status: 'PENDING', // requires admin approval
        commissionRate: 10.0,
        createdAt: now,
        updatedAt: now,
      });

      sellerProfile = {
        id: sellerProfileId,
        storeName: store,
        status: 'PENDING',
      };
    }

    // Create default wishlist for customer
    const wishlistId = `wsh-${userId}`;
    await db.insert(wishlists).values({
      id: wishlistId,
      userId,
      createdAt: now,
    });

    const token = generateToken({ id: userId, email: email.toLowerCase().trim(), role: assignedRole });

    return res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        name: name.trim(),
        role: assignedRole,
        phone: phone || null,
        sellerProfileId: sellerProfile?.id,
        sellerStatus: sellerProfile?.status,
        storeName: sellerProfile?.storeName,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to complete registration. Please try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const userRows = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (userRows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = userRows[0];
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let sellerProfileId: string | undefined;
    let sellerStatus: string | undefined;
    let storeName: string | undefined;

    if (user.role === 'SELLER') {
      const sellerRows = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, user.id)).limit(1);
      if (sellerRows.length > 0) {
        sellerProfileId = sellerRows[0].id;
        sellerStatus = sellerRows[0].status;
        storeName = sellerRows[0].storeName;
      }
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        sellerProfileId,
        sellerStatus,
        storeName,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

// Current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    return res.json({ user: req.user });
  } catch (err: any) {
    return res.status(500).json({ error: 'Unable to load profile.' });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const now = new Date().toISOString();
    await db.update(users)
      .set({ name: name.trim(), phone: phone || null, updatedAt: now })
      .where(eq(users.id, req.user!.id));

    return res.json({ message: 'Profile updated successfully.', name, phone });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Apply to become seller
router.post('/seller-apply', authenticateToken, async (req, res) => {
  try {
    const { storeName, description, contactEmail, contactPhone } = req.body;
    if (!storeName || !contactEmail) {
      return res.status(400).json({ error: 'Store name and contact email are required.' });
    }

    const userId = req.user!.id;
    const existing = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, userId)).limit(1);

    const now = new Date().toISOString();
    if (existing.length > 0) {
      return res.status(400).json({ error: 'You already have an existing seller application.' });
    }

    const sellerProfileId = `sel-${Date.now()}`;
    await db.insert(sellerProfiles).values({
      id: sellerProfileId,
      userId,
      storeName: storeName.trim(),
      description: description || null,
      contactEmail: contactEmail.trim().toLowerCase(),
      contactPhone: contactPhone || null,
      status: 'PENDING',
      commissionRate: 10.0,
      createdAt: now,
      updatedAt: now,
    });

    // Update user role to SELLER
    await db.update(users).set({ role: 'SELLER', updatedAt: now }).where(eq(users.id, userId));

    return res.status(201).json({
      message: 'Seller application submitted successfully! It is now pending administrator review.',
      sellerProfileId,
    });
  } catch (err: any) {
    console.error('Seller apply error:', err);
    return res.status(500).json({ error: 'Could not submit seller application.' });
  }
});

// Addresses
router.get('/addresses', authenticateToken, async (req, res) => {
  try {
    const userAddresses = await db.select().from(addresses)
      .where(eq(addresses.userId, req.user!.id))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
    return res.json({ addresses: userAddresses });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve addresses.' });
  }
});

router.post('/addresses', authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, addressLine1, addressLine2, city, state, pincode, country = 'India', isDefault } = req.body;

    if (!fullName || !phone || !addressLine1 || !city || !state || !pincode) {
      return res.status(400).json({ error: 'Please fill in all required address fields.' });
    }

    const now = new Date().toISOString();
    const addressId = `addr-${Date.now()}`;

    if (isDefault) {
      // Unset other defaults for user
      await db.update(addresses)
        .set({ isDefault: 0 })
        .where(eq(addresses.userId, req.user!.id));
    }

    await db.insert(addresses).values({
      id: addressId,
      userId: req.user!.id,
      fullName: fullName.trim(),
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2 ? addressLine2.trim() : null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      country: country.trim(),
      isDefault: isDefault ? 1 : 0,
      createdAt: now,
    });

    const created = await db.select().from(addresses).where(eq(addresses.id, addressId)).limit(1);
    return res.status(201).json({ message: 'Address saved successfully.', address: created[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save address.' });
  }
});

router.delete('/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, req.user!.id)));
    return res.json({ message: 'Address removed successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete address.' });
  }
});

export default router;

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db/index.ts';
import authRoutes from './server/routes/auth.ts';
import productRoutes from './server/routes/products.ts';
import categoryRoutes from './server/routes/categories.ts';
import cartRoutes from './server/routes/cart.ts';
import wishlistRoutes from './server/routes/wishlist.ts';
import checkoutRoutes from './server/routes/checkout.ts';
import orderRoutes from './server/routes/orders.ts';
import reviewRoutes from './server/routes/reviews.ts';
import returnRoutes from './server/routes/returns.ts';
import couponRoutes from './server/routes/coupons.ts';
import sellerRoutes from './server/routes/seller.ts';
import adminRoutes from './server/routes/admin.ts';
import aiRoutes from './server/routes/ai.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Initialize SQLite database and seed demo data automatically if empty
  try {
    await initDatabase();
  } catch (err: any) {
    console.error('❌ Database initialization error:', err);
    process.exit(1);
  }

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/checkout', checkoutRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/returns', returnRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/seller', sellerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/ai', aiRoutes);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      app: 'Commerce Engine',
      environment: isProduction ? 'production' : 'development',
      database: 'SQLite',
      timestamp: new Date().toISOString(),
    });
  });

  // Vite middleware in dev or static files in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('==============================================');
    console.log(`🚀 Commerce Engine running at:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   API Endpoint: http://localhost:${PORT}/api/health`);
    console.log(`   Database: Local SQLite file (commerce_engine.db)`);
    console.log('==============================================');
  });
}

startServer().catch((err) => {
  console.error('Failed to start Commerce Engine:', err);
});

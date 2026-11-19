const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const mongoose = require('mongoose');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;

dotenv.config({
  path: path.join(__dirname, '.env.local'),
  quiet: true
});

if (process.argv.includes('--demo')) {
  process.env.AUTH_MODE = 'demo';
  process.env.DATA_MODE = 'preview';
}

const CATEGORIES = [
  {
    key: 'dish',
    labelZh: '菜品',
    labelEn: 'Dishes',
    description: '飯麵、小食及茶餐廳熱食',
    icon: '碟'
  },
  {
    key: 'drink',
    labelZh: '飲品',
    labelEn: 'Drinks',
    description: '奶茶、咖啡、凍飲及特飲',
    icon: '杯'
  },
  {
    key: 'bread',
    labelZh: '麵包',
    labelEn: 'Bread',
    description: '菠蘿包、多士及出爐烘焙',
    icon: '包'
  }
];

const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((category) => [category.key, category])
);
const seedMenu = require('./data/menu.json');

const menuItemSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['dish', 'drink', 'bread'],
      index: true
    },
    nameZh: { type: String, required: true, trim: true, maxlength: 80 },
    nameEn: { type: String, required: true, trim: true, maxlength: 120 },
    price: { type: Number, required: true, min: 0 },
    descriptionZh: { type: String, trim: true, maxlength: 500, default: '' },
    tags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    available: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 100 }
  },
  { timestamps: true, versionKey: false }
);

const MenuItem =
  mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

function getConfig(overrides = {}) {
  const authMode = (overrides.authMode || process.env.AUTH_MODE || 'facebook').toLowerCase();
  const dataMode = (overrides.dataMode || process.env.DATA_MODE || 'preview').toLowerCase();

  if (!['facebook', 'demo'].includes(authMode)) {
    throw new Error('AUTH_MODE must be "facebook" or "demo".');
  }
  if (!['preview', 'mongo'].includes(dataMode)) {
    throw new Error('DATA_MODE must be "preview" or "mongo".');
  }
  if ((overrides.nodeEnv || process.env.NODE_ENV) === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required in production.');
  }

  return {
    nodeEnv: overrides.nodeEnv || process.env.NODE_ENV || 'development',
    port: Number(overrides.port || process.env.PORT) || 8099,
    sessionSecret:
      process.env.SESSION_SECRET || 'local-preview-session-secret-change-me',
    authMode,
    dataMode
  };
}

function resolveMongoUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const { MONGO_HOST, MONGO_USER, MONGO_PASSWORD, MONGO_DB, MONGO_OPTIONS } =
    process.env;

  if (!MONGO_HOST || !MONGO_USER || !MONGO_PASSWORD) {
    return null;
  }

  const host = MONGO_HOST.replace(/^mongodb\+srv:\/\//, '').replace(/\/$/, '');
  const options = MONGO_OPTIONS || 'retryWrites=true&w=majority';
  return `mongodb+srv://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(
    MONGO_PASSWORD
  )}@${host}/${MONGO_DB || 'cha_chaan_teng'}?${options}`;
}

async function connectDatabase() {
  const uri = resolveMongoUri();
  if (!uri) {
    throw new Error('MongoDB is not configured. Set MONGODB_URI or MONGO_HOST.');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

function text(value, fallback = '') {
  return value === undefined || value === null ? fallback : String(value).trim();
}

function parseBoolean(value, fallback) {
  const current = Array.isArray(value) ? value.at(-1) : value;
  if (current === true || current === 'true' || current === 'on' || current === '1') {
    return true;
  }
  if (current === false || current === 'false' || current === '0' || current === '') {
    return false;
  }
  return fallback;
}

function parseList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))];
  }
  return [...new Set(text(value).split(/[,，]/).map((entry) => entry.trim()).filter(Boolean))];
}

function makeSlug(nameEn, nameZh) {
  const base = text(nameEn)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'menu-item'}-${crypto.randomBytes(3).toString('hex')}-${text(
    nameZh
  ).length}`;
}

function normalizeMenuInput(input, existing = {}) {
  const category = text(input.category, existing.category);
  const nameZh = text(input.nameZh, existing.nameZh);
  const nameEn = text(input.nameEn, existing.nameEn);
  const price = Number(
    input.price === undefined || input.price === '' ? existing.price : input.price
  );

  if (!CATEGORY_MAP[category]) {
    throw new ValidationError('請選擇有效分類：菜品、飲品或麵包。');
  }
  if (!nameZh) {
    throw new ValidationError('請輸入中文名稱。');
  }
  if (!nameEn) {
    throw new ValidationError('請輸入英文名稱。');
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new ValidationError('價格必須是 0 或以上的有效數字。');
  }

  return {
    slug: text(input.slug, existing.slug || makeSlug(nameEn, nameZh)),
    category,
    nameZh,
    nameEn,
    price: Math.round(price * 100) / 100,
    descriptionZh: text(input.descriptionZh, existing.descriptionZh || ''),
    tags: input.tags === undefined ? existing.tags || [] : parseList(input.tags),
    allergens:
      input.allergens === undefined ? existing.allergens || [] : parseList(input.allergens),
    available: parseBoolean(input.available, existing.available ?? true),
    featured: parseBoolean(input.featured, existing.featured ?? false),
    sortOrder:
      input.sortOrder === undefined || input.sortOrder === ''
        ? existing.sortOrder ?? 100
        : Number(input.sortOrder) || 100
  };
}

function normalizeStored(item) {
  const plain = typeof item.toObject === 'function' ? item.toObject() : { ...item };
  return {
    ...plain,
    id: String(plain.id || plain._id),
    tags: plain.tags || [],
    allergens: plain.allergens || [],
    available: Boolean(plain.available),
    featured: Boolean(plain.featured)
  };
}

function matchesFilter(item, filter = {}) {
  if (filter.category && item.category !== filter.category) {
    return false;
  }
  if (filter.available !== undefined && item.available !== filter.available) {
    return false;
  }
  const query = text(filter.q).toLowerCase();
  if (!query) {
    return true;
  }
  return [
    item.nameZh,
    item.nameEn,
    item.descriptionZh,
    ...(item.tags || [])
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function sortItems(items) {
  return [...items].sort((first, second) => {
    const order = ['dish', 'drink', 'bread'];
    return (
      order.indexOf(first.category) - order.indexOf(second.category) ||
      Number(first.sortOrder || 100) - Number(second.sortOrder || 100) ||
      first.nameZh.localeCompare(second.nameZh, 'zh-Hant')
    );
  });
}

class PreviewRepository {
  constructor(items) {
    this.items = items.map((item) => ({
      ...normalizeMenuInput(item, item),
      id: String(item.id),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString()
    }));
  }

  async list(filter = {}) {
    return sortItems(this.items.filter((item) => matchesFilter(item, filter))).map(
      normalizeStored
    );
  }

  async findById(id) {
    const item = this.items.find((entry) => String(entry.id) === String(id));
    return item ? normalizeStored(item) : null;
  }

  async create(input) {
    const now = new Date().toISOString();
    const item = {
      ...normalizeMenuInput(input),
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    this.items.push(item);
    return normalizeStored(item);
  }

  async update(id, input) {
    const index = this.items.findIndex((entry) => String(entry.id) === String(id));
    if (index === -1) {
      return null;
    }
    this.items[index] = {
      ...this.items[index],
      ...normalizeMenuInput(input, this.items[index]),
      updatedAt: new Date().toISOString()
    };
    return normalizeStored(this.items[index]);
  }

  async delete(id) {
    const index = this.items.findIndex((entry) => String(entry.id) === String(id));
    if (index === -1) {
      return false;
    }
    this.items.splice(index, 1);
    return true;
  }
}

class MongoRepository {
  async list(filter = {}) {
    const query = {};
    if (filter.category) {
      query.category = filter.category;
    }
    if (filter.available !== undefined) {
      query.available = filter.available;
    }
    if (text(filter.q)) {
      const safeQuery = text(filter.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { nameZh: { $regex: safeQuery, $options: 'i' } },
        { nameEn: { $regex: safeQuery, $options: 'i' } },
        { descriptionZh: { $regex: safeQuery, $options: 'i' } },
        { tags: { $regex: safeQuery, $options: 'i' } }
      ];
    }
    const items = await MenuItem.find(query).lean();
    return sortItems(items.map(normalizeStored));
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const item = await MenuItem.findById(id).lean();
    return item ? normalizeStored(item) : null;
  }

  async create(input) {
    return normalizeStored(await MenuItem.create(normalizeMenuInput(input)));
  }

  async update(id, input) {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const existing = await MenuItem.findById(id).lean();
    if (!existing) {
      return null;
    }
    const item = await MenuItem.findByIdAndUpdate(id, normalizeMenuInput(input, existing), {
      new: true,
      runValidators: true
    });
    return item ? normalizeStored(item) : null;
  }

  async delete(id) {
    if (!mongoose.isValidObjectId(id)) {
      return false;
    }
    return Boolean(await MenuItem.findByIdAndDelete(id));
  }
}

function friendlyError(error) {
  if (error?.code === 11000) {
    return '此菜式代碼已存在。';
  }
  return error?.message || '系統暫時無法完成操作，請再試一次。';
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function toFilter(query) {
  return {
    category: CATEGORY_MAP[query.category] ? query.category : '',
    q: text(query.q).slice(0, 100),
    available:
      query.available === 'true'
        ? true
        : query.available === 'false'
          ? false
          : undefined
  };
}

function configurePassport(config) {
  const facebookConfigured = Boolean(
    process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET
  );

  if (config.authMode === 'facebook' && facebookConfigured) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL:
            process.env.FACEBOOK_CALLBACK_URL ||
            'http://localhost:8099/auth/facebook/callback',
          profileFields: ['id', 'displayName']
        },
        (_token, _refreshToken, profile, done) =>
          done(null, {
            id: profile.id,
            name: profile.displayName || 'Facebook user',
            provider: profile.provider
          })
      )
    );
  }

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
  return facebookConfigured;
}

function createApiRouter(repository) {
  const router = express.Router();
  router.get('/', (_req, res) => {
    res.json({
      service: 'Cha Chaan Teng Menu REST API',
      endpoints: [
        'GET /api/menu',
        'GET /api/menu/:id',
        'POST /api/menu',
        'PUT /api/menu/:id',
        'DELETE /api/menu/:id'
      ]
    });
  });
  router.get(
    '/menu',
    asyncRoute(async (req, res) => {
      const data = await repository.list(toFilter(req.query));
      res.json({ count: data.length, data });
    })
  );
  router.get(
    '/menu/:id',
    asyncRoute(async (req, res) => {
      const item = await repository.findById(req.params.id);
      return item ? res.json({ data: item }) : res.status(404).json({ error: 'Menu item not found.' });
    })
  );
  router.post(
    '/menu',
    asyncRoute(async (req, res) => {
      try {
        res.status(201).json({ data: await repository.create(req.body) });
      } catch (error) {
        res.status(error.status || 400).json({ error: friendlyError(error) });
      }
    })
  );
  router.put(
    '/menu/:id',
    asyncRoute(async (req, res) => {
      try {
        const item = await repository.update(req.params.id, req.body);
        return item
          ? res.json({ data: item })
          : res.status(404).json({ error: 'Menu item not found.' });
      } catch (error) {
        return res.status(error.status || 400).json({ error: friendlyError(error) });
      }
    })
  );
  router.delete(
    '/menu/:id',
    asyncRoute(async (req, res) => {
      const deleted = await repository.delete(req.params.id);
      return deleted
        ? res.json({ message: 'Menu item deleted.', id: req.params.id })
        : res.status(404).json({ error: 'Menu item not found.' });
    })
  );
  return router;
}

function createWebRouter(repository, config, facebookConfigured) {
  const router = express.Router();
  const requireAuth = (req, res, next) =>
    req.isAuthenticated() ? next() : res.redirect('/login');
  const render = (res, view, data = {}, status = 200) =>
    res.status(status).render('app', { view, ...data });
  const loggedIn = (req) => req.isAuthenticated();

  router.get('/login', (req, res) =>
    loggedIn(req)
      ? res.redirect('/')
      : render(res, 'login', {
          pageTitle: '登入',
          authError: req.query.error || '',
          demoAuth: config.authMode === 'demo',
          facebookConfigured
        })
  );

  if (config.authMode === 'demo') {
    router.get('/auth/demo', (req, res, next) => {
      const target = text(req.query.returnTo, '/');
      const returnTo = target.startsWith('/') && !target.startsWith('//') ? target : '/';
      req.login(
        { id: 'local-demo-user', name: '本機示範管理員', provider: 'local-demo' },
        (error) => (error ? next(error) : res.redirect(returnTo))
      );
    });
  }

  if (config.authMode === 'facebook') {
    router.get('/auth/facebook', (req, res, next) =>
      facebookConfigured
        ? passport.authenticate('facebook', { scope: ['public_profile'] })(req, res, next)
        : res.redirect('/login?error=facebook-not-configured')
    );
    router.get(
      '/auth/facebook/callback',
      (req, res, next) =>
        passport.authenticate('facebook', {
          failureRedirect: '/login?error=facebook-failed'
        })(req, res, next),
      (_req, res) => res.redirect('/')
    );
  }

  router.post('/logout', requireAuth, (req, res, next) =>
    req.logout((error) =>
      error ? next(error) : req.session.destroy(() => res.redirect('/login'))
    )
  );

  router.get(
    '/',
    requireAuth,
    asyncRoute(async (req, res) => {
      const filter = toFilter(req.query);
      const items = await repository.list(filter);
      const allItems = await repository.list();
      render(res, 'dashboard', {
        pageTitle: '菜單總覽',
        items,
        filter,
        notice: req.query.notice || '',
        stats: {
          total: allItems.length,
          available: allItems.filter((item) => item.available).length,
          featured: allItems.filter((item) => item.featured).length,
          byCategory: Object.fromEntries(
            CATEGORIES.map((category) => [
              category.key,
              allItems.filter((item) => item.category === category.key).length
            ])
          )
        }
      });
    })
  );

  router.get('/menu/new', requireAuth, (req, res) =>
    render(res, 'form', {
      pageTitle: '新增菜式',
      pageEyebrow: 'CREATE',
      submitLabel: '儲存菜式',
      formAction: '/menu',
      formError: '',
      item: {
        category: req.query.category || 'dish',
        nameZh: '',
        nameEn: '',
        price: '',
        descriptionZh: '',
        tags: [],
        allergens: [],
        available: true,
        featured: false,
        sortOrder: 100
      }
    })
  );

  router.post(
    '/menu',
    requireAuth,
    asyncRoute(async (req, res) => {
      try {
        const item = await repository.create(req.body);
        res.redirect(`/menu/${item.id}?notice=created`);
      } catch (error) {
        render(
          res,
          'form',
          {
            pageTitle: '新增菜式',
            pageEyebrow: 'CREATE',
            submitLabel: '儲存菜式',
            formAction: '/menu',
            formError: friendlyError(error),
            item: {
              ...req.body,
              tags: req.body.tags || '',
              allergens: req.body.allergens || '',
              available: parseBoolean(req.body.available, true),
              featured: parseBoolean(req.body.featured, false)
            }
          },
          error.status || 400
        );
      }
    })
  );

  router.get(
    '/menu/:id',
    requireAuth,
    asyncRoute(async (req, res) => {
      const item = await repository.findById(req.params.id);
      if (!item) {
        return render(res, 'error', {
          pageTitle: '找不到菜式',
          statusCode: 404,
          message: '此菜式不存在，可能已被刪除。'
        }, 404);
      }
      return render(res, 'details', {
        pageTitle: item.nameZh,
        item,
        category: CATEGORY_MAP[item.category],
        notice: req.query.notice || ''
      });
    })
  );

  router.get(
    '/menu/:id/edit',
    requireAuth,
    asyncRoute(async (req, res) => {
      const item = await repository.findById(req.params.id);
      if (!item) {
        return render(res, 'error', {
          pageTitle: '找不到菜式',
          statusCode: 404,
          message: '此菜式不存在，可能已被刪除。'
        }, 404);
      }
      return render(res, 'form', {
        pageTitle: `編輯 ${item.nameZh}`,
        pageEyebrow: 'UPDATE',
        submitLabel: '儲存修改',
        formAction: `/menu/${item.id}/edit`,
        formError: '',
        item
      });
    })
  );

  router.post(
    '/menu/:id/edit',
    requireAuth,
    asyncRoute(async (req, res) => {
      try {
        const item = await repository.update(req.params.id, req.body);
        return item
          ? res.redirect(`/menu/${item.id}?notice=updated`)
          : render(res, 'error', {
              pageTitle: '找不到菜式',
              statusCode: 404,
              message: '此菜式不存在，可能已被刪除。'
            }, 404);
      } catch (error) {
        const item = await repository.findById(req.params.id);
        return render(res, 'form', {
          pageTitle: `編輯 ${item?.nameZh || '菜式'}`,
          pageEyebrow: 'UPDATE',
          submitLabel: '儲存修改',
          formAction: `/menu/${req.params.id}/edit`,
          formError: friendlyError(error),
          item: {
            ...item,
            ...req.body,
            tags: req.body.tags || '',
            allergens: req.body.allergens || '',
            available: parseBoolean(req.body.available, true),
            featured: parseBoolean(req.body.featured, false)
          }
        }, error.status || 400);
      }
    })
  );

  router.get(
    '/menu/:id/delete',
    requireAuth,
    asyncRoute(async (req, res) => {
      const item = await repository.findById(req.params.id);
      if (!item) {
        return render(res, 'error', {
          pageTitle: '找不到菜式',
          statusCode: 404,
          message: '此菜式不存在，可能已被刪除。'
        }, 404);
      }
      return render(res, 'delete-confirm', {
        pageTitle: `刪除 ${item.nameZh}`,
        item
      });
    })
  );

  router.post(
    '/menu/:id/delete',
    requireAuth,
    asyncRoute(async (req, res) => {
      const deleted = await repository.delete(req.params.id);
      res.redirect(deleted ? '/?notice=deleted' : '/?notice=not-found');
    })
  );
  return router;
}

async function buildApp(options = {}) {
  const config = getConfig(options);
  if (config.dataMode === 'mongo') {
    await connectDatabase();
  }
  const repository =
    config.dataMode === 'mongo' ? new MongoRepository() : new PreviewRepository(seedMenu);
  const facebookConfigured = configurePassport(config);
  const app = express();

  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.set('trust proxy', config.nodeEnv === 'production' ? 1 : false);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          formAction: ["'self'", 'https://www.facebook.com'],
          connectSrc: ["'self'"]
        }
      }
    })
  );
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(express.json({ limit: '64kb' }));
  app.use('/public', express.static(path.join(__dirname, 'public')));
  app.use(
    session({
      name: 'chengmen.sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        maxAge: 1000 * 60 * 60 * 8
      }
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.locals.categories = CATEGORIES;
  app.locals.getCategory = (key) => CATEGORY_MAP[key];
  app.locals.formatPrice = (value) =>
    new Intl.NumberFormat('zh-HK', {
      style: 'currency',
      currency: 'HKD',
      minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(Number(value));
  app.locals.currentYear = new Date().getFullYear();
  app.locals.dataMode = config.dataMode;
  app.use((req, res, next) => {
    res.locals.currentUser = req.user || null;
    res.locals.currentPath = req.path;
    next();
  });
  app.use('/api', createApiRouter(repository));
  app.use('/api', (req, res) =>
    res.status(404).json({ error: `Unknown API route: ${req.originalUrl}` })
  );
  app.use(createWebRouter(repository, config, facebookConfigured));
  app.use((req, res) =>
    res.status(404).render('app', {
      view: 'error',
      pageTitle: '找不到頁面',
      statusCode: 404,
      message: `找不到 ${req.path}，請返回菜單總覽。`
    })
  );
  app.use((error, req, res, _next) => {
    console.error(`[${new Date().toISOString()}] ${error.name}: ${error.message}`);
    return req.path.startsWith('/api/')
      ? res.status(error.status || 500).json({ error: error.message })
      : res.status(error.status || 500).render('app', {
          view: 'error',
          pageTitle: '系統錯誤',
          statusCode: error.status || 500,
          message: config.nodeEnv === 'production' ? '請稍後再試。' : error.message
        });
  });
  return app;
}

async function startServer() {
  const config = getConfig();
  const app = await buildApp();
  const server = app.listen(config.port, () => {
    console.log(`茶記菜單管理已啟動：http://localhost:${config.port}`);
    console.log(`資料模式：${config.dataMode}；登入模式：${config.authMode}`);
  });
  const shutdown = () =>
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function runSeed() {
  if (!process.argv.includes('--confirm')) {
    console.log('尚未寫入 MongoDB。確認資料後請執行：npm run seed:menu -- --confirm');
    process.exitCode = 1;
    return;
  }
  await connectDatabase();
  await MenuItem.init();
  const result = await MenuItem.bulkWrite(
    seedMenu.map((item) => ({
      updateOne: {
        filter: { slug: item.slug },
        update: { $setOnInsert: normalizeMenuInput(item, item) },
        upsert: true
      }
    })),
    { ordered: false }
  );
  console.log(`MongoDB 匯入完成：新增 ${result.upsertedCount} 項，已存在 ${result.matchedCount} 項。`);
}

async function runSmokeTest() {
  const app = await buildApp({
    authMode: 'demo',
    dataMode: 'preview',
    nodeEnv: 'test',
    sessionSecret: 'smoke-test-session-secret'
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (url, options = {}, cookie = '') => {
    const response = await fetch(`${base}${url}`, {
      ...options,
      headers: { ...(options.headers || {}), ...(cookie ? { cookie } : {}) },
      redirect: 'manual'
    });
    const body = await response.text();
    return {
      status: response.status,
      location: response.headers.get('location'),
      cookie: response.headers.get('set-cookie'),
      text: body,
      json: (response.headers.get('content-type') || '').includes('application/json')
        ? JSON.parse(body)
        : null
    };
  };

  try {
    const login = await request('/auth/demo');
    const cookie = login.cookie.split(';')[0];
    const protectedPage = await request('/');
    if (protectedPage.status !== 302 || protectedPage.location !== '/login') {
      throw new Error('Protected web page smoke test failed.');
    }
    const dashboard = await request('/', {}, cookie);
    if (dashboard.status !== 200 || !dashboard.text.includes('奶油多士')) {
      throw new Error('Dashboard smoke test failed.');
    }
    const create = await request(
      '/menu',
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          nameZh: '測試西多士',
          nameEn: 'Test French Toast',
          category: 'bread',
          price: '30',
          available: 'true',
          featured: 'false'
        })
      },
      cookie
    );
    if (create.status !== 302) {
      throw new Error('Web create smoke test failed.');
    }
    const id = create.location.split('/')[2].split('?')[0];
    const update = await request(
      `/menu/${id}/edit`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          nameZh: '測試西多士（已更新）',
          nameEn: 'Updated Test French Toast',
          category: 'bread',
          price: '32',
          available: 'false',
          featured: 'true'
        })
      },
      cookie
    );
    if (update.status !== 302) {
      throw new Error('Web update smoke test failed.');
    }
    const deletePage = await request(`/menu/${id}/delete`, {}, cookie);
    if (deletePage.status !== 200 || !deletePage.text.includes('確定刪除')) {
      throw new Error('Web delete confirmation smoke test failed.');
    }
    const deleteWeb = await request(`/menu/${id}/delete`, { method: 'POST' }, cookie);
    if (deleteWeb.status !== 302) {
      throw new Error('Web delete smoke test failed.');
    }
    const apiCreate = await request('/api/menu', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nameZh: '測試熱咖啡',
        nameEn: 'Test Hot Coffee',
        category: 'drink',
        price: 22
      })
    });
    if (apiCreate.status !== 201) {
      throw new Error('REST create smoke test failed.');
    }
    const apiId = apiCreate.json.data.id;
    const apiUpdate = await request(`/api/menu/${apiId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ price: 33, available: true })
    });
    if (apiUpdate.status !== 200 || apiUpdate.json.data.price !== 33) {
      throw new Error('REST update smoke test failed.');
    }
    const list = await request('/api/menu?category=drink&q=%E5%92%96%E5%95%A1');
    if (list.status !== 200 || list.json.count < 1) {
      throw new Error('REST read/filter smoke test failed.');
    }
    const remove = await request(`/api/menu/${apiId}`, { method: 'DELETE' });
    if (remove.status !== 200) {
      throw new Error('REST delete smoke test failed.');
    }
    console.log('Smoke test passed: login, web CRUD, REST CRUD and filtering.');
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    await disconnectDatabase();
  }
}

if (require.main === module) {
  const task = process.argv.includes('--seed')
    ? runSeed()
    : process.argv.includes('--smoke-test')
      ? runSmokeTest()
      : startServer();
  task
    .catch(async (error) => {
      console.error(`執行失敗：${error.message}`);
      await disconnectDatabase();
      process.exitCode = 1;
    })
    .finally(async () => {
      if (process.argv.includes('--seed')) {
        await disconnectDatabase();
      }
    });
}

module.exports = { buildApp };

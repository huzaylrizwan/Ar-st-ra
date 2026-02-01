import { z } from 'zod';
import { insertCategorySchema, insertProductSchema, insertThemeSettingsSchema, insertBannerSchema, insertFaqItemSchema, insertHeroImageSchema, categories, products, themeSettings, banners, faqItems, heroImages } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories',
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/categories/:id',
      responses: {
        200: z.custom<typeof categories.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories',
      input: insertCategorySchema,
      responses: {
        201: z.custom<typeof categories.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/categories/:id',
      input: insertCategorySchema.partial(),
      responses: {
        200: z.custom<typeof categories.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/categories/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products',
      input: z.object({
        categoryId: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id',
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products',
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id',
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings',
      responses: {
        200: z.custom<typeof themeSettings.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/settings',
      input: insertThemeSettingsSchema.partial(),
      responses: {
        200: z.custom<typeof themeSettings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  uploads: {
    requestUrl: {
      method: 'POST' as const,
      path: '/api/uploads/request-url',
      input: z.object({
        name: z.string(),
        size: z.number(),
        contentType: z.string(),
      }),
      responses: {
        200: z.object({
          uploadURL: z.string(),
          objectPath: z.string(),
          metadata: z.object({
            name: z.string(),
            size: z.number(),
            contentType: z.string(),
          }),
        }),
      },
    },
  },
  banners: {
    list: {
      method: 'GET' as const,
      path: '/api/banners',
      responses: {
        200: z.array(z.custom<typeof banners.$inferSelect>()),
      },
    },
    active: {
      method: 'GET' as const,
      path: '/api/banners/active',
      responses: {
        200: z.array(z.custom<typeof banners.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/banners',
      input: insertBannerSchema,
      responses: {
        201: z.custom<typeof banners.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/banners/:id',
      input: insertBannerSchema.partial(),
      responses: {
        200: z.custom<typeof banners.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/banners/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  faq: {
    list: {
      method: 'GET' as const,
      path: '/api/faq',
      responses: {
        200: z.array(z.custom<typeof faqItems.$inferSelect>()),
      },
    },
    visible: {
      method: 'GET' as const,
      path: '/api/faq/visible',
      responses: {
        200: z.array(z.custom<typeof faqItems.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/faq',
      input: insertFaqItemSchema,
      responses: {
        201: z.custom<typeof faqItems.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/faq/:id',
      input: insertFaqItemSchema.partial(),
      responses: {
        200: z.custom<typeof faqItems.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/faq/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  heroImages: {
    list: {
      method: 'GET' as const,
      path: '/api/hero-images',
      responses: {
        200: z.array(z.custom<typeof heroImages.$inferSelect>()),
      },
    },
    active: {
      method: 'GET' as const,
      path: '/api/hero-images/active',
      responses: {
        200: z.custom<typeof heroImages.$inferSelect>().nullable(),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/hero-images',
      input: insertHeroImageSchema,
      responses: {
        201: z.custom<typeof heroImages.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/hero-images/:id',
      input: insertHeroImageSchema.partial(),
      responses: {
        200: z.custom<typeof heroImages.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/hero-images/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    activate: {
      method: 'PUT' as const,
      path: '/api/hero-images/:id/activate',
      responses: {
        200: z.custom<typeof heroImages.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

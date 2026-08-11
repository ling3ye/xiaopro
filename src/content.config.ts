// src/content.config.ts — Astro 7 content layer API
import { defineCollection, z, reference } from 'astro:content';
import { glob } from 'astro/loaders';

// 1. Boards (开发板) — data/JSON
const boards = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/boards' }),
  schema: z.object({
    brand: z.string(),
    model: z.string(),
    specs: z.union([
      z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
      z.object({
        'zh-cn': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
        'zh-tw': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'en': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'ja': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'ko': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'es': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'de': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'fr': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'it': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      })
    ]).optional(),
    officialUrl: z.string().url().optional(),
    keywords: z.union([
      z.array(z.string()),
      z.object({
        'zh-cn': z.array(z.string()),
        'zh-tw': z.array(z.string()).optional(),
        'en': z.array(z.string()).optional(),
        'ja': z.array(z.string()).optional(),
        'ko': z.array(z.string()).optional(),
        'es': z.array(z.string()).optional(),
        'de': z.array(z.string()).optional(),
        'fr': z.array(z.string()).optional(),
        'it': z.array(z.string()).optional(),
      })
    ]).optional(),
    image: z.string().optional(),
  }),
});

// 2. Modules (外设模块) — data/JSON
const modules = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/modules' }),
  schema: z.object({
    brand: z.string().optional(),
    category: z.enum(['sensor', 'display', 'actuator', 'communication', 'power', 'audio', 'storage', 'lighting', 'other']),
    model: z.string(),
    specs: z.union([
      z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
      z.object({
        'zh-cn': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
        'zh-tw': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'en': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'ja': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'ko': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'es': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'de': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'fr': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'it': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      })
    ]).optional(),
    keywords: z.union([
      z.array(z.string()),
      z.object({
        'zh-cn': z.array(z.string()),
        'zh-tw': z.array(z.string()).optional(),
        'en': z.array(z.string()).optional(),
        'ja': z.array(z.string()).optional(),
        'ko': z.array(z.string()).optional(),
        'es': z.array(z.string()).optional(),
        'de': z.array(z.string()).optional(),
        'fr': z.array(z.string()).optional(),
        'it': z.array(z.string()).optional(),
      })
    ]).optional(),
    officialUrl: z.string().url().optional(),
    datasheet: z.string().url().optional(),
    image: z.string().optional(),
  }),
});

// 3. Experiments (基础实验) — content/Markdown
const experiments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/experiments' }),
  schema: z.object({
    title: z.string(),
    boardId: reference('boards'),
    moduleId: reference('modules'),
    moduleIds: z.array(reference('modules')).optional(),
    category: z.enum(['esp32', 'arduino', 'rp', 'stm32', 'other']).optional(),
    date: z.date().optional(),
    intro: z.string().optional(),
    image: z.string().optional(),
  }),
});

// 4. BoardDocs (开发板详细说明) — content/Markdown
const boardDocs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/boardDocs' }),
  schema: z.object({
    boardId: reference('boards'),
  }),
});

// 5. ModuleDocs (模块详细说明) — content/Markdown
const moduleDocs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/moduleDocs' }),
  schema: z.object({
    moduleId: reference('modules'),
  }),
});

// 6. Solutions (实战方案) — content/Markdown
const solutions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/solutions' }),
  schema: z.object({
    title: z.string(),
    boardId: reference('boards'),
    moduleIds: z.array(reference('modules')),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
    intro: z.string().optional(),
    image: z.string().optional(),
  }),
});

// 7. Printers (3D打印机) — data/JSON
const printers = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/printers' }),
  schema: z.object({
    brand: z.string(),
    model: z.string(),
    category: z.enum(['fdm', 'resin', 'sla']),
    specs: z.union([
      z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
      z.object({
        'zh-cn': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
        'zh-tw': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'en': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'ja': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'ko': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'es': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'de': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'fr': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'it': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      })
    ]).optional(),
    keywords: z.union([
      z.array(z.string()),
      z.object({
        'zh-cn': z.array(z.string()),
        'zh-tw': z.array(z.string()).optional(),
        'en': z.array(z.string()).optional(),
        'ja': z.array(z.string()).optional(),
        'ko': z.array(z.string()).optional(),
        'es': z.array(z.string()).optional(),
        'de': z.array(z.string()).optional(),
        'fr': z.array(z.string()).optional(),
        'it': z.array(z.string()).optional(),
      })
    ]).optional(),
    officialUrl: z.string().url().optional(),
    affiliateUrl: z.string().url().optional(),
    image: z.string().optional(),
    priceRange: z.string().optional(),
  }),
});

// 8. Filaments (3D打印耗材) — data/JSON
const specPropertyValue = z.object({
  value: z.union([z.number(), z.string(), z.boolean()]),
  value_zh: z.string().optional(),
  unit: z.string().optional(),
  standard: z.string().optional(),
  test_method: z.string().optional(),
  condition: z.string().optional(),
});

const filaments = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/filaments' }),
  schema: z.object({
    brand: z.string().optional(),
    model: z.string(),
    category: z.enum(['pla', 'petg', 'abs', 'tpu', 'nylon', 'pc', 'asa', 'other']),
    properties: z.record(z.string(), specPropertyValue).optional(),
    specs: z.union([
      z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
      z.object({
        'zh-cn': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
        'zh-tw': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'en': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'ja': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'ko': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'es': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'de': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'fr': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        'it': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      })
    ]).optional(),
    keywords: z.union([
      z.array(z.string()),
      z.object({
        'zh-cn': z.array(z.string()),
        'zh-tw': z.array(z.string()).optional(),
        'en': z.array(z.string()).optional(),
        'ja': z.array(z.string()).optional(),
        'ko': z.array(z.string()).optional(),
        'es': z.array(z.string()).optional(),
        'de': z.array(z.string()).optional(),
        'fr': z.array(z.string()).optional(),
        'it': z.array(z.string()).optional(),
      })
    ]).optional(),
    officialUrl: z.string().url().optional(),
    affiliateUrl: z.string().url().optional(),
    datasheet: z.string().url().optional(),
    image: z.string().optional(),
    priceRange: z.string().optional(),
  }),
});

// 9. Models (3D模型) — content/Markdown
const models = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/models' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.enum(['utility', 'electronics', 'home', 'toy', 'tool', 'other']).optional(),
    makerWorldUrl: z.string().url().optional(),
    images: z.array(z.string()).optional(),
    relatedSolutions: z.array(reference('solutions')).optional(),
    relatedPrinters: z.array(reference('printers')).optional(),
    relatedFilaments: z.array(reference('filaments')).optional(),
    printSettings: z.object({
      infill: z.string().optional(),
      supports: z.string().optional(),
      material: z.string().optional(),
      estimatedTime: z.string().optional(),
      layerHeight: z.string().optional(),
    }).optional(),
    date: z.date().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

// 10. Articles (博客文章) — content/Markdown
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    domain: z.enum(['ai', 'software', 'hardware', 'devops', 'life']),
    platforms: z.array(z.enum(['mac', 'windows', 'linux', 'web', 'cross-platform'])).optional(),
    format: z.enum(['tutorial', 'prompt-list', 'opinion', 'cheatsheet', 'news']).default('tutorial'),
    relatedBoards: z.array(reference('boards')).optional(),
    date: z.date(),
    intro: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  'boards': boards,
  'modules': modules,
  'boardDocs': boardDocs,
  'moduleDocs': moduleDocs,
  'experiments': experiments,
  'solutions': solutions,
  'printers': printers,
  'filaments': filaments,
  'models': models,
  'articles': articles,
};

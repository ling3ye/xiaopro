// src/content/config.ts
import { defineCollection, z, reference } from 'astro:content';

// 1. 定义 Boards (开发板) 集合
const boards = defineCollection({
  type: 'data', // 'data' 类型专门用于 JSON/YAML 文件
  schema: z.object({
    // 必填：品牌 (如 'Espressif', 'Arduino')
    brand: z.string(),
    // 必填：型号名称 (如 'ESP32-C3 DevKit')
    model: z.string(),
    // 选填：硬件参数字典 (键值对)
    // 使用 z.record 允许任意的 key，但 value 必须是 字符串、数字或布尔值
    specs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    // 选填：官方文档链接
    officialUrl: z.string().url().optional(),
    // 选填：关键词 (用于未来的 AI 搜索优化)
    keywords: z.array(z.string()).optional(),
    // 选填：缩略图 (相对于 public 目录的路径)
    image: z.string().optional(),
  }),
});

// 2. 定义 Modules (外设模块) 集合
const modules = defineCollection({
  type: 'data',
  schema: z.object({
    brand: z.string().optional(), // 品牌（可选）
    // 必填：分类 (枚举类型，强制规范分类)
    category: z.enum(['sensor', 'display', 'actuator', 'communication', 'power', 'other']),
    // 必填：型号 (如 'DHT11', 'SSD1306')
    model: z.string(),
    // 选填：别名 (如 ['温湿度传感器', 'Temperature Sensor'])
    alias: z.array(z.string()).optional(),
    // 选填：参数
    specs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    // 选填：官方文档链接
    officialUrl: z.string().url().optional(),
    // 选填：数据手册链接
    datasheet: z.string().url().optional(),
  }),
});

// 3. 定义 Experiments (基础实验 - 单对单)
const experiments = defineCollection({
  type: 'content', // Markdown/MDX 文件
  schema: z.object({
    title: z.string(),
    // ✨ 核心魔法：关联到 boards 集合
    boardId: reference('boards'),
    // ✨ 核心魔法：关联到 modules 集合
    moduleId: reference('modules'),
    // 必填：分类 (枚举类型，强制规范分类)
    category: z.enum(['esp32', 'arduino', 'rp', 'stm32', 'other']).optional(),

    date: z.date().optional(),
    intro: z.string().optional(),
    // 选填：缩略图 (相对于 public 目录的路径)
    image: z.string().optional(),
  }),
});

// 4. 定义 ModuleDocs (模块详细说明)
const moduleDocs = defineCollection({
  type: 'content', // Markdown/MDX 文件
  schema: z.object({
    moduleId: reference('modules'), // 关联到模块
  }),
});

// 5. 定义 Solutions (实战方案 - 一对多)
const solutions = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // 关联一个主控板
    boardId: reference('boards'),
    // ✨ 核心魔法：关联多个模块 (数组)
    moduleIds: z.array(reference('modules')),

    difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
    intro: z.string().optional(),
    // 选填：缩略图 (相对于 public 目录的路径)
    image: z.string().optional(),
  }),
});

// 6. 定义 Articles (博客文章) 集合 - 多维正交元数据法
const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // 维度1: 领域 domain (单选，决定物理路由)
    domain: z.enum(['ai', 'software', 'hardware', 'devops', 'life']),
    // 维度2: 平台 platforms (数组，可选，支持跨平台)
    platforms: z.array(z.enum(['mac', 'windows', 'linux', 'web', 'cross-platform'])).optional(),
    // 维度3: 体裁 format (单选，决定阅读预期)
    format: z.enum(['tutorial', 'prompt-list', 'opinion', 'cheatsheet', 'news']).default('tutorial'),
    // 维度4: 硬件关联 relatedBoards (数组，可选，打通软硬件生态)
    relatedBoards: z.array(reference('boards')).optional(),
    // 基础元数据
    date: z.date(),
    intro: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

// 7. 导出集合注册
export const collections = {
  'boards': boards,
  'modules': modules,
  'moduleDocs': moduleDocs,
  'experiments': experiments,
  'solutions': solutions,
  'articles': articles,
};
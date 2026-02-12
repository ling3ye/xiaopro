// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // 1. 填写 GitHub 提供的基础域名
  site: 'https://ling3ye.github.io', 
  
  // 2. 非常重要！填写你的仓库名作为子路径
  // 注意：前后都要加斜杠 /
  base: '/xiaopro', 
});
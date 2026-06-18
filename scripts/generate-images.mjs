// 重新生成站点品牌静态图（默认 OG 图 + Logo）
//
// 源文件：scripts/og-image.svg、scripts/logo.svg
// 输出：public/og-image.png、public/logo.png
//
// 为什么这么取 sharp：sharp 是 astro 的间接依赖（astro:assets 用），
// 不在顶层 dependencies 里，所以从 astro 的位置去 resolve 它。
//
// 运行：pnpm gen-images
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const astroPkg = require.resolve('astro/package.json');
const sharp = require(require.resolve('sharp', { paths: [astroPkg] }));

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

const jobs = [
  { src: here('./og-image.svg'), out: here('../public/og-image.png'), w: 1200, h: 630 },
  { src: here('./logo.svg'), out: here('../public/logo.png'), w: 512, h: 512 },
];

for (const { src, out, w, h } of jobs) {
  await sharp(readFileSync(src), { density: 144 })
    .resize(w, h, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`✓ ${out.replace(here('../'), '')}  ${meta.width}x${meta.height} ${meta.format}`);
}

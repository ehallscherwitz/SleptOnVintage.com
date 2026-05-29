/**
 * Convert HEIC files in Supabase Storage (images/products/{id}/) to WebP.
 *
 * Requires in .env.local:
 *   VITE_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run convert-heic                    # convert all (skips folders with no HEIC)
 *   npm run convert-heic -- --dry-run
 *   npm run convert-heic -- --from-id=138   # resume from product folder 138+
 *   npm run convert-heic -- --product-id=105
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import heicConvert from 'heic-convert';
import sharp from 'sharp';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket =
  process.env.VITE_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() ||
  process.env.SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() ||
  'images';

const dryRun = process.argv.includes('--dry-run');
const productIdArg = process.argv.find((a) => a.startsWith('--product-id='));
const fromIdArg = process.argv.find((a) => a.startsWith('--from-id='));
const onlyProductId = productIdArg ? productIdArg.split('=')[1]?.trim() : null;
const fromProductId = fromIdArg ? Number(fromIdArg.split('=')[1]) : null;

const IGNORED = new Set(['.emptyFolderPlaceholder', '.gitkeep']);
const RETRIES = 4;
const RETRY_MS = 2000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isHeic(name) {
  return /\.heic$/i.test(name);
}

function isWebp(name) {
  return /\.webp$/i.test(name);
}

function padName(index, total) {
  const width = Math.max(2, String(total).length);
  return `${String(index).padStart(width, '0')}.webp`;
}

async function withRetry(label, fn) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        /ECONNRESET|terminated|ETIMEDOUT|fetch failed|network|socket/i.test(msg) ||
        (err instanceof Error && err.cause && String(err.cause).includes('ECONNRESET'));
      if (!retryable || attempt === RETRIES) throw err;
      console.warn(`  retry ${attempt}/${RETRIES - 1} for ${label}: ${msg}`);
      await sleep(RETRY_MS * attempt);
    }
  }
  throw lastErr;
}

async function listProductFolders(client) {
  const { data, error } = await client.storage.from(bucket).list('products', {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw new Error(`List products/: ${error.message}`);
  return (data || [])
    .map((e) => e.name)
    .filter((name) => Boolean(name) && !IGNORED.has(name))
    .filter((name) => !onlyProductId || name === onlyProductId)
    .filter((name) => !fromProductId || Number(name) >= fromProductId);
}

async function listFolderFiles(client, productFolder) {
  const prefix = `products/${productFolder}`;
  const { data, error } = await withRetry(`list ${prefix}`, () =>
    client.storage.from(bucket).list(prefix, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    }),
  );
  if (error) throw new Error(`List ${prefix}: ${error.message}`);
  return (data || [])
    .filter((e) => Boolean(e?.name) && !IGNORED.has(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

async function downloadFile(client, path) {
  const { data, error } = await withRetry(`download ${path}`, () =>
    client.storage.from(bucket).download(path),
  );
  if (error) throw new Error(`Download ${path}: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function convertHeicToWebp(heicBuffer) {
  const jpegBuffer = await heicConvert({
    buffer: heicBuffer,
    format: 'JPEG',
    quality: 0.92,
  });
  return sharp(Buffer.from(jpegBuffer)).webp({ quality: 85 }).toBuffer();
}

async function uploadWebp(client, path, webpBuffer) {
  const { error } = await withRetry(`upload ${path}`, () =>
    client.storage.from(bucket).upload(path, webpBuffer, {
      contentType: 'image/webp',
      upsert: true,
    }),
  );
  if (error) throw new Error(`Upload ${path}: ${error.message}`);
}

async function deleteFile(client, path) {
  const { error } = await withRetry(`delete ${path}`, () =>
    client.storage.from(bucket).remove([path]),
  );
  if (error) throw new Error(`Delete ${path}: ${error.message}`);
}

async function syncPrimaryImage(client, productId, primaryPath) {
  const { error } = await withRetry(`sync products.image ${productId}`, () =>
    client
      .from('products')
      .update({ image: primaryPath, updated_at: new Date().toISOString() })
      .eq('id', Number(productId)),
  );
  if (error) throw new Error(`Update products.image for ${productId}: ${error.message}`);
}

async function fileExists(client, path) {
  const slash = path.lastIndexOf('/');
  const prefix = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 100 });
  if (error) return false;
  return (data || []).some((e) => e.name === name);
}

async function processFolder(client, productFolder) {
  const files = await listFolderFiles(client, productFolder);
  const heicFiles = files.filter(isHeic);
  const webpCount = files.filter(isWebp).length;

  if (heicFiles.length === 0) {
    return { productFolder, converted: 0, skipped: true };
  }

  const prefix = `products/${productFolder}`;
  const totalImages = webpCount + heicFiles.length;
  console.log(`\n${prefix}: ${heicFiles.length} HEIC remaining (${webpCount} webp already)`);

  let converted = 0;
  for (let i = 0; i < heicFiles.length; i++) {
    const heicName = heicFiles[i];
    const outName = padName(webpCount + i + 1, totalImages);
    const heicPath = `${prefix}/${heicName}`;
    const webpPath = `${prefix}/${outName}`;

    if (!dryRun && (await fileExists(client, webpPath))) {
      console.log(`  skip ${heicName} (${outName} exists) — removing HEIC`);
      await deleteFile(client, heicPath);
      converted += 1;
      continue;
    }

    console.log(`  ${heicName} → ${outName}`);
    if (dryRun) {
      converted += 1;
      continue;
    }

    const heicBuffer = await downloadFile(client, heicPath);
    const webpBuffer = await convertHeicToWebp(heicBuffer);
    await uploadWebp(client, webpPath, webpBuffer);
    await deleteFile(client, heicPath);
    converted += 1;
    await sleep(150);
  }

  if (!dryRun) {
    const primaryPath = `${prefix}/${padName(1, totalImages)}`;
    await syncPrimaryImage(client, productFolder, primaryPath);
  }

  return { productFolder, converted, skipped: false };
}

async function main() {
  if (!url || !serviceKey) {
    console.error('Missing VITE_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const folders = await listProductFolders(client);
  if (folders.length === 0) {
    console.log('No product folders found under products/.');
    return;
  }

  console.log(
    `${dryRun ? '[DRY RUN] ' : ''}Scanning ${folders.length} product folder(s) in bucket "${bucket}"…` +
      (fromProductId ? ` (from id ${fromProductId})` : ''),
  );

  let totalConverted = 0;
  let foldersTouched = 0;
  let foldersSkipped = 0;

  for (const folder of folders) {
    try {
      const result = await processFolder(client, folder);
      if (result.skipped) {
        foldersSkipped += 1;
      } else {
        foldersTouched += 1;
        totalConverted += result.converted;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\nFailed on products/${folder}: ${msg}`);
      console.error('Re-run with: npm run convert-heic -- --from-id=' + folder);
      process.exit(1);
    }
  }

  console.log(
    `\nDone. ${dryRun ? 'Would convert' : 'Converted'} ${totalConverted} file(s) across ${foldersTouched} folder(s).` +
      ` Skipped ${foldersSkipped} folder(s) with no HEIC left.`,
  );
  if (!dryRun && totalConverted > 0) {
    console.log('Primary image + updated_at set per product. Hard-refresh the shop to see thumbnails.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

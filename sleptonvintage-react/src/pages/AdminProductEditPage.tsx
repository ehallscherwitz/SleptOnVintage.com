import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { PageHeadingRow } from '../components/PageHeadingRow';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import {
  getPrimaryProductImageUrl,
  invalidateListingThumbnailCacheForProduct,
  listProductGalleryFiles,
  type Product,
  type ProductGalleryFile,
} from '../services/productService';
import AdminImageCropModal from '../components/AdminImageCropModal';
import { isAdminEmail } from '../utils/adminAccess';
import { fetchUrlAsBase64, storageFileNameForContentType } from '../utils/imageBytes';
import { rotateImageBase64, type RotateDegrees } from '../utils/rotateImage';

type CropSession = { fileName: string; contentType: string; dataBase64: string };

type GalleryFile = ProductGalleryFile;

const CATEGORIES: Product['category'][] = ['shirts', 'sweaters', 'hoodies', 'jackets', 'pants', 'shorts'];

function nextImageFileName(existing: string[], uploadName: string): string {
  const extMatch = uploadName.match(/(\.[a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '.webp';
  let max = 0;
  for (const n of existing) {
    const m = n.match(/^(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${String(max + 1).padStart(2, '0')}${ext}`;
}

const AdminProductEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const productId = id ? parseInt(id, 10) : NaN;

  const [product, setProduct] = useState<Product | null>(null);
  const [storageObjectPrefix, setStorageObjectPrefix] = useState('');
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [category, setCategory] = useState<Product['category']>('shirts');
  const [available, setAvailable] = useState(true);
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [legacyPreviewUrls, setLegacyPreviewUrls] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const [imageCacheBust, setImageCacheBust] = useState<Record<string, number>>({});
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const [giveawayDuration, setGiveawayDuration] = useState(24 * 60 * 60);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const alertsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((msg || err) && alertsRef.current) {
      alertsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [msg, err]);

  const loadImages = useCallback(async (row: Product) => {
    if (!Number.isFinite(productId)) return;

    const { files: fromAdmin, error: adminErr } = await adminService.listProductImages(productId);
    if (!adminErr && fromAdmin.length > 0) {
      setFiles(fromAdmin);
      setLegacyPreviewUrls([]);
      setOrderDirty(false);
      return;
    }

    const fromStorage = await listProductGalleryFiles(row);
    if (fromStorage.length > 0) {
      setFiles(fromStorage);
      setLegacyPreviewUrls([]);
      setOrderDirty(false);
      if (adminErr) {
        setErr(
          `${adminErr} — showing photos from Storage directly. Crop/rotate still work; redeploy the site if edits fail to save.`
        );
      }
      return;
    }

    if (adminErr) setErr(adminErr);
    setFiles([]);
    const primary = getPrimaryProductImageUrl(row);
    const legacyOnly =
      primary && !(row.image || '').trim().startsWith('products/') && !(row.image || '').trim().startsWith('items/');
    setLegacyPreviewUrls(legacyOnly ? [primary] : []);
  }, [productId]);

  const loadProduct = useCallback(async () => {
    if (!Number.isFinite(productId)) {
      setErr('Invalid product id');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    const { product: p, storageObjectPrefix: pref, error: e } = await adminService.getAdminProduct(productId);
    if (e || !p) {
      setErr(e || 'Not found');
      setProduct(null);
      setLoading(false);
      return;
    }
    const row = p as Product;
    setProduct(row);
    setStorageObjectPrefix(pref || '');
    setName(row.name);
    setSize(row.size);
    setPriceDollars((row.price / 100).toFixed(2));
    setCategory(row.category);
    setAvailable(row.available);
    await loadImages(row);
    setLoading(false);
  }, [productId, loadImages]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdminEmail(user.email)) return;
    void loadProduct();
  }, [authLoading, user, loadProduct]);

  const saveDetails = async () => {
    if (!product) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const price = Math.round(parseFloat(priceDollars) * 100);
      if (!Number.isFinite(price) || price < 0) {
        setErr('Invalid price');
        return;
      }
      const { product: updated, error: e } = await adminService.updateProduct({
        id: product.id,
        name,
        size,
        priceCents: price,
        category,
        available,
      });
      if (e) {
        setErr(e);
      } else {
        setMsg('Saved listing details.');
        const u = updated as Product;
        setProduct(u);
        setStorageObjectPrefix(`products/${(u.storage_prefix || '').trim() || String(u.id)}`);
        void loadImages(u);
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveOrder = async () => {
    if (!Number.isFinite(productId)) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const { error: e } = await adminService.reorderProductImages(
        productId,
        files.map((f) => f.name)
      );
      if (e) setErr(e);
      else {
        setMsg('Photo order saved (files renamed 01, 02, …).');
        if (product) void loadImages(product);
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Reorder failed');
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.files?.[0];
    e.target.value = '';
    if (!input || !Number.isFinite(productId)) return;
    const fileName = nextImageFileName(
      files.map((f) => f.name),
      input.name
    );
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        const res = String(reader.result || '');
        const base64 = res.includes(',') ? res.split(',')[1] : res;
        setSaving(true);
        setErr(null);
        try {
          const { error: upErr } = await adminService.uploadProductImageBase64({
            productId,
            fileName,
            contentType: input.type || 'application/octet-stream',
            dataBase64: base64,
          });
          if (upErr) setErr(upErr);
          else {
            setMsg(`Uploaded ${fileName}`);
            if (product) void loadImages(product);
          }
        } catch (ex) {
          setErr(ex instanceof Error ? ex.message : 'Upload failed');
        } finally {
          setSaving(false);
        }
      })();
    };
    reader.readAsDataURL(input);
  };

  const imageSrc = (publicUrl: string, fileName: string) => {
    const v = imageCacheBust[fileName];
    if (!v) return publicUrl;
    const sep = publicUrl.includes('?') ? '&' : '?';
    return `${publicUrl}${sep}v=${v}`;
  };

  const bumpImageCache = (fileName: string) => {
    setImageCacheBust((prev) => ({ ...prev, [fileName]: Date.now() }));
  };

  const loadImageBytesForEdit = async (
    fileName: string
  ): Promise<{ contentType: string; dataBase64: string } | { error: string }> => {
    const entry = files.find((f) => f.name === fileName);
    if (entry) {
      try {
        return await fetchUrlAsBase64(imageSrc(entry.publicUrl, fileName));
      } catch (ex) {
        return { error: ex instanceof Error ? ex.message : 'Could not load image' };
      }
    }
    const { contentType, dataBase64, error: dlErr } = await adminService.downloadProductImage(productId, fileName);
    if (dlErr || !dataBase64) return { error: dlErr || 'Could not load image' };
    return { contentType: contentType || 'image/jpeg', dataBase64 };
  };

  const uploadImageBytes = async (fileName: string, contentType: string, dataBase64: string, successMsg: string) => {
    const { fileName: uploadName, replaceFileName } = storageFileNameForContentType(fileName, contentType);
    const { error: upErr, path, product: uploadedProduct } = await adminService.uploadProductImageBase64({
      productId,
      fileName: uploadName,
      contentType,
      dataBase64,
      replaceFileName,
    });
    if (upErr) {
      setErr(upErr);
      return false;
    }
    setMsg(path ? `${successMsg} (saved to ${path})` : successMsg);
    bumpImageCache(uploadName);
    if (replaceFileName) bumpImageCache(replaceFileName);
    invalidateListingThumbnailCacheForProduct(productId);
    const row = (uploadedProduct ?? null) as Product | null;
    if (row?.id) {
      setProduct(row);
      setStorageObjectPrefix(`products/${(row.storage_prefix || '').trim() || String(row.id)}`);
      await loadImages(row);
    } else {
      const { product: refreshed, error: refreshErr } = await adminService.getAdminProduct(productId);
      if (refreshErr) setErr(refreshErr);
      else if (refreshed) {
        const fallback = refreshed as Product;
        setProduct(fallback);
        setStorageObjectPrefix(`products/${(fallback.storage_prefix || '').trim() || String(fallback.id)}`);
        await loadImages(fallback);
      }
    }
    return true;
  };

  const openCrop = async (fileName: string) => {
    if (!Number.isFinite(productId)) return;
    setSaving(true);
    setErr(null);
    try {
      const loaded = await loadImageBytesForEdit(fileName);
      if ('error' in loaded) {
        setErr(loaded.error);
        return;
      }
      setCropSession({
        fileName,
        contentType: loaded.contentType,
        dataBase64: loaded.dataBase64,
      });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not open crop tool');
    } finally {
      setSaving(false);
    }
  };

  const applyCrop = async (result: { base64: string; contentType: string }) => {
    if (!cropSession) return;
    setSaving(true);
    setErr(null);
    try {
      const ok = await uploadImageBytes(
        cropSession.fileName,
        result.contentType,
        result.base64,
        `Cropped ${cropSession.fileName}`
      );
      if (ok) setCropSession(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Crop failed');
    } finally {
      setSaving(false);
    }
  };

  const rotatePhoto = async (fileName: string, degrees: RotateDegrees) => {
    if (!Number.isFinite(productId)) return;
    setSaving(true);
    setErr(null);
    try {
      const loaded = await loadImageBytesForEdit(fileName);
      if ('error' in loaded) {
        setErr(loaded.error);
        return;
      }
      const { base64, contentType: outType } = await rotateImageBase64(
        loaded.dataBase64,
        loaded.contentType,
        degrees,
        fileName
      );
      const ok = await uploadImageBytes(fileName, outType, base64, `Rotated ${fileName}`);
      if (!ok) setErr((prev) => prev || 'Rotate did not save to Storage. Check the error above and redeploy the site API.');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Rotate failed');
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async (fileName: string) => {
    if (!window.confirm(`Delete ${fileName} from Storage?`)) return;
    setSaving(true);
    setErr(null);
    try {
      const { error: e } = await adminService.deleteProductImage(productId, fileName);
      if (e) setErr(e);
      else {
        setMsg(`Deleted ${fileName}`);
        if (product) void loadImages(product);
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = async () => {
    if (!product) return;
    const ok = window.confirm(
      `Permanently delete product #${product.id}?\n\nStorage images will be removed. Cart lines for this item will be removed.\n\nIf this item was ever sold, delete will be blocked.`
    );
    if (!ok) return;
    setSaving(true);
    setErr(null);
    try {
      const { error: e } = await adminService.deleteProductListing(product.id);
      if (e) setErr(e);
      else navigate('/admin/products');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const createGiveaway = async () => {
    if (!Number.isFinite(productId)) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const { error: e } = await adminService.createGiveaway({
        productId,
        durationSeconds: giveawayDuration,
      });
      if (e) setErr(e);
      else setMsg('Giveaway created. View it at /giveaway.');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Create giveaway failed');
    } finally {
      setSaving(false);
    }
  };

  const moveInGallery = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= files.length || to >= files.length) return;
    const next = [...files];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    setFiles(next);
    setOrderDirty(true);
  };

  const onDragStart = (e: React.DragEvent, i: number) => {
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(i));
    } catch {
      /* Safari may throw for custom data in some cases */
    }
    setDragIdx(i);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDrop = (to: number) => {
    if (dragIdx === null) return;
    moveInGallery(dragIdx, to);
    setDragIdx(null);
  };
  const onDragEnd = () => setDragIdx(null);

  if (authLoading) {
    return (
      <div className="admin-page">
        <Header />
        <p className="admin-inner admin-muted">Loading…</p>
      </div>
    );
  }

  if (!user || !isAdminEmail(user.email)) {
    return (
      <div className="admin-page">
        <Header />
        <div className="admin-inner">
          <p className="admin-muted">Access denied.</p>
          <Link to="/">Home</Link>
        </div>
      </div>
    );
  }

  if (loading && !product) {
    return (
      <div className="admin-page">
        <Header />
        <PageHeadingRow title="Edit listing" fallbackTo="/admin/products" />
        <p className="admin-inner admin-muted">Loading product…</p>
      </div>
    );
  }

  if (err && !product) {
    return (
      <div className="admin-page">
        <Header />
        <PageHeadingRow title="Edit listing" fallbackTo="/admin/products" />
        <div className="admin-inner">
          <div className="checkout-alert checkout-alert--error">{err}</div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="admin-page">
      <Header />
      {cropSession && (
        <AdminImageCropModal
          fileName={cropSession.fileName}
          dataBase64={cropSession.dataBase64}
          contentType={cropSession.contentType}
          busy={saving}
          onCancel={() => {
            if (!saving) setCropSession(null);
          }}
          onApply={applyCrop}
        />
      )}
      <PageHeadingRow title="Edit listing" fallbackTo="/admin/products" />
      <div className="admin-inner admin-product-edit">
        <div className="admin-page-head">
          <p className="admin-sub admin-sub--flush">
            Storage prefix: <code className="admin-code">{storageObjectPrefix}</code> · Bucket <code className="admin-code">images</code>
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to={`/product/${product.id}`} className="admin-btn-secondary" style={{ textDecoration: 'none' }}>
              View on site
            </Link>
          </div>
        </div>

        <div ref={alertsRef} className="admin-product-edit-alerts">
          {msg && <div className="checkout-alert checkout-alert--info">{msg}</div>}
          {err && <div className="checkout-alert checkout-alert--error">{err}</div>}
        </div>

        <section className="admin-product-section">
          <h2 className="admin-product-section-title">Details</h2>
          <form
            className="admin-product-form"
            onSubmit={(e) => {
              e.preventDefault();
              void saveDetails();
            }}
          >
            <label className="admin-label">Name</label>
            <input className="checkout-input" value={name} onChange={(e) => setName(e.target.value)} />

            <label className="admin-label">Size</label>
            <input className="checkout-input" value={size} onChange={(e) => setSize(e.target.value)} />

            <label className="admin-label">Price (USD)</label>
            <input className="checkout-input" type="number" step="0.01" min={0} value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} />

            <label className="admin-label">Category</label>
            <select className="checkout-input" value={category} onChange={(e) => setCategory(e.target.value as Product['category'])}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label className="admin-label">
              <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /> Available for sale
            </label>

            <button type="submit" className="checkout-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save details'}
            </button>
          </form>
        </section>

        <section className="admin-product-section">
          <h2 className="admin-product-section-title">Giveaway</h2>
          <p className="admin-hint">
            Creates a timed giveaway for this listing and hides it from category pages until the giveaway resolves.
            After the timer ends, the wheel will spin publicly and the winner will automatically receive a $0 order.
          </p>
          <div className="admin-product-upload-row" style={{ alignItems: 'center' }}>
            <label className="admin-label" style={{ margin: 0 }}>
              Duration
            </label>
            <select
              className="checkout-input"
              value={giveawayDuration}
              disabled={saving}
              onChange={(e) => setGiveawayDuration(parseInt(e.target.value, 10))}
              style={{ maxWidth: 240 }}
            >
              <option value={60 * 60}>1 hour</option>
              <option value={3 * 60 * 60}>3 hours</option>
              <option value={6 * 60 * 60}>6 hours</option>
              <option value={12 * 60 * 60}>12 hours</option>
              <option value={24 * 60 * 60}>24 hours</option>
              <option value={3 * 24 * 60 * 60}>3 days</option>
              <option value={7 * 24 * 60 * 60}>1 week</option>
            </select>
            <button type="button" className="checkout-btn-primary" disabled={saving} onClick={() => void createGiveaway()}>
              {saving ? 'Creating…' : 'Create giveaway'}
            </button>
            <Link to="/giveaway" className="admin-btn-secondary" style={{ textDecoration: 'none' }}>
              Open giveaway page
            </Link>
          </div>
        </section>

        <section className="admin-product-section">
          <h2 className="admin-product-section-title">Photos</h2>
          <p className="admin-hint">
            Reorder photos in the list below (drag a tile by its edges, or use ↑ ↓ on each tile), then click &quot;Save photo order&quot;. Use Crop, ↺, or ↻ to
            crop (1:1 square) or rotate a photo in place. First image becomes the storefront thumbnail. Max ~4&nbsp;MB per upload.
          </p>
          <div className="admin-product-upload-row">
            <label className="checkout-btn-secondary" style={{ cursor: saving ? 'not-allowed' : 'pointer' }}>
              Upload image
              <input type="file" accept="image/*" hidden disabled={saving} onChange={(e) => void onUpload(e)} />
            </label>
            <button type="button" className="checkout-btn-primary" disabled={saving || !orderDirty} onClick={() => void saveOrder()}>
              Save photo order
            </button>
          </div>

          {files.length > 0 ? (
            <div className="admin-product-gallery">
              {files.map((f, i) => (
                <div
                  key={f.path}
                  className="admin-product-tile"
                  draggable
                  onDragStart={(e) => onDragStart(e, i)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(i)}
                  onDragEnd={onDragEnd}
                >
                  <div className="admin-product-tile-reorder">
                    <button
                      type="button"
                      className="admin-product-tile-move"
                      disabled={saving || i === 0}
                      aria-label="Move photo earlier in order"
                      onClick={() => moveInGallery(i, i - 1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="admin-product-tile-move"
                      disabled={saving || i === files.length - 1}
                      aria-label="Move photo later in order"
                      onClick={() => moveInGallery(i, i + 1)}
                    >
                      ↓
                    </button>
                  </div>
                  <img
                    src={imageSrc(f.publicUrl, f.name)}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    className="admin-product-tile-img"
                  />
                  <div className="admin-product-tile-tools">
                    <button
                      type="button"
                      className="admin-product-tile-move"
                      disabled={saving || !!cropSession}
                      aria-label="Crop photo to square"
                      title="Crop (1:1)"
                      onClick={() => void openCrop(f.name)}
                    >
                      Crop
                    </button>
                    <button
                      type="button"
                      className="admin-product-tile-move"
                      disabled={saving || !!cropSession}
                      aria-label="Rotate photo 90 degrees counter-clockwise"
                      title="Rotate left"
                      onClick={() => void rotatePhoto(f.name, -90)}
                    >
                      ↺
                    </button>
                    <button
                      type="button"
                      className="admin-product-tile-move"
                      disabled={saving || !!cropSession}
                      aria-label="Rotate photo 90 degrees clockwise"
                      title="Rotate right"
                      onClick={() => void rotatePhoto(f.name, 90)}
                    >
                      ↻
                    </button>
                  </div>
                  <div className="admin-product-tile-meta">{f.name}</div>
                  <button type="button" className="admin-btn-small admin-btn-danger" disabled={saving} onClick={() => void removePhoto(f.name)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : legacyPreviewUrls.length > 0 ? (
            <>
              <p className="admin-hint">
                This listing uses a legacy image URL (not files in Storage). Upload new photos above to move it into{' '}
                <code className="admin-code">images/products/{product.id}/</code> and enable crop, rotate, and reorder here.
              </p>
              <div className="admin-product-gallery">
                {legacyPreviewUrls.map((url, i) => (
                  <div key={`${i}-${url}`} className="admin-product-tile admin-product-tile--static">
                    <img src={url} alt="" loading="lazy" />
                    <div className="admin-product-tile-meta">Legacy image</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="admin-muted">No images in this folder yet. Upload to add photos.</p>
          )}
        </section>

        <section className="admin-product-section admin-product-danger-zone">
          <h2 className="admin-product-section-title">Danger zone</h2>
          <button type="button" className="admin-btn-danger-solid" disabled={saving} onClick={() => void deleteListing()}>
            Delete this listing
          </button>
        </section>
      </div>
    </div>
  );
};

export default AdminProductEditPage;

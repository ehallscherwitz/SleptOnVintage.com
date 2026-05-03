import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import {
  getPrimaryProductImageUrl,
  resolveProductImageUrls,
  type Product,
} from '../services/productService';
import { isAdminEmail } from '../utils/adminAccess';

type GalleryFile = { name: string; path: string; publicUrl: string };

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
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);

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

  const loadImages = useCallback(async () => {
    if (!Number.isFinite(productId)) return;
    const { files: list, error: e } = await adminService.listProductImages(productId);
    if (e) setErr(e);
    else {
      setFiles(list);
      setOrderDirty(false);
    }
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
    const previews = await resolveProductImageUrls(row, getPrimaryProductImageUrl(row));
    setPreviewUrls(previews);
    await loadImages();
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
        const previews = await resolveProductImageUrls(u, getPrimaryProductImageUrl(u));
        setPreviewUrls(previews);
        void loadImages();
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
        void loadImages();
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
            void loadImages();
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

  const removePhoto = async (fileName: string) => {
    if (!window.confirm(`Delete ${fileName} from Storage?`)) return;
    setSaving(true);
    setErr(null);
    try {
      const { error: e } = await adminService.deleteProductImage(productId, fileName);
      if (e) setErr(e);
      else {
        setMsg(`Deleted ${fileName}`);
        void loadImages();
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
        <p className="admin-inner admin-muted">Loading product…</p>
      </div>
    );
  }

  if (err && !product) {
    return (
      <div className="admin-page">
        <Header />
        <div className="admin-inner">
          <div className="checkout-alert checkout-alert--error">{err}</div>
          <Link to="/admin/products" className="checkout-link">
            ← All listings
          </Link>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="admin-page">
      <Header />
      <div className="admin-inner admin-product-edit">
        <div className="admin-page-head">
          <div>
            <h1 className="admin-title">Edit listing</h1>
            <p className="admin-sub">
              Storage prefix: <code className="admin-code">{storageObjectPrefix}</code> · Bucket <code className="admin-code">images</code>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/admin/products" className="admin-btn-secondary" style={{ textDecoration: 'none' }}>
              All listings
            </Link>
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
          <h2 className="admin-product-section-title">Photos</h2>
          <p className="admin-hint">
            Reorder photos in the list below (drag a tile by its edges, or use ↑ ↓ on each tile), then click &quot;Save photo order&quot;. First image becomes the
            storefront thumbnail. Max ~4&nbsp;MB per upload.
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
                  <img src={f.publicUrl} alt="" loading="lazy" draggable={false} className="admin-product-tile-img" />
                  <div className="admin-product-tile-meta">{f.name}</div>
                  <button type="button" className="admin-btn-small admin-btn-danger" disabled={saving} onClick={() => void removePhoto(f.name)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : previewUrls.length > 0 ? (
            <>
              <p className="admin-hint">
                No image files in the Storage folder for this listing yet. The site is still showing these (from Storage or the primary image field). Upload
                images above to manage them here.
              </p>
              <div className="admin-product-gallery">
                {previewUrls.map((url, i) => (
                  <div key={`${i}-${url}`} className="admin-product-tile admin-product-tile--static">
                    <img src={url} alt="" loading="lazy" />
                    <div className="admin-product-tile-meta">Preview {i + 1}</div>
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

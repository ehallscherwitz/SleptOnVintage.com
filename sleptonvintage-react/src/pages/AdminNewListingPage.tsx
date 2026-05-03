import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import { type Product } from '../services/productService';
import { isAdminEmail } from '../utils/adminAccess';

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

const AdminNewListingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [category, setCategory] = useState<Product['category']>('shirts');
  const [available, setAvailable] = useState(true);
  const [legacyImageUrl, setLegacyImageUrl] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (list.length === 0) return;
    setPendingFiles((prev) => [...prev, ...list]);
  };

  const removePending = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    setErr(null);
    const price = Math.round(parseFloat(priceDollars) * 100);
    if (!name.trim()) {
      setErr('Name is required.');
      return;
    }
    if (!size.trim()) {
      setErr('Size is required.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setErr('Enter a valid price (USD).');
      return;
    }

    setSubmitting(true);
    try {
      const imageTrim = legacyImageUrl.trim();
      const { product, error: createErr } = await adminService.createProduct({
        name: name.trim(),
        size: size.trim(),
        priceCents: price,
        category,
        available,
        image: imageTrim ? imageTrim : null,
      });
      if (createErr || !product) {
        setErr(createErr || 'Create failed');
        return;
      }
      const row = product as { id: number };
      const productId = row.id;

      const uploadedNames: string[] = [];
      for (const file of pendingFiles) {
        const fileName = nextImageFileName(uploadedNames, file.name);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Could not read file'));
          reader.readAsDataURL(file);
        });
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const { error: upErr } = await adminService.uploadProductImageBase64({
          productId,
          fileName,
          contentType: file.type || 'application/octet-stream',
          dataBase64: base64,
        });
        if (upErr) {
          window.alert(`Listing #${productId} was created, but a photo failed to upload: ${upErr}`);
          navigate(`/admin/products/${productId}`);
          return;
        }
        uploadedNames.push(fileName);
      }

      navigate(`/admin/products/${productId}`);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <div className="admin-page">
      <Header />
      <div className="admin-inner admin-product-edit">
        <div className="admin-page-head">
          <div>
            <h1 className="admin-title">Upload new listing</h1>
            <p className="admin-sub">Create a product, then optionally add photos. Images go to Storage under <code className="admin-code">products/&lt;id&gt;/</code>.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/admin/products" className="admin-btn-secondary" style={{ textDecoration: 'none' }}>
              All listings
            </Link>
          </div>
        </div>

        {err && <div className="checkout-alert checkout-alert--error">{err}</div>}

        <section className="admin-product-section">
          <h2 className="admin-product-section-title">Details</h2>
          <form
            className="admin-product-form"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="admin-label">Name</label>
            <input className="checkout-input" value={name} onChange={(e) => setName(e.target.value)} required />

            <label className="admin-label">Size</label>
            <input className="checkout-input" value={size} onChange={(e) => setSize(e.target.value)} required />

            <label className="admin-label">Price (USD)</label>
            <input
              className="checkout-input"
              type="number"
              step="0.01"
              min={0}
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              required
            />

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

            <label className="admin-label">Primary image URL (optional)</label>
            <input
              className="checkout-input"
              type="url"
              value={legacyImageUrl}
              onChange={(e) => setLegacyImageUrl(e.target.value)}
              placeholder="https://… or leave blank if you upload files below"
            />
            <p className="admin-hint">Leave blank and upload files to use Storage only. Max ~4&nbsp;MB per file.</p>

            <label className="admin-label">Photos to upload (optional)</label>
            <div className="admin-product-upload-row">
              <label className="checkout-btn-secondary" style={{ cursor: submitting ? 'not-allowed' : 'pointer' }}>
                Choose files
                <input type="file" accept="image/*" multiple hidden disabled={submitting} onChange={(e) => onPickFiles(e)} />
              </label>
            </div>
            {pendingFiles.length > 0 && (
              <ul className="admin-new-listing-file-list">
                {pendingFiles.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    <span>{f.name}</span>
                    <button type="button" className="admin-btn-small" disabled={submitting} onClick={() => removePending(i)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button type="submit" className="checkout-btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create listing'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default AdminNewListingPage;

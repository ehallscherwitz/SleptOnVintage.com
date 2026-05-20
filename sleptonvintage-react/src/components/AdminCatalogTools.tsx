import React, { useState } from 'react';
import { adminService } from '../services/adminService';

type AdminCatalogToolsProps = {
  disabled?: boolean;
};

/** Set primary images from Storage + full Pinterest catalog sync. */
export const AdminCatalogTools: React.FC<AdminCatalogToolsProps> = ({ disabled = false }) => {
  const [settingPrimaryImages, setSettingPrimaryImages] = useState(false);
  const [primaryImagesResult, setPrimaryImagesResult] = useState<string | null>(null);
  const [syncingPinterest, setSyncingPinterest] = useState(false);
  const [pinterestSyncResult, setPinterestSyncResult] = useState<string | null>(null);

  const setPrimaryImagesFromStorage = async () => {
    const overwrite = window.confirm(
      'Overwrite ALL existing products.image values?\n\nOK = overwrite existing images (recommended if you want to switch everything to Storage paths).\nCancel = only fill missing images.',
    );

    const ok = window.confirm(
      `Set primary listing images from Storage?\n\nThis will scan images/products/{id}/ and pick the earliest uploaded file.\n\nMode: ${overwrite ? 'OVERWRITE existing products.image' : 'ONLY fill missing products.image'}`,
    );
    if (!ok) return;

    setSettingPrimaryImages(true);
    setPrimaryImagesResult(null);
    const { data, error } = await adminService.setPrimaryImages({ overwrite, limit: 2000 });
    setSettingPrimaryImages(false);
    if (error) {
      setPrimaryImagesResult(`Error: ${error}`);
      return;
    }
    setPrimaryImagesResult(
      `Scanned ${data?.scanned ?? 0} products · Updated ${data?.updated ?? 0} · Skipped ${data?.skipped ?? 0} · Missing ${data?.missing ?? 0}`,
    );
  };

  const syncPinterestCatalog = async () => {
    const ok = window.confirm(
      'Push all listings to Pinterest now?\n\nRequires PINTEREST_ACCESS_TOKEN on the server (use PINTEREST_USE_SANDBOX=true for sandbox). Edits usually sync automatically; use this for the first import or a full refresh.',
    );
    if (!ok) return;

    setSyncingPinterest(true);
    setPinterestSyncResult(null);
    const { data, error } = await adminService.syncPinterestCatalog();
    setSyncingPinterest(false);
    if (error) {
      setPinterestSyncResult(`Error: ${error}`);
      return;
    }
    const errs = data?.errors?.length ? ` · Errors: ${data.errors.join('; ')}` : '';
    setPinterestSyncResult(
      `Pinterest: synced ${data?.synced ?? 0} · skipped ${data?.skipped ?? 0} (no image)${errs}`,
    );
  };

  return (
    <>
      <div
        style={{
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 12,
          padding: 14,
          marginBottom: 14,
          background: 'rgba(0,0,0,0.22)',
        }}
      >
        <div style={{ fontWeight: 700, color: 'white', marginBottom: 4 }}>Catalog tools</div>
        <p className="admin-muted" style={{ margin: '0 0 12px' }}>
          Storage primary images · Pinterest sync on save (server token required).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280 }}>
          <button
            type="button"
            className="checkout-btn-primary"
            onClick={() => void setPrimaryImagesFromStorage()}
            disabled={settingPrimaryImages || disabled}
            style={{ width: '100%' }}
          >
            {settingPrimaryImages ? 'Setting images…' : 'Set primary images'}
          </button>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => void syncPinterestCatalog()}
            disabled={syncingPinterest || disabled}
            style={{ width: '100%' }}
          >
            {syncingPinterest ? 'Syncing Pinterest…' : 'Sync all to Pinterest'}
          </button>
        </div>
      </div>

      {pinterestSyncResult && (
        <div className="checkout-alert checkout-alert--info" style={{ marginBottom: 14 }}>
          {pinterestSyncResult}
        </div>
      )}

      {primaryImagesResult && (
        <div className="checkout-alert checkout-alert--info" style={{ marginBottom: 14 }}>
          {primaryImagesResult}
        </div>
      )}
    </>
  );
};

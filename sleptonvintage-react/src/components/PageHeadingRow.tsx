import { useLocation, useNavigate } from 'react-router-dom';

export function PageHeadingRow({ title, fallbackTo = '/' }: { title: string; fallbackTo?: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  const canGoBack = Boolean((location.key as unknown as string) && location.key !== 'default');

  return (
    <div className="page-head">
      <button
        type="button"
        className="page-back-btn"
        aria-label="Go back"
        onClick={() => (canGoBack ? navigate(-1) : navigate(fallbackTo))}
      >
        <i className="fa-solid fa-arrow-left" aria-hidden />
      </button>
      <span className="page-head-title">{title}</span>
      <span className="page-head-spacer" aria-hidden />
    </div>
  );
}


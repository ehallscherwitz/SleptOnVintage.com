import React, { useEffect, useId, useRef, useState } from 'react';
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from '../constants/legal';

type ContactButtonProps = {
  className?: string;
};

const ContactButton: React.FC<ContactButtonProps> = ({ className = '' }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`site-footer-contact ${className}`.trim()}>
      <button
        type="button"
        className="site-footer-contact-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        Contact
      </button>
      {open && (
        <div
          id={panelId}
          className="site-footer-contact-panel"
          role="region"
          aria-label="Contact information"
        >
          <a className="site-footer-contact-line" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          <a className="site-footer-contact-line" href={`tel:${CONTACT_PHONE_TEL}`}>
            {CONTACT_PHONE_DISPLAY}
          </a>
        </div>
      )}
    </div>
  );
};

export default ContactButton;

import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import { PageHeadingRow } from './PageHeadingRow';
import { POLICY_EFFECTIVE_DATE, SITE_NAME } from '../constants/legal';

type LegalDocumentProps = {
  title: string;
  children: ReactNode;
};

export const LegalDocument: React.FC<LegalDocumentProps> = ({ title, children }) => {
  return (
    <div className="legal-page">
      <Header />
      <div className="legal-inner">
        <PageHeadingRow title={title} />
        <p className="legal-meta">
          {SITE_NAME} · Last updated {POLICY_EFFECTIVE_DATE}
        </p>
        <article className="legal-prose">{children}</article>
        <p className="legal-back">
          <Link to="/">← Back to shop</Link>
          {' · '}
          <Link to="/privacy">Privacy</Link>
          {' · '}
          <Link to="/terms">Terms</Link>
        </p>
      </div>
    </div>
  );
};

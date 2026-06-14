import React from 'react';
import { LegalDocument } from '../components/LegalDocument';
import {
  CONTACT_EMAIL,
  INSTAGRAM_URL,
  POLICY_EFFECTIVE_DATE,
  SITE_DOMAIN,
  SITE_NAME,
} from '../constants/legal';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <LegalDocument title="Privacy Policy">
      <p>
        {SITE_NAME} (“we”) collects personal information when you use{' '}
        <a href={`https://${SITE_DOMAIN}`}>{SITE_DOMAIN}</a>, create an account, or place an order. By using the site,
        you agree to this Policy.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Account: email and password, or Google sign-in (name and email).</li>
        <li>Orders: name, email, phone (optional), U.S. shipping address, order details, and promo codes.</li>
        <li>Payments: card data is entered on Square’s secure fields; we do not store full card numbers.</li>
        <li>
          Giveaways (if you enter): your full name and email, and your entry timestamp. Your full name will be displayed to
          other visitors on the giveaway wheel.
        </li>
        <li>Technical: basic site usage via our host/analytics (for example, Vercel Analytics).</li>
        <li>Messages you send us by email, phone, or Instagram.</li>
      </ul>

      <h2>How we use it</h2>
      <p>
        We use your information to run the store, fulfill and ship orders, process payments, provide support, prevent
        fraud, and comply with law. If you enter a giveaway, we may also use your email to send future offers, discounts,
        and promotions. We do not sell your personal information.
      </p>

      <h2>Who we share with</h2>
      <p>
        We share data with service providers that help us operate: Square (payments), Supabase (accounts and orders),
        Vercel (hosting/analytics), Google (if you use Google sign-in), and shipping carriers (for example, USPS). We
        may also disclose information if required by law.
      </p>

      <h2>Cookies</h2>
      <p>
        We use cookies and similar technologies for sign-in, cart, security, and analytics. You can adjust cookies in your
        browser; some features may not work if disabled.
      </p>

      <h2>Retention and your requests</h2>
      <p>
        We keep information as long as needed for orders, support, taxes, and disputes. To ask about access or deletion,
        email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address tied to your account.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        {' · '}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
      </p>
      <p>
        <em>Effective date: {POLICY_EFFECTIVE_DATE}</em>
      </p>
    </LegalDocument>
  );
};

export default PrivacyPolicyPage;

import React from 'react';
import { LegalDocument } from '../components/LegalDocument';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  INSTAGRAM_URL,
  SITE_NAME,
} from '../constants/legal';

const ContactPage: React.FC = () => {
  return (
    <LegalDocument title="Contact">
      <p>
        Questions about orders, shipping, returns, or listings? Reach {SITE_NAME} using any of the options below.
      </p>

      <ul className="contact-details">
        <li>
          <strong>Email</strong>
          <br />
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </li>
        <li>
          <strong>Phone</strong>
          <br />
          <a href={`tel:${CONTACT_PHONE_TEL}`}>{CONTACT_PHONE_DISPLAY}</a>
        </li>
        <li>
          <strong>Instagram</strong>
          <br />
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            @slept.on.vintage
          </a>
        </li>
      </ul>

      <p>
        For return requests under our refund policy, include your order number and photos when you email us.
      </p>
    </LegalDocument>
  );
};

export default ContactPage;

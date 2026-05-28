import React from 'react';
import { Link } from 'react-router-dom';
import { LegalDocument } from '../components/LegalDocument';
import {
  CONTACT_EMAIL,
  INSTAGRAM_URL,
  LEGAL_OPERATOR_NAME,
  POLICY_EFFECTIVE_DATE,
  FREE_CHECKOUT_INTERVAL_DAYS,
  RETURN_CLAIM_DAYS,
  SITE_DOMAIN,
  SITE_NAME,
  governingLawPhrase,
  governingVenuePhrase,
} from '../constants/legal';

const TermsPage: React.FC = () => {
  const operator = LEGAL_OPERATOR_NAME;

  return (
    <LegalDocument title="Terms of Service">
      <h2>Overview</h2>
      <p>
        This website is operated by {operator} (“{SITE_NAME},” “we,” “us,” or “our”), an individually owned and operated
        business (not a corporation or LLC). Throughout the site, “we,” “us,” and “our” refer to {operator}. We offer this
        website, including all information, tools, and services on this site, conditioned upon your acceptance of all
        terms, conditions, policies, and notices stated here.
      </p>
      <p>
        By visiting <a href={`https://${SITE_DOMAIN}`}>{SITE_DOMAIN}</a> and/or purchasing something from us, you engage
        in our “Service” and agree to be bound by the following terms and conditions (“Terms of Service,” “Terms”),
        including additional terms and policies referenced herein (including our{' '}
        <Link to="/privacy">Privacy Policy</Link> and the refund policy in Section 6 below).
      </p>
      <p>
        These Terms apply to all users of the site, including browsers, customers, and account holders. Please read these
        Terms carefully before accessing or using our website. By accessing or using any part of the site, you agree to
        be bound by these Terms. If you do not agree, you may not access the website or use any services.
      </p>
      <p>
        Any new features or tools added to the store are also subject to these Terms. You can review the most current
        version at any time on this page. We reserve the right to update, change, or replace any part of these Terms by
        posting changes to our website. It is your responsibility to check this page periodically. Your continued use of
        or access to the website following posted changes constitutes acceptance of those changes.
      </p>
      <p>
        Our online store is hosted and delivered using third-party providers, including Vercel (hosting), Supabase
        (accounts and order data), and Square (payments). They provide infrastructure that allows us to sell products to
        you; their own terms and privacy policies also apply to their services.
      </p>

      <h2>Section 1 — Online store terms</h2>
      <p>
        By agreeing to these Terms, you represent that you are at least the age of majority in your state or province of
        residence, or that you are the age of majority and have given us your consent to allow any minor dependents you
        permit to use this site.
      </p>
      <p>
        You may not use our products or the Service for any illegal or unauthorized purpose, nor may you violate any laws
        in your jurisdiction (including copyright laws) in connection with the Service.
      </p>
      <p>
        You must not use the site to spread malware or otherwise harm the Service. A breach or violation of any of the
        Terms may result in immediate termination of your access to the Service.
      </p>

      <h2>Section 2 — General conditions</h2>
      <p>We reserve the right to refuse service to anyone for any reason at any time.</p>
      <p>
        You understand that your content (not including payment card information) may be transferred over networks and
        may be changed to conform to technical requirements of connecting networks or devices. Payment card information
        is collected and processed by Square; we do not store full card numbers on our servers.
      </p>
      <p>
        You agree not to reproduce, duplicate, copy, sell, resell, or exploit any portion of the Service, use of the
        Service, or access to the Service without express written permission from us.
      </p>
      <p>Section headings are for convenience only and do not limit these Terms.</p>

      <h2>Section 3 — Accuracy, completeness, and timeliness of information</h2>
      <p>
        We are not responsible if information made available on this site is not accurate, complete, or current. Material
        on this site is for general information only and should not be relied on as the sole basis for decisions without
        consulting more accurate or complete sources. Any reliance on site material is at your own risk.
      </p>
      <p>
        This site may contain historical or archived listing information. We reserve the right to modify site contents at
        any time but have no obligation to update information. You agree it is your responsibility to monitor changes
        to our site and listings.
      </p>

      <h2>Section 4 — Modifications to the service and prices</h2>
      <p>Prices for products are subject to change without notice.</p>
      <p>
        We reserve the right at any time to modify or discontinue the Service (or any part of it) without notice. We shall
        not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the
        Service.
      </p>

      <h2>Section 5 — Products (pre-owned vintage)</h2>
      <p>
        Certain products are available exclusively online through the website, often in <strong>limited quantities</strong>{' '}
        (one-of-a-kind vintage pieces). Returns and refunds are only as described in Section 6 (Refund policy) below.
      </p>
      <p>
        All items are <strong>pre-owned</strong> unless clearly stated otherwise. Items are sold in the condition shown in
        listing photos and descriptions. Normal signs of wear, fading, or age are expected for vintage goods. You are
        responsible for reviewing photos, size, and description before purchasing.
      </p>
      <p>
        We have made every effort to display product images as accurately as possible. We cannot guarantee that your
        computer monitor’s display of colors or details will be accurate.
      </p>
      <p>
        We sell to customers in the <strong>United States only</strong> and ship to U.S. addresses. We may limit
        quantities we offer on a case-by-case basis.
        Product descriptions and pricing are subject to change at any time without notice. We reserve the right to
        discontinue any product at any time. Any offer on this site is void where prohibited.
      </p>
      <p>
        We do not warrant that the quality of any products or Services will meet your expectations, or that errors in the
        Service will be corrected.
      </p>

      <h2>Section 6 — Billing, account information, and return policy</h2>
      <p>
        We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel
        quantities purchased per person, per household, per account, or per order. If we change or cancel an order, we may
        attempt to notify you using the email or phone number provided at checkout.
      </p>
      <p>
        You agree to provide current, complete, and accurate purchase and account information for all purchases. You
        agree to promptly update your account information, including email address, so we can complete transactions and
        contact you as needed.
      </p>
      <p>
        Your order is an offer to buy. We may accept, reject, or cancel an order (for example, due to inventory error,
        pricing mistake, suspected fraud, or promotional limits). If we cancel after payment, we will refund the amount
        charged for that order. Prices are in U.S. dollars. Sales tax is calculated at checkout where applicable.
      </p>
      <p>
        Payments are processed by Square. By paying, you authorize us and Square to charge your payment method for the
        order total shown at checkout (including tax). You represent that you are authorized to use the payment method
        provided.
      </p>

      <h3>Refund policy</h3>
      <p>
        <strong>All sales are final.</strong> Exceptions to this return policy include items that are{' '}
        <strong>damaged in transit</strong>, or if an <strong>incorrect clothing item</strong> is received.
      </p>
      <p>
        For any questions about refunds or returns, please email us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        {'. '}
        You may also reach us on{' '}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
        .
      </p>
      <p>
        If an exception applies, contact us within <strong>{RETURN_CLAIM_DAYS} days of delivery</strong> with your order
        number and photos at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Approved refunds, when offered, are issued to the
        original payment method.
      </p>

      <h3>Shipping</h3>
      <ul>
        <li>
          <strong>U.S. shipping only.</strong> We do not ship internationally.
        </li>
        <li>We currently offer <strong>free shipping</strong> on U.S. orders unless stated otherwise at checkout.</li>
        <li>We ship to the U.S. address you provide at checkout.</li>
        <li>
          Orders are typically packed and shipped within a reasonable time after payment. USPS tracking will appear on
          your order page when available.
        </li>
        <li>
          Risk of loss passes to you when the carrier takes possession, except where prohibited by law. We are not
          responsible for carrier delays, incorrect addresses you provide, or packages marked delivered by the carrier.
        </li>
      </ul>

      <h3>Promotional and $0 orders</h3>
      <p>
        Promotional codes and complimentary ($0) checkouts may be subject to limits shown at checkout (for example, one
        complimentary checkout per account every {FREE_CHECKOUT_INTERVAL_DAYS} days). We may modify or cancel promotions
        at any time.
      </p>

      <h2>Section 7 — Third-party services and tools</h2>
      <p>
        We provide access to third-party services we do not control, including Square (payments), Supabase
        (authentication and data storage), Google (if you use “Sign in with Google”), and Vercel (hosting and analytics).
      </p>
      <p>
        You acknowledge that we provide access to such services “as is” and “as available” without warranties or
        endorsement. We are not liable for issues arising from your use of third-party services. You should review and
        agree to the relevant third-party terms and privacy policies.
      </p>
      <p>New features offered through the website are also subject to these Terms.</p>

      <h2>Section 8 — Third-party links</h2>
      <p>
        Certain content or links on our Service may direct you to third-party websites (for example, Instagram). We are
        not responsible for examining or evaluating third-party content or accuracy and are not liable for third-party
        materials, websites, products, or services. Complaints or questions regarding third-party offerings should be
        directed to that third party.
      </p>

      <h2>Section 9 — User comments, feedback, and other submissions</h2>
      <p>
        If you send submissions to us (for example, messages via Instagram, email, or other channels), you agree we may
        use, reproduce, and respond to them as needed to operate the store and provide support, without obligation to
        keep them confidential, pay compensation, or respond.
      </p>
      <p>
        We may monitor or remove content we determine is unlawful, offensive, or violates these Terms or others’ rights.
        You agree your submissions will not violate third-party rights or contain unlawful, abusive, or malicious material.
        You are solely responsible for the accuracy of your submissions.
      </p>

      <h2>Section 10 — Personal information</h2>
      <p>
        Your submission of personal information through the store is governed by our{' '}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>
      <p>
        <strong>Giveaways:</strong> If you enter a giveaway, you understand and agree that your <strong>full name</strong>{' '}
        will be displayed to other visitors on the giveaway wheel and related giveaway page for the duration of the
        giveaway and for a limited time after it ends. By entering, you also agree we may email you future offers,
        discounts, and promotional messages at the email address associated with your account. You may enter only once
        per giveaway. Using multiple accounts or identities to obtain additional entries may result in disqualification
        from the current giveaway and future giveaways, at our discretion.
      </p>
      <p>
        <strong>Giveaway page audio:</strong> The giveaway page may play background music and sound effects.{' '}
        <em>Monkeys Spinning Monkeys</em> by Kevin MacLeod is used as background music on that page and is licensed
        under{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener noreferrer" target="_blank">
          Creative Commons Attribution 4.0
        </a>
        . Wheel spin sound effects are from{' '}
        <a href="https://mixkit.co/" rel="noopener noreferrer" target="_blank">
          Mixkit
        </a>{' '}
        (Mixkit License). The winner celebration fanfare is generated in the browser and is not a third-party recording.
      </p>

      <h2>Section 11 — Errors, inaccuracies, and omissions</h2>
      <p>
        Occasionally there may be information on our site or in the Service that contains typographical errors,
        inaccuracies, or omissions relating to product descriptions, pricing, promotions, shipping, or availability. We
        reserve the right to correct errors and to change or cancel orders if information is inaccurate at any time
        without prior notice (including after you have submitted an order).
      </p>
      <p>
        We undertake no obligation to update information in the Service except as required by law. No update date should
        be taken to indicate that all information has been modified or updated.
      </p>

      <h2>Section 12 — Prohibited uses</h2>
      <p>In addition to other prohibitions in these Terms, you are prohibited from using the site or its content:</p>
      <ul>
        <li>For any unlawful purpose;</li>
        <li>To solicit others to perform unlawful acts;</li>
        <li>To violate international, federal, provincial, state, or local regulations or laws;</li>
        <li>To infringe our or others’ intellectual property rights;</li>
        <li>
          To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate based on gender, sexual
          orientation, religion, ethnicity, race, age, national origin, or disability;
        </li>
        <li>To submit false or misleading information;</li>
        <li>To upload or transmit viruses or malicious code;</li>
        <li>To collect or track others’ personal information without permission;</li>
        <li>To spam, phish, or scrape the Service;</li>
        <li>For any obscene or immoral purpose; or</li>
        <li>To interfere with or circumvent security features of the Service or related websites.</li>
      </ul>
      <p>We reserve the right to terminate your use of the Service for violating prohibited uses.</p>

      <h2>Section 13 — Disclaimer of warranties; limitation of liability</h2>
      <p>
        We do not guarantee that your use of our Service will be uninterrupted, timely, secure, or error-free. We do not
        warrant that results obtained from use of the Service will be accurate or reliable.
      </p>
      <p>
        You agree that from time to time we may remove the Service indefinitely or cancel the Service at any time without
        notice. Your use of, or inability to use, the Service is at your sole risk. The Service and all products delivered
        through the Service are (except as expressly stated by us) provided “as is” and “as available” without warranties
        of any kind, express or implied, including merchantability, fitness for a particular purpose, durability, title,
        and non-infringement.
      </p>
      <p>
        In no case shall {operator}, our operators, affiliates, agents, contractors, service providers, or licensors be
        liable for any injury, loss, claim, or any direct, indirect, incidental, punitive, special, or consequential
        damages of any kind, including lost profits, revenue, savings, or data, arising from your use of the Service or
        any products procured through the Service, even if advised of the possibility. Our total liability for any claim
        arising from a specific order will not exceed the amount you paid for that order.
      </p>
      <p>
        Because some states or jurisdictions do not allow exclusion or limitation of liability for consequential or
        incidental damages, in such jurisdictions our liability is limited to the maximum extent permitted by law.
      </p>

      <h2>Section 14 — Indemnification</h2>
      <p>
        You agree to indemnify, defend, and hold harmless {operator} and our affiliates, partners, officers, agents,
        contractors, service providers, and employees from any claim or demand, including reasonable attorneys’ fees,
        made by any third party due to or arising out of your breach of these Terms, your violation of any law, or your
        violation of any third-party rights.
      </p>

      <h2>Section 15 — Severability</h2>
      <p>
        If any provision of these Terms is determined to be unlawful, void, or unenforceable, that provision is
        enforceable to the fullest extent permitted by law, and the unenforceable portion is deemed severed. Such a
        determination does not affect the validity of the remaining provisions.
      </p>

      <h2>Section 16 — Termination</h2>
      <p>
        Obligations and liabilities incurred prior to termination survive termination. These Terms are effective unless
        and until terminated by you or us. You may terminate by ceasing use of the site and closing your account where
        applicable.
      </p>
      <p>
        If we believe you have failed to comply with these Terms, we may terminate this agreement at any time without
        notice and deny access to the Service. You remain liable for amounts due through the date of termination.
      </p>

      <h2>Section 17 — Entire agreement</h2>
      <p>
        The failure of us to exercise or enforce any right or provision of these Terms shall not constitute a waiver of
        such right or provision.
      </p>
      <p>
        These Terms and any policies posted on this site regarding the Service constitute the entire agreement between
        you and us and supersede prior agreements relating to the Service. Ambiguities shall not be construed against the
        drafting party.
      </p>

      <h2>Section 18 — Governing law</h2>
      <p>
        These Terms and any separate agreements whereby we provide you Services shall be governed by and construed in
        accordance with {governingLawPhrase()}, without regard to conflict-of-law rules. You agree that venue for
        disputes relating to these Terms or the Service shall be in {governingVenuePhrase()}, unless applicable law
        requires otherwise. Please contact us first so we can try to resolve issues informally.
      </p>

      <h2>Section 19 — Changes to terms of service</h2>
      <p>
        You can review the most current version of the Terms of Service at any time on this page. We reserve the right to
        update, change, or replace any part of these Terms by posting updates to our website. Your continued use of or
        access to the website following changes constitutes acceptance of those changes.
      </p>

      <h2>Section 20 — Contact information</h2>
      <p>
        Questions about the Terms of Service should be sent to{' '}
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

export default TermsPage;

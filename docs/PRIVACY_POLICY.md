# PRIVACY POLICY

**Resume Wizard (Web Platform) & HireScreen AI (Desktop Application)**

**Effective Date:** March 29, 2026
**Last Updated:** March 29, 2026
**Owner / Data Controller:** Roshini Velamuri
**Contact:** velamuri.Roshini@gmail.com
**Website:** https://resume-wizard-opal.vercel.app/#/corporate

---

## 1. INTRODUCTION

Roshini Velamuri ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect information in connection with:

- **Resume Wizard** — our web-based resume tool available at https://resume-wizard-opal.vercel.app (the "Website" or "Web Platform").
- **HireScreen AI** — our Windows desktop application (.exe) for AI-powered candidate screening (the "Desktop App").

Together, these are referred to as the "Services."

Please read this Policy carefully. By using the Services, you agree to the practices described herein. If you do not agree, please discontinue use of the Services.

---

## 2. INFORMATION WE COLLECT

We collect different categories of information depending on which Service you use.

### 2.1 Resume Wizard (Web Platform)

**Information you provide directly:**
- **Email Address:** Collected when you register for an account or sign in via email-based authentication. Your email is used for account verification, product communications, and license management.
- **Resume Content:** If you use the Resume Wizard to analyze or optimize a resume, the resume text may be temporarily processed to generate feedback. **Resume content submitted via the Web Platform is not stored after analysis is complete.** It is processed ephemerally and discarded.

**Information collected automatically:**
- **Usage Data:** We may collect anonymized usage metadata, such as the number of resumes analyzed, pages visited, and features used, to improve the Services. This data does not identify individual users.
- **Device and Browser Information:** Standard browser/device identifiers (browser type, OS, IP address) may be collected via server logs or analytics tools for security and performance monitoring.

### 2.2 HireScreen AI (Desktop Application)

**Information collected at license activation:**
- **Email Address:** Provided at registration and used to validate your license and send account-related notifications.
- **Windows Username:** The Desktop App reads the active Windows user account name locally to enforce seat limits and match usage to the correct license. **This information is used only for license enforcement and is not transmitted to our servers in a form that identifies individuals by name.**
- **Machine Fingerprint:** A non-personally identifiable identifier derived from hardware characteristics is collected at activation to enforce the one-machine limitation for Free Trial licenses and to prevent license duplication.

**Resume and candidate data — NOT collected:**
- **Resume Content: Not Transmitted.** All resume analysis, candidate scoring, and AI inference performed by HireScreen AI occurs entirely on your local Windows machine. **No resume text, candidate personal data, job descriptions, or AI outputs are ever transmitted to our servers, to any cloud AI service, or to any third party.** The Desktop App uses an on-device language model (Ollama) that runs locally without an internet connection.
- **Candidate Personal Data: Not Stored by Us.** We have no access to any candidate data you process through the Desktop App.

**Usage metadata:**
- We may collect the number of Job Requisitions consumed against your license limit to enforce subscription tier limits. This counter does not include the content of any requisition.

---

## 3. HOW WE USE YOUR INFORMATION

We use the information we collect for the following purposes:

| Purpose | Legal Basis (GDPR) |
|---|---|
| Account creation and authentication | Performance of contract |
| License validation and enforcement | Performance of contract; legitimate interests |
| Billing and subscription management | Performance of contract |
| Sending transactional emails (receipts, verification) | Performance of contract |
| Product improvement and bug diagnosis | Legitimate interests |
| Responding to support requests | Legitimate interests; performance of contract |
| Legal compliance and fraud prevention | Legal obligation; legitimate interests |
| Marketing communications (opt-in) | Consent |

We do not use your information for automated profiling or decision-making in a manner that produces legal or similarly significant effects on you.

---

## 4. RESUME DATA HANDLING

| Scenario | Resume Data Stored? | Resume Data Transmitted? |
|---|---|---|
| Resume Wizard (web) analysis | No — discarded after analysis | Transmitted to server only for processing; not persisted |
| HireScreen AI (desktop) analysis | No — remains on your local machine | No — never transmitted off-device |

We treat candidate privacy as a core design principle. Neither product is architected to accumulate candidate personal data beyond what is needed for immediate processing.

---

## 5. PAYMENT DATA (STRIPE)

5.1 Paid subscriptions are processed through **Stripe**, a PCI-DSS compliant third-party payment processor. When you subscribe to a paid plan:

- Payment card details (card number, CVV, expiration date) are entered directly into Stripe's secure payment interface and are **never transmitted to or stored by us**.
- We receive from Stripe only non-sensitive billing metadata: a tokenized customer identifier, subscription status, last four digits of the card, and billing period information.

5.2 Stripe's privacy practices are governed by the [Stripe Privacy Policy](https://stripe.com/privacy). We are not responsible for Stripe's data handling.

---

## 6. SUPABASE — DATABASE STORAGE

6.1 We use **Supabase** as our backend database and authentication infrastructure for the Web Platform. The following data is stored in Supabase:

- Email addresses of registered users.
- Account authentication tokens.
- Usage and license metadata (e.g., Job Requisition counts, subscription tier).
- Lead and waitlist contact information submitted through our website.

6.2 **Resume content and candidate personal data are not stored in Supabase.** Only account-level and license-level metadata is stored.

6.3 Supabase data is hosted on infrastructure operated by Supabase, Inc., and may be stored on servers located in the United States. Where required by applicable law (e.g., GDPR), appropriate data transfer mechanisms are relied upon.

---

## 7. INFORMATION SHARING AND DISCLOSURE

We do not sell, rent, or trade your personal information to third parties for their own marketing purposes.

We may share your information only in the following limited circumstances:

7.1 **Service Providers.** We share information with third-party vendors who assist us in operating the Services (e.g., Stripe for payments, Supabase for database services). These vendors are contractually required to protect your information and may only use it to provide services to us.

7.2 **Legal Requirements.** We may disclose information if required to do so by law, court order, or government authority, or if we believe in good faith that such disclosure is necessary to protect the rights, property, or safety of us, our users, or the public.

7.3 **Business Transfers.** In the event of a merger, acquisition, or sale of all or substantially all of our assets, your information may be transferred as part of that transaction. We will notify you via email or a prominent notice on the Website if such a transfer occurs.

7.4 **With Your Consent.** We may share information for any other purpose with your explicit consent.

---

## 8. DATA RETENTION

| Data Type | Retention Period |
|---|---|
| Account email address | Until account deletion request |
| Authentication tokens | Until session expiry or account deletion |
| Payment/billing metadata (via Stripe) | As required by financial recordkeeping law (typically 7 years) |
| Usage/license metadata | Duration of subscription + 1 year |
| Resume content (Resume Wizard web) | Not retained — discarded after processing |
| Candidate data (HireScreen AI desktop) | Not retained by us — stored only on your local machine |

Upon account deletion, we will delete or anonymize your personal data within thirty (30) days, except where retention is required by law.

---

## 9. YOUR PRIVACY RIGHTS

### 9.1 GDPR Rights (EEA and UK Residents)

If you are located in the European Economic Area or the United Kingdom, you have the following rights under the General Data Protection Regulation (GDPR) or UK GDPR:

- **Right of Access:** Request a copy of the personal data we hold about you.
- **Right to Rectification:** Request correction of inaccurate or incomplete personal data.
- **Right to Erasure:** Request deletion of your personal data ("right to be forgotten"), subject to legal retention obligations.
- **Right to Restriction:** Request that we restrict the processing of your personal data in certain circumstances.
- **Right to Data Portability:** Receive your personal data in a structured, machine-readable format.
- **Right to Object:** Object to processing based on legitimate interests or for direct marketing purposes.
- **Right to Withdraw Consent:** Where processing is based on consent, withdraw consent at any time without affecting the lawfulness of prior processing.

To exercise any of these rights, contact us at velamuri.Roshini@gmail.com. We will respond to verified requests within thirty (30) days.

You also have the right to lodge a complaint with your national supervisory authority (e.g., the ICO in the UK, the CNIL in France, or your local EU data protection authority).

### 9.2 CCPA Rights (California Residents)

If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA), as amended by the California Privacy Rights Act (CPRA):

- **Right to Know:** Request disclosure of the categories and specific pieces of personal information we collect, use, disclose, and sell.
- **Right to Delete:** Request deletion of personal information we have collected about you.
- **Right to Correct:** Request correction of inaccurate personal information.
- **Right to Opt-Out of Sale or Sharing:** We do not sell or share personal information for cross-context behavioral advertising. No opt-out is required, but you may contact us for confirmation.
- **Right to Non-Discrimination:** We will not discriminate against you for exercising any of your CCPA rights.

**Categories of personal information collected:** Identifiers (email, IP address); internet or network activity (usage data); commercial information (subscription/billing metadata).

**We do not sell personal information.** We do not use or disclose sensitive personal information for purposes other than those specified in this Policy.

To submit a CCPA request, contact velamuri.Roshini@gmail.com. We will respond within forty-five (45) days.

### 9.3 Other Jurisdictions

Residents of other jurisdictions may have additional privacy rights under local law. We will make reasonable efforts to honor privacy rights requests from users in any jurisdiction. Contact us at velamuri.Roshini@gmail.com to submit a request.

---

## 10. COOKIES AND TRACKING

10.1 The Web Platform may use essential cookies required for session management and authentication. We do not use advertising or behavioral tracking cookies.

10.2 You may configure your browser to refuse cookies, but certain features of the Website may not function correctly without them.

10.3 The Desktop App does not use cookies. It does not embed web tracking mechanisms.

---

## 11. DATA SECURITY

11.1 We implement reasonable technical and organizational security measures to protect your personal data against unauthorized access, disclosure, alteration, or destruction. These measures include:

- Encrypted storage and transmission of account data via Supabase.
- HTTPS encryption for all web communications.
- Access controls limiting who can access our backend systems.
- Local-only processing for all candidate data in the Desktop App.

11.2 Despite these measures, no system is completely secure. We cannot guarantee absolute security and are not responsible for unauthorized access resulting from user actions (e.g., sharing credentials).

11.3 In the event of a data breach that is likely to result in a risk to your rights and freedoms, we will notify affected users and applicable regulators within the timeframes required by applicable law (72 hours for GDPR; without unreasonable delay for CCPA).

---

## 12. CHILDREN'S PRIVACY

The Services are not directed to individuals under the age of sixteen (16). We do not knowingly collect personal information from children under 16. If we become aware that we have inadvertently collected personal information from a child under 16, we will delete it promptly. If you believe we have collected such information, contact us at velamuri.Roshini@gmail.com.

---

## 13. INTERNATIONAL DATA TRANSFERS

Our Services are hosted on infrastructure located in the United States. If you access the Services from outside the United States, your personal data may be transferred to and processed in the United States, which may not have data protection laws equivalent to those in your jurisdiction.

For users in the EEA or UK, we rely on appropriate transfer mechanisms (such as Standard Contractual Clauses) for international transfers of personal data. Contact us at velamuri.Roshini@gmail.com for more information about the transfer mechanisms we rely upon.

---

## 14. CHANGES TO THIS PRIVACY POLICY

We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. We will notify you of material changes by posting an updated Policy on the Website and, where required, by sending an email notification at least thirty (30) days before the change takes effect. We encourage you to review this Policy periodically.

Your continued use of the Services after the effective date of any revised Policy constitutes your acceptance of the changes.

---

## 15. CONTACT FOR PRIVACY REQUESTS

For any privacy-related questions, access requests, deletion requests, or complaints, contact:

**Roshini Velamuri — Privacy Contact**
Email: velamuri.Roshini@gmail.com
Website: https://resume-wizard-opal.vercel.app/#/corporate

We will respond to privacy requests within the timeframes required by applicable law (generally 30 days for GDPR, 45 days for CCPA).

---

*Copyright © 2026 Roshini Velamuri. All rights reserved.*

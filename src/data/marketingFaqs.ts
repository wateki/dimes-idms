import { CONTACT_EMAIL } from '@/config/site';

export type MarketingFaq = { question: string; answer: string };

export const landingFaqs: MarketingFaq[] = [
  {
    question: 'What is DIMES IDMS?',
    answer:
      'DIMES IDMS is an Integrated Data Management System for humanitarian and MEAL teams. It harmonizes field, partner, and donor data, links KPIs to program goals, and supports offline mobile collection with Dimes Collect.',
  },
  {
    question: 'Who is DIMES IDMS for?',
    answer:
      'NGOs, humanitarian agencies, MEAL teams, and project management organizations that need one place to standardize scattered program data, run approvals, and report impact in real time.',
  },
  {
    question: 'Does DIMES work with KoboToolbox and Excel?',
    answer:
      'Yes. DIMES imports and integrates Excel, CSV, KoboToolbox, ODK, and custom APIs so teams can keep existing collection tools while centralizing analysis and dashboards.',
  },
  {
    question: 'Is there a free plan?',
    answer:
      'Yes. The Free plan includes up to 2 users, 1 project, core forms and reports, Dimes Collect mobile access, and email support — no credit card required to start.',
  },
  {
    question: 'How long does signup take?',
    answer:
      'Most organizations complete account setup in a few minutes: create your admin account, confirm your email, then choose a plan. Paid plans use secure checkout; the Free plan lets you sign in immediately after confirmation.',
  },
  {
    question: 'Can field teams collect data offline?',
    answer:
      'Yes. Dimes Collect is an offline-first mobile app. Field teams capture data without connectivity; responses sync automatically when they are back online.',
  },
];

export const pricingFaqs: MarketingFaq[] = [
  {
    question: 'Can I change plans later?',
    answer:
      'Yes. Upgrade or downgrade anytime from organization settings. Changes apply to your next billing cycle for paid plans.',
  },
  {
    question: 'What happens on the Free plan?',
    answer:
      'The Free plan stays free with up to 2 users and 1 project. No credit card is required. When you need more capacity, choose Basic, Professional, or Enterprise at signup or later.',
  },
  {
    question: 'Do you offer NGO or non-profit pricing?',
    answer:
      `Yes. Registered non-profits may qualify for adjusted pricing. Email ${CONTACT_EMAIL} with your organization details.`,
  },
  {
    question: 'Is there a setup fee?',
    answer: 'No setup fees. You pay only for the plan you select, monthly or annually (annual saves about 10%).',
  },
];

export const contactFaqs: MarketingFaq[] = [
  {
    question: 'How quickly will I receive a response?',
    answer: 'We aim to reply within one business day (East Africa time). Urgent MEAL rollout questions can mention timing in your message.',
  },
  {
    question: 'Can I schedule a demo?',
    answer:
      `Yes. Use the contact form with subject “Demo request” or email ${CONTACT_EMAIL}. We’ll walk through KPIs, Kobo import, and offline collection.`,
  },
  {
    question: 'Do you offer custom implementations?',
    answer:
      'Enterprise and large NGO programs can include dedicated onboarding, training, and integrations. Describe your portfolio in the message field.',
  },
  {
    question: 'Where is support documented?',
    answer: 'Visit /support for onboarding, training, and help channels. Free plan includes email support; paid plans add priority and dedicated options.',
  },
];

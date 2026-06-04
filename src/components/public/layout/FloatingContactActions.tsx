import { Mail, MessageCircle } from 'lucide-react';
import { CONTACT_EMAIL, whatsappUrl, WHATSAPP_DEFAULT_MESSAGE } from '@/config/site';

type Props = {
  whatsappMessage?: string;
};

export function FloatingContactActions({
  whatsappMessage = WHATSAPP_DEFAULT_MESSAGE,
}: Props) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3"
      role="group"
      aria-label="Quick contact"
    >
      <a
        href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('DIMES IDMS enquiry')}`}
        className="flex size-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/25 transition hover:bg-emerald-700 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        aria-label={`Email ${CONTACT_EMAIL}`}
        title={`Email ${CONTACT_EMAIL}`}
      >
        <Mail className="size-5" aria-hidden />
      </a>
      <a
        href={whatsappUrl(whatsappMessage)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex size-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-900/20 transition hover:bg-[#20bd5a] hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="size-5" aria-hidden />
      </a>
    </div>
  );
}

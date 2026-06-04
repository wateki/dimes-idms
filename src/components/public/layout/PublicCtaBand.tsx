import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CTA, TRUST_LINE } from '@/data/marketingCopy';

type Props = {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  showSecondary?: boolean;
  secondaryLabel?: string;
  secondaryPath?: string;
  /** green matches home final CTA; emerald is default */
  variant?: 'emerald' | 'green';
};

export function PublicCtaBand({
  title = 'Ready to harmonize your program data?',
  subtitle = 'Create your organization workspace on the Free plan — upgrade when your team grows.',
  primaryLabel = CTA.primary,
  showSecondary = true,
  secondaryLabel = CTA.secondary,
  secondaryPath = '/pricing',
  variant = 'emerald',
}: Props) {
  const navigate = useNavigate();
  const gradient =
    variant === 'green'
      ? 'bg-gradient-to-br from-green-700 to-green-600'
      : 'bg-gradient-to-br from-emerald-600 to-emerald-500';
  const subtitleClass = variant === 'green' ? 'text-green-50' : 'text-emerald-50';
  const trustClass = variant === 'green' ? 'text-green-100' : 'text-emerald-100';
  const btnText = variant === 'green' ? 'text-green-600' : 'text-emerald-600';

  return (
    <section className={`py-20 px-4 sm:px-6 lg:px-8 ${gradient}`}>
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{title}</h2>
        <p className={`text-lg sm:text-xl ${subtitleClass} mb-8 max-w-2xl mx-auto`}>{subtitle}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            variant="secondary"
            className={`text-base px-7 py-4 h-auto bg-white ${btnText} hover:bg-neutral-50 font-semibold shadow-md`}
            onClick={() => navigate('/signup')}
          >
            {primaryLabel}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          {showSecondary && (
            <Button
              size="lg"
              variant="outline"
              className="text-base px-7 py-4 h-auto border-2 border-white bg-transparent text-white hover:bg-white/20 font-semibold"
              onClick={() => navigate(secondaryPath)}
            >
              {secondaryLabel}
            </Button>
          )}
        </div>
        <p className={`text-sm ${trustClass} mt-6`}>{TRUST_LINE}</p>
      </div>
    </section>
  );
}

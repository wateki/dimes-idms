import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CTA } from '@/data/marketingCopy';

export type PublicNavPage = 'home' | 'features' | 'pricing' | 'about' | 'support' | 'contact';

const links: { to: string; label: string; key: PublicNavPage }[] = [
  { to: '/', label: 'Home', key: 'home' },
  { to: '/features', label: 'Features', key: 'features' },
  { to: '/pricing', label: 'Pricing', key: 'pricing' },
  { to: '/about', label: 'About', key: 'about' },
  { to: '/support', label: 'Support', key: 'support' },
  { to: '/contact', label: 'Contact', key: 'contact' },
];

type Props = {
  activePage: PublicNavPage;
};

export function PublicNav({ activePage }: Props) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const linkClass = (key: PublicNavPage) =>
    key === activePage
      ? 'text-sm font-medium text-emerald-600 dark:text-emerald-400'
      : 'text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors';

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <nav className="fixed top-0 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-emerald-100 dark:border-gray-800 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center shrink-0" aria-label="DIMES IDMS home">
            <img src="/logo.png" alt="DIMES IDMS" className="h-10 w-auto object-contain" />
          </Link>

          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {links.map(({ to, label, key }) => (
              <Link key={key} to={to} className={linkClass(key)}>
                {label}
              </Link>
            ))}
            <Button variant="ghost" onClick={() => navigate('/login')}>
              {CTA.signIn}
            </Button>
            <Button onClick={() => navigate('/signup')} className="bg-emerald-600 hover:bg-emerald-700">
              {CTA.primary}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>

          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-expanded={mobileMenuOpen} aria-label="Menu">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-emerald-100 dark:border-gray-800">
            <div className="flex flex-col space-y-3">
              {links.map(({ to, label, key }) => (
                <Link key={key} to={to} className={linkClass(key)} onClick={closeMobile}>
                  {label}
                </Link>
              ))}
              <Button variant="ghost" className="justify-start" onClick={() => { navigate('/login'); closeMobile(); }}>
                {CTA.signIn}
              </Button>
              <Button className="justify-start bg-emerald-600 hover:bg-emerald-700" onClick={() => { navigate('/signup'); closeMobile(); }}>
                {CTA.primary}
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

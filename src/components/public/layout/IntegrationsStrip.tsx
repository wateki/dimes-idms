import { INTEGRATIONS_STRIP } from '@/data/marketingCopy';
import { FileSpreadsheet, Database } from 'lucide-react';

export function IntegrationsStrip() {
  return (
    <div className="border-y border-emerald-100 dark:border-gray-800 bg-emerald-50/50 dark:bg-gray-900/50 py-4 px-4">
      <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 shrink-0">
          <Database className="w-5 h-5" aria-hidden />
          <FileSpreadsheet className="w-5 h-5" aria-hidden />
        </div>
        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">{INTEGRATIONS_STRIP}</p>
      </div>
    </div>
  );
}

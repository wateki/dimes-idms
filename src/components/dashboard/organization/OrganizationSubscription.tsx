import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseOrganizationService } from '@/services/supabaseOrganizationService';
import { useSubscriptionPaymentListener } from '@/hooks/useSubscriptionPaymentListener';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard, Calendar, Check, X, ExternalLink, Loader2, ArrowUp, Search, Download, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNotification } from '@/hooks/useNotification';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function OrganizationSubscription() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization, loading: orgLoading, refreshOrganization } = useOrganization();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [manageLink, setManageLink] = useState<string | null>(null);
  const [loadingManageLink, setLoadingManageLink] = useState(false);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Listen for subscription status changes when waiting for payment (checks localStorage)
  const isWaitingForPayment = localStorage.getItem('waiting_for_subscription_payment') === 'true';
  useSubscriptionPaymentListener(isWaitingForPayment);

  // Handle Paystack redirect with transaction reference
  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (reference) {
      console.log('[OrganizationSubscription] Payment redirect detected with reference:', reference);
      // Clear the reference from URL
      setSearchParams({}, { replace: true });
      // Clear waiting state since we're on the subscription page
      localStorage.removeItem('waiting_for_subscription_payment');
      // Show success message and refresh subscription
      showSuccess('Payment successful! Your subscription has been activated.');
      if (organization) {
        loadSubscription();
        refreshOrganization();
      }
    }
  }, [searchParams, organization]);

  useEffect(() => {
    if (organization) {
      loadSubscription();
    }
  }, [organization]);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const sub = await supabaseOrganizationService.getSubscription();
      setSubscription(sub);

      console.log('subscription', sub);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleUpdateCard = async () => {
    // Backend will detect the subscription from the user's organization
    try {
      setLoadingManageLink(true);
      const link = await supabaseOrganizationService.getSubscriptionManagementLink();
      if (link) {
        setManageLink(link);
        window.open(link, '_blank');
      } else {
        showError('Unable to generate subscription management link');
      }
    } catch (error: any) {
      console.error('Failed to get subscription management link:', error);
      showError(error.message || 'Failed to get subscription management link');
    } finally {
      setLoadingManageLink(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessing(true);
      await supabaseOrganizationService.cancelSubscription();
      await refreshOrganization();
      await loadSubscription();
      showSuccess('Subscription cancelled successfully');
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error);
      showError(error.message || 'Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trialing: 'secondary',
      past_due: 'destructive',
      cancelled: 'outline',
      suspended: 'destructive',
      'non-renewing': 'secondary',
      attention: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (orgLoading || loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Organization not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = organization.subscriptionExpiresAt 
    ? new Date(organization.subscriptionExpiresAt) < new Date()
    : false;

  const isSubscriptionActive = organization.subscriptionStatus === 'active' || organization.subscriptionStatus === 'trialing';
  const canUpgrade = !isSubscriptionActive || organization.subscriptionTier === 'free';


  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization's subscription and billing
        </p>
      </div>

      {/* Minimalist Current Subscription Card */}
      <Card className="relative">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Manage your plan</h2>
              <div className="text-muted-foreground">
                Your account is currently on a{' '}
                <Badge variant="outline" className="ml-1">
                  {organization.subscriptionTier 
                    ? organization.subscriptionTier.charAt(0).toUpperCase() + organization.subscriptionTier.slice(1)
                    : 'Free'}
                </Badge>
                {' '}plan.
              </div>
              {isExpired && (
                <Alert variant="destructive" className="mt-4">
                  <X className="h-4 w-4" />
                  <AlertDescription>
                    Your subscription has expired. Please renew to continue using all features.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* Always allow viewing plans, even when already on an active plan */}
              <Button 
                onClick={() => navigate('/dashboard/organization/plans')}
                variant="outline"
                size="sm"
              >
                View plans
              </Button>
              {canUpgrade && (
                <Button 
                  onClick={() => navigate('/dashboard/organization/plans')}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Upgrade
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <BillingHistoryCard />

      {/* Subscription Management Actions */}
      {  (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Management</CardTitle>
            <CardDescription>
              Manage your subscription settings and payment method
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleUpdateCard}
              variant="outline"
              className="flex-1"
              disabled={loadingManageLink || processing}
            >
              {loadingManageLink ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Update Card
                </>
              )}
            </Button>
          {/*   <Button
              onClick={handleCancelSubscription}
              variant="destructive"
              className="flex-1"
              disabled={processing || loadingManageLink}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </>
              )}
            </Button> */}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Billing History Component
function BillingHistoryCard() {
  const { organization } = useOrganization();
  const { showError } = useNotification();
  const [billingHistory, setBillingHistory] = useState<Array<{
    id: string;
    invoiceCode: string | null;
    transactionReference: string | null;
    amount: number | null;
    paid: boolean | null;
    paidAt: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    createdAt: string | null;
  }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filters & search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'failed' | 'pending'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (organization) {
      loadBillingHistory();
    }
  }, [organization]);

  const loadBillingHistory = async () => {
    try {
      setLoadingHistory(true);
      const history = await supabaseOrganizationService.getBillingHistory();
      setBillingHistory(history);
    } catch (error) {
      console.error('Failed to load billing history:', error);
      showError('Failed to load billing history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadInvoiceDetails = async (invoiceCode: string) => {
    try {
      setLoadingDetails(true);
      const details = await supabaseOrganizationService.getInvoiceDetails(invoiceCode);
      setInvoiceDetails(details);
      setSelectedInvoice(invoiceCode);
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      showError('Failed to load invoice details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Helper function to get plan name from plan code
  const getPlanName = (planCode: string | null | undefined): string => {
    if (!planCode) return 'N/A';
    
    if (planCode.includes('FREE') || planCode === 'PLN_FREE') return 'Free';
    if (planCode.includes('5jjsgz1ivndtnxp')) return 'Basic';
    if (planCode.includes('a7qqm2p4q9ejdpt')) return 'Professional';
    if (planCode.includes('9jsfo4c1d35od5q')) return 'Enterprise';
    
    // Try to get from Paystack details if available
    return planCode;
  };

  // Helper function to get plan price from plan code
  const getPlanPrice = (planCode: string | null | undefined): string => {
    if (!planCode) return 'N/A';
    
    if (planCode.includes('FREE') || planCode === 'PLN_FREE') return 'KSh 0';
    if (planCode.includes('5jjsgz1ivndtnxp')) return 'KSh 7,000';
    if (planCode.includes('a7qqm2p4q9ejdpt')) return 'KSh 35,999';
    if (planCode.includes('9jsfo4c1d35od5q')) return 'KSh 95,999';
    
    return 'N/A';
  };

  const handleCardClick = (item: (typeof billingHistory)[number]) => {
    if (item.invoiceCode) {
      // Load full invoice details from backend + Paystack
      loadInvoiceDetails(item.invoiceCode);
    } else {
      // Fallback: show basic transaction info only
      setInvoiceDetails({
        ...item,
      });
      setSelectedInvoice(item.transactionReference || item.id);
    }
  };

  const handleRetryPayment = async () => {
    if (!organization) {
      showError('No active subscription found');
      return;
    }

    try {
      const link = await supabaseOrganizationService.getSubscriptionManagementLink();
      if (link) {
        window.open(link, '_blank');
      } else {
        showError('Unable to generate payment link');
      }
    } catch (error: any) {
      console.error('Failed to get payment link:', error);
      showError(error.message || 'Failed to get payment link');
    }
  };

  const formatAmount = (amount: number | null): string => {
    if (!amount) return 'N/A';
    // Amount is in cents (smallest currency unit), convert to Kenyan Shillings
    const kes = amount / 100;
    return `KSh ${kes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Apply filters and search
  const filteredHistory = useMemo(() => {
    return billingHistory.filter((item) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid' && !item.paid) return false;
        if (statusFilter === 'failed' && (item.paid || !item.invoiceCode)) return false;
        if (statusFilter === 'pending' && item.paid) return false;
      }

      // Search by invoice code or transaction reference
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const code = item.invoiceCode?.toLowerCase() || '';
        const ref = item.transactionReference?.toLowerCase() || '';
        if (!code.includes(query) && !ref.includes(query)) {
          return false;
        }
      }

      // Date range filter (based on createdAt)
      if (dateFrom || dateTo) {
        if (!item.createdAt) return false;
        const itemDate = new Date(item.createdAt);

        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (itemDate < from) return false;
        }

        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (itemDate > to) return false;
        }
      }

      return true;
    });
  }, [billingHistory, statusFilter, searchQuery, dateFrom, dateTo]);

  const exportToPDF = () => {
    if (filteredHistory.length === 0) {
      showError('No invoices to export');
      return;
    }

    const formatAmountLocal = (amount: number | null): string => {
      if (!amount) return 'N/A';
      const kes = amount / 100;
      return `KSh ${kes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDateLocal = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const totalAmount = filteredHistory.reduce((sum, item) => sum + (item.amount || 0), 0);
    const paidCount = filteredHistory.filter((i) => i.paid).length;
    const failedCount = filteredHistory.filter((i) => !i.paid && i.invoiceCode).length;

    const rowsHtml = filteredHistory
      .map((item) => {
        const statusClass = item.paid ? 'status-paid' : item.invoiceCode ? 'status-failed' : 'status-pending';
        const statusLabel = item.paid ? 'Paid' : item.invoiceCode ? 'Failed' : 'Pending';
        const code = item.invoiceCode || item.transactionReference || 'N/A';
        const period =
          item.periodStart && item.periodEnd
            ? `${formatDateLocal(item.periodStart)} - ${formatDateLocal(item.periodEnd)}`
            : 'N/A';

        return `
        <tr>
          <td>${code}</td>
          <td>${formatDateLocal(item.createdAt)}</td>
          <td>${period}</td>
          <td>${formatAmountLocal(item.amount)}</td>
          <td class="${statusClass}">${statusLabel}</td>
          <td>${item.paidAt ? formatDateLocal(item.paidAt) : 'N/A'}</td>
        </tr>`;
      })
      .join('');

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Invoice Report</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #0f172a; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
      th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
      th { background: #f3f4f6; font-weight: 600; }
      tr:nth-child(even) { background: #f9fafb; }
      .status-paid { color: #16a34a; font-weight: 600; }
      .status-failed { color: #dc2626; font-weight: 600; }
      .status-pending { color: #d97706; font-weight: 600; }
      .summary { margin-top: 12px; font-size: 12px; }
      .summary span { margin-right: 16px; }
      @media print { body { padding: 8px; } }
    </style>
  </head>
  <body>
    <h1>Invoice Report</h1>
    <div class="meta">
      <div>${organization?.name || 'Organization'}</div>
      <div>Generated: ${new Date().toLocaleString()}</div>
    </div>
    <div class="summary">
      <span>Total: ${filteredHistory.length}</span>
      <span>Paid: ${paidCount}</span>
      <span>Failed: ${failedCount}</span>
      <span>Total Amount: ${formatAmountLocal(totalAmount)}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Invoice / Transaction</th>
          <th>Date</th>
          <th>Period</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Paid At</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `invoices-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }

    URL.revokeObjectURL(url);
  };

  const downloadEntry = () => {
    if (!invoiceDetails) return;

    const entry = invoiceDetails as any;

    const formatAmountLocal = (amount: number | null): string => {
      if (!amount) return 'N/A';
      const kes = amount / 100;
      return `KSh ${kes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDateLocal = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const formatDateTimeLocal = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const code = entry.invoiceCode || entry.transactionReference || selectedInvoice || 'N/A';
    const isInvoice = !!entry.invoiceCode;
    const statusLabel = entry.paid ? 'Paid' : isInvoice ? 'Failed' : 'Pending';
    
    // Get plan information
    const planCode = entry.paystackDetails?.subscription?.plan?.plan_code ||
                     entry.paystackDetails?.plan?.plan_code ||
                     organization?.subscriptionTier;
    const planName = getPlanName(planCode);
    const planPrice = getPlanPrice(planCode);

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${isInvoice ? 'Invoice' : 'Transaction'} ${code}</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #0f172a; }
      h1 { font-size: 22px; margin-bottom: 8px; }
      .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
      .section { margin-top: 16px; }
      .label { font-size: 12px; color: #6b7280; }
      .value { font-size: 14px; font-weight: 500; margin-top: 2px; }
    </style>
  </head>
  <body>
    <h1>${isInvoice ? 'Invoice' : 'Transaction'} Details</h1>
    <div class="meta">
      <div>${organization?.name || 'Organization'}</div>
      <div>Generated: ${new Date().toLocaleString()}</div>
    </div>

    <div class="section">
      <div class="label">Code</div>
      <div class="value">${code}</div>
    </div>

    <div class="section">
      <div class="label">Status</div>
      <div class="value">${statusLabel}</div>
    </div>

    <div class="section">
      <div class="label">Plan</div>
      <div class="value">${planName}</div>
      <div class="value" style="font-size: 12px; color: #6b7280; margin-top: 2px;">${planPrice} per month</div>
    </div>

    <div class="section">
      <div class="label">Amount</div>
      <div class="value">${formatAmountLocal(entry.amount ?? null)}</div>
    </div>

    <div class="section">
      <div class="label">Created</div>
      <div class="value">${formatDateTimeLocal(entry.createdAt)}</div>
    </div>

    ${
      entry.periodStart && entry.periodEnd
        ? `
    <div class="section">
      <div class="label">Period</div>
      <div class="value">${formatDateLocal(entry.periodStart)} - ${formatDateLocal(entry.periodEnd)}</div>
    </div>`
        : ''
    }

    ${
      entry.paidAt
        ? `
    <div class="section">
      <div class="label">Paid At</div>
      <div class="value">${formatDateTimeLocal(entry.paidAt)}</div>
    </div>`
        : ''
    }

    ${
      entry.paystackDetails?.description
        ? `
    <div class="section">
      <div class="label">Failure Reason</div>
      <div class="value">${entry.paystackDetails.description}</div>
    </div>`
        : ''
    }
  </body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${isInvoice ? 'invoice' : 'transaction'}-${code}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View your past invoices and payments
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                disabled={filteredHistory.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showFilters && (
            <div className="mb-6 space-y-4 rounded-lg border bg-muted/40 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by invoice code or transaction reference"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as 'all' | 'paid' | 'failed' | 'pending')
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm font-medium text-muted-foreground">From date</p>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-muted-foreground">To date</p>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Showing {filteredHistory.length} of {billingHistory.length} records
                </div>
                {(searchQuery || statusFilter !== 'all' || dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setDateFrom('');
                      setDateTo('');
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          )}
          {loadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : billingHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No billing history available</p>
              <p className="text-sm mt-2">Invoices and payments will appear here after subscription activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="mx-auto mb-4 h-10 w-10 opacity-50" />
                  <p>No invoices match your filters</p>
                  <p className="mt-2 text-sm">
                    Try adjusting your search text, status or date range.
                  </p>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                      !item.paid && item.invoiceCode ? 'border-orange-200 bg-orange-50/50' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(item);
                          }}
                          className="text-left font-medium hover:underline"
                          disabled={!item.invoiceCode || loadingDetails}
                        >
                          {item.invoiceCode
                            ? `Invoice ${item.invoiceCode}`
                            : item.transactionReference
                              ? `Transaction ${item.transactionReference}`
                              : 'Payment'}
                        </button>
                        {item.paid ? (
                          <Badge variant="default" className="bg-green-500">
                            Paid
                          </Badge>
                        ) : item.invoiceCode ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {item.periodStart && item.periodEnd
                          ? `${formatDate(item.periodStart)} - ${formatDate(item.periodEnd)}`
                          : formatDate(item.createdAt)}
                      </div>
                      {!item.paid && item.invoiceCode && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetryPayment();
                          }}
                        >
                          Retry Payment
                        </Button>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatAmount(item.amount)}</p>
                      {item.paidAt && (
                        <p className="text-xs text-muted-foreground">
                          Paid {formatDate(item.paidAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
              <DialogDescription>
                Invoice {selectedInvoice}
              </DialogDescription>
            </DialogHeader>
            {loadingDetails ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : invoiceDetails ? (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={downloadEntry}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="mt-1">
                      {invoiceDetails.paid ? (
                        <Badge variant="default" className="bg-green-500">Paid</Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Amount</p>
                    <p className="mt-1 font-semibold">{formatAmount(invoiceDetails.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Plan</p>
                    <p className="mt-1 font-semibold">
                      {getPlanName(
                        invoiceDetails.paystackDetails?.subscription?.plan?.plan_code ||
                        invoiceDetails.paystackDetails?.plan?.plan_code ||
                        organization?.subscriptionTier
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getPlanPrice(
                        invoiceDetails.paystackDetails?.subscription?.plan?.plan_code ||
                        invoiceDetails.paystackDetails?.plan?.plan_code ||
                        organization?.subscriptionTier
                      )}{' '}
                      per month
                    </p>
                  </div>
                  {invoiceDetails.periodStart && invoiceDetails.periodEnd && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Period Start</p>
                        <p className="mt-1">{formatDateTime(invoiceDetails.periodStart)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Period End</p>
                        <p className="mt-1">{formatDateTime(invoiceDetails.periodEnd)}</p>
                      </div>
                    </>
                  )}
                  {invoiceDetails.paidAt && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Paid At</p>
                      <p className="mt-1">{formatDateTime(invoiceDetails.paidAt)}</p>
                    </div>
                  )}
                  {invoiceDetails.transactionReference && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Transaction Reference</p>
                      <p className="mt-1 font-mono text-sm">{invoiceDetails.transactionReference}</p>
                    </div>
                  )}
                </div>
                {invoiceDetails.paystackDetails?.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Failure Reason</p>
                    <p className="mt-1 text-sm text-destructive">{invoiceDetails.paystackDetails.description}</p>
                  </div>
                )}
                {!invoiceDetails.paid && (
                  <div className="pt-4 border-t">
                    <Button onClick={handleRetryPayment} className="w-full">
                      Retry Payment
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Invoice details not found</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}


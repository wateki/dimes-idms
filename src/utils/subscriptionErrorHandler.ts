import { supabaseLimitCheckService, UsageLimitInfo } from '@/services/supabaseLimitCheckService';
import { UsageMetric } from '@/services/supabaseUsageTrackingService';

/**
 * Maps database error codes to user-friendly messages
 */
const ERROR_CODE_MESSAGES: Record<string, (metric: UsageMetric) => string> = {
  '23505': (metric) => {
    const metricNames: Partial<Record<UsageMetric, string>> = {
      users: 'users',
      projects: 'projects',
      forms: 'forms',
      form_responses: 'form responses',
      reports: 'reports',
      feedback_forms: 'feedback forms',
      feedback_submissions: 'feedback submissions',
      kobo_tables: 'Kobo table integrations',
      strategic_plans: 'strategic plans',
      storage_gb: 'storage',
    };
    return `You have reached your ${metricNames[metric] || metric} limit. Please upgrade your plan to continue.`;
  },
};

/**
 * Handles database errors and converts them to user-friendly messages
 * Checks if error is related to subscription limits and provides upgrade prompts
 * For non-subscription errors, preserves the original error message
 */
export async function handleSubscriptionError(
  error: any,
  metric: UsageMetric,
  operation: 'create' | 'update' = 'create'
): Promise<Error> {
  // Extract error information from various error formats
  const errorCode = error?.code || error?.error?.code;
  const errorMessage = error?.message || error?.error?.message || '';
  const errorDetails = error?.details || error?.error?.details || '';
  const errorHint = error?.hint || error?.error?.hint || '';

  // Normalize error message for checking
  const normalizedMessage = errorMessage.toLowerCase();
  const normalizedDetails = errorDetails.toLowerCase();
  const normalizedHint = errorHint.toLowerCase();

  // Check if it's a subscription limit error (RLS policy blocked)
  // PostgreSQL error code 42501 = insufficient_privilege (RLS policy violation)
  const isRLSPolicyError = 
    errorCode === '42501' || 
    normalizedMessage.includes('policy') || 
    normalizedMessage.includes('permission denied') ||
    normalizedMessage.includes('new row violates row-level security policy') ||
    normalizedMessage.includes('row-level security') ||
    normalizedDetails.includes('policy') ||
    normalizedHint.includes('policy');

  if (isRLSPolicyError) {
    // Get usage info to provide helpful message
    try {
      const usageInfo = await supabaseLimitCheckService.getUsageLimitInfo(metric);
      const metricNames: Partial<Record<UsageMetric, string>> = {
        users: 'users',
        projects: 'projects',
        forms: 'forms',
        form_responses: 'form responses',
        reports: 'reports',
        feedback_forms: 'feedback forms',
        kobo_tables: 'Kobo table integrations',
        strategic_plans: 'strategic plans',
        storage_gb: 'storage',
      };

      const metricName = metricNames[metric] || metric;
      const limitText = usageInfo.isUnlimited ? 'unlimited' : usageInfo.limit.toString();

      return new Error(
        `You have reached your ${metricName} limit (${usageInfo.currentUsage}/${limitText}). ` +
        `Please upgrade your plan to ${operation === 'create' ? 'create' : 'update'} more ${metricName}.`
      );
    } catch (usageError) {
      // Fallback if we can't get usage info
      return new Error(
        `Unable to ${operation} due to subscription limits. Please upgrade your plan or contact support.`
      );
    }
  }

  // Check for specific error codes that might be subscription-related
  if (errorCode && ERROR_CODE_MESSAGES[errorCode]) {
    return new Error(ERROR_CODE_MESSAGES[errorCode](metric));
  }

  // For all other errors, preserve the original error message
  // This includes validation errors, constraint violations, network errors, etc.
  if (error instanceof Error) {
    return error;
  }

  // If error is an object but not an Error instance, create a new Error with the message
  if (errorMessage) {
    return new Error(errorMessage);
  }

  // Last resort fallback
  return new Error('An unexpected error occurred. Please try again or contact support.');
}

/**
 * Wraps a service call with subscription error handling
 */
export async function withSubscriptionErrorHandling<T>(
  serviceCall: () => Promise<T>,
  metric: UsageMetric,
  operation: 'create' | 'update' = 'create'
): Promise<T> {
  try {
    return await serviceCall();
  } catch (error: any) {
    // Check if it's a subscription-related error
    const handledError = await handleSubscriptionError(error, metric, operation);
    throw handledError;
  }
}

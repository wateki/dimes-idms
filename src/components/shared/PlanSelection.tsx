import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface Plan {
  code: string;
  name: string;
  price: string;
  period: string;
  amount: number;
  maxUsers: number;
  maxProjects: number;
  features: string[];
  isCurrent?: boolean;
}

interface PlanSelectionProps {
  plans: Plan[];
  selectedPlanCode?: string;
  onPlanSelect: (planCode: string) => void | Promise<void>;
  processing?: boolean;
  showAnnualToggle?: boolean;
  isAnnual?: boolean;
  onAnnualToggle?: (isAnnual: boolean) => void;
  getAnnualPrice?: (amount: number) => string;
  getMonthlyEquivalent?: (amount: number) => string;
  getPlanCode?: (monthlyCode: string) => string;
}

export function PlanSelection({
  plans,
  selectedPlanCode,
  onPlanSelect,
  processing = false,
  showAnnualToggle = false,
  isAnnual = false,
  onAnnualToggle,
  getAnnualPrice,
  getMonthlyEquivalent,
  getPlanCode,
}: PlanSelectionProps) {
  const handlePlanClick = (plan: Plan) => {
    const planCode = getPlanCode ? getPlanCode(plan.code) : plan.code;
    onPlanSelect(planCode);
  };

  return (
    <div className="space-y-6">
      {/* Annual/Monthly Toggle - Only show for paid plans */}
      {showAnnualToggle && onAnnualToggle && (
        <div className="p-4 md:p-5 bg-muted rounded-lg border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1 flex-1">
              <Label htmlFor="annual-toggle" className="text-base font-medium cursor-pointer block">
                Annual billing
              </Label>
              <p className="text-sm text-muted-foreground">
                {isAnnual 
                  ? 'Save 10% with annual billing. You\'ll be charged once per year.'
                  : 'Switch to annual billing to save 10% on your subscription.'}
              </p>
            </div>
            <div className="flex-shrink-0">
              <Switch
                id="annual-toggle"
                checked={isAnnual}
                onCheckedChange={onAnnualToggle}
                className="sm:ml-4"
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {plans.map((plan) => {
          const isFree = plan.code === 'PLN_FREE';
          const isPopular = plan.code === 'PLN_a7qqm2p4q9ejdpt';
          const showCurrentBadge = plan.isCurrent && !isFree;
          const isSelected = selectedPlanCode === plan.code;
          
          return (
            <Card 
              key={plan.code} 
              className={`relative cursor-pointer transition-all h-full flex flex-col ${
                isPopular 
                  ? 'ring-2 ring-teal-500 border-teal-500 shadow-lg' 
                  : plan.isCurrent && !isFree
                    ? 'ring-2 ring-primary' 
                    : isSelected
                      ? 'ring-2 ring-blue-600 border-blue-600 shadow-lg'
                      : 'hover:border-gray-300 hover:shadow-md'
              }`}
              onClick={() => !plan.isCurrent && handlePlanClick(plan)}
            >
              {showCurrentBadge && (
                <Badge className="absolute top-3 right-3 text-xs" variant="default">
                  CURRENT
                </Badge>
              )}
              {isPopular && !showCurrentBadge && (
                <Badge className="absolute top-3 right-3 text-xs bg-pink-500" variant="default">
                  POPULAR
                </Badge>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-xl md:text-2xl">{plan.name}</CardTitle>
                <div className="mt-3">
                  {isFree ? (
                    <>
                      <span className="text-2xl md:text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm md:text-base">/{plan.period}</span>
                    </>
                  ) : isAnnual && getAnnualPrice && getMonthlyEquivalent ? (
                    <>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-bold break-words">{getAnnualPrice(plan.amount)}</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300 text-xs whitespace-nowrap">
                          Save 10%
                        </Badge>
                      </div>
                      <div className="text-xs md:text-sm text-muted-foreground mt-1.5 break-words">
                        {getMonthlyEquivalent(plan.amount)}/month billed annually
                      </div>
                      <div className="text-xs text-muted-foreground line-through mt-1">
                        {plan.price}/month × 12
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl md:text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm md:text-base">/{plan.period}</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow pt-0">
                <ul className="space-y-2.5 md:space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-2.5 mt-0.5 flex-shrink-0" />
                      <span className="text-xs md:text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  {plan.isCurrent ? (
                    <Button disabled variant="outline" className="w-full">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlanClick(plan);
                      }}
                      className={`w-full ${
                        isPopular 
                          ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                          : ''
                      }`}
                      variant={isPopular ? 'default' : isSelected ? 'default' : 'outline'}
                      disabled={processing}
                      size="lg"
                    >
                      {processing 
                        ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        )
                        : 'Select Plan'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


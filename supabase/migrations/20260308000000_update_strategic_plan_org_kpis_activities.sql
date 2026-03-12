-- Update strategic plan structure for organisation-wide KPIs and activities
-- Mirrors Prisma models in backend/prisma/schema.prisma (StrategicPlan, StrategicKPI, StrategicActivity, StrategicActivityLink)

-- 1) Strategic KPIs: add plan-level support and monitoring fields
alter table public.strategic_kpis
  add column if not exists "strategicPlanId" text,
  add column if not exists "name" text,
  add column if not exists "baseYear" integer,
  add column if not exists "baseYearValue" double precision;

-- Allow plan-level KPIs not tied directly to a subgoal
alter table public.strategic_kpis
  alter column "strategicSubGoalId" drop not null;

-- Optionally link KPIs directly to strategic_plans
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'strategic_kpis_strategicPlanId_fkey'
  ) then
    alter table public.strategic_kpis
      add constraint strategic_kpis_strategicPlanId_fkey
        foreign key ("strategicPlanId") references public.strategic_plans("id") on delete cascade;
  end if;
end$$;

-- 2) Annual targets per KPI
create table if not exists public.strategic_kpi_annual_targets (
  "id" text primary key default gen_random_uuid(),
  "strategicKpiId" text not null references public.strategic_kpis("id") on delete cascade,
  "year" integer not null,
  "targetValue" double precision not null,
  "createdAt" timestamp without time zone not null default now(),
  "updatedAt" timestamp without time zone not null default now(),
  "organizationid" text not null
);

create unique index if not exists strategic_kpi_annual_targets_kpi_year_idx
  on public.strategic_kpi_annual_targets("strategicKpiId","year");

-- 3) Organisation-wide strategic activities at plan level
create table if not exists public.strategic_activities (
  "id" text primary key default gen_random_uuid(),
  "strategicPlanId" text not null references public.strategic_plans("id") on delete cascade,
  "title" text not null,
  "description" text,
  "code" text,
  "order" integer not null default 0,
  "timeframeQ1" boolean not null default false,
  "timeframeQ2" boolean not null default false,
  "timeframeQ3" boolean not null default false,
  "timeframeQ4" boolean not null default false,
  "annualTarget" double precision,
  "indicatorText" text,
  "plannedBudget" double precision,
  "strategicKpiId" text references public.strategic_kpis("id") on delete set null,
  "createdAt" timestamp without time zone not null default now(),
  "updatedAt" timestamp without time zone not null default now(),
  "createdBy" text not null,
  "updatedBy" text not null,
  "organizationid" text not null
);

-- 4) Richer linkages from subgoals to activities/KPIs
alter table public.strategic_activity_links
  add column if not exists "strategicKpiId" text,
  add column if not exists "strategicActivityId" text,
  add column if not exists "code" text,
  add column if not exists "responsibleCountry" text,
  add column if not exists "timeframeQ1" boolean not null default false,
  add column if not exists "timeframeQ2" boolean not null default false,
  add column if not exists "timeframeQ3" boolean not null default false,
  add column if not exists "timeframeQ4" boolean not null default false,
  add column if not exists "annualTarget" double precision,
  add column if not exists "indicatorText" text,
  add column if not exists "plannedBudget" double precision;

-- Foreign keys for new linkage columns (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'strategic_activity_links_strategicKpiId_fkey'
  ) then
    alter table public.strategic_activity_links
      add constraint strategic_activity_links_strategicKpiId_fkey
        foreign key ("strategicKpiId") references public.strategic_kpis("id") on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'strategic_activity_links_strategicActivityId_fkey'
  ) then
    alter table public.strategic_activity_links
      add constraint strategic_activity_links_strategicActivityId_fkey
        foreign key ("strategicActivityId") references public.strategic_activities("id") on delete set null;
  end if;
end$$;


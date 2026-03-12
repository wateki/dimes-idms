-- Allow activity links to reference organisation-wide activities (strategicActivityId)
-- instead of project activities. When strategicActivityId is set, projectId/activityId can be null.
alter table public.strategic_activity_links
  alter column "projectId" drop not null,
  alter column "projectName" drop not null,
  alter column "activityId" drop not null,
  alter column "activityTitle" drop not null;

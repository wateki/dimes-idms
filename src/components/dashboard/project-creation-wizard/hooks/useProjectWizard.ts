import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { toast } from '@/hooks/use-toast';

import { projectDataApi, CreateOutcomeDto, CreateActivityDto, CreateKPIDto } from '@/lib/api/projectDataApi';
import { generateOutcomeId, generateActivityId, generateKpiId, generateProjectId } from '@/lib/uuid';
import { 
  saveWizardDraft, 
  loadWizardDraft, 
  hasWizardDraft, 
  clearWizardDraft, 
  autoSaveWizardDraft, 
  clearAutoSaveTimeout 
} from '@/lib/localStorageUtils';
import { 
  ProjectFormData, 
  OutcomeFormData, 
  ActivityFormData, 
  KPIFormData, 
  WizardStep,
  WizardState 
} from '../types';

export function useProjectWizard() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user } = useAuth();
  const { 
    addProject, 
    updateProject, 
    getProjectById, 
    projects,
    isLoading: projectsLoading,
    getProjectOutcomes,
    getProjectActivities,
    getProjectKPIs,
    triggerDataRefresh
  } = useProjects();
  const isEditMode = Boolean(projectId);
  
  // Store original project data for comparison in edit mode
  const [originalProjectData, setOriginalProjectData] = useState<any>(null);
  
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 0,
    projectData: {
      id: '',
      name: '',
      description: '',
      country: '',
      status: 'PLANNING',
      startDate: undefined,
      endDate: undefined,
      budget: 0,
      backgroundInformation: '',
      mapData: undefined,
      theoryOfChange: undefined,
    },
    outcomes: [],
    activities: [],
    kpis: [],
  });

  const steps: WizardStep[] = [
    { id: 'project', title: 'Project Details', description: 'Basic project information' },
    { id: 'overview', title: 'Project Overview', description: 'Background, map, and theory of change' },
    { id: 'outcomes', title: 'Outcomes', description: 'Define project outcomes' },
    { id: 'activities', title: 'Activities', description: 'Add activities for each outcome' },
    { id: 'kpis', title: 'KPIs', description: 'Define key performance indicators' },
    { id: 'review', title: 'Review', description: isEditMode ? 'Review and update project' : 'Review and create project' },
  ];

  // Load existing project data when in edit mode or load draft for new projects
  useEffect(() => {
    console.log('useProjectWizard useEffect triggered:', { 
      isEditMode, 
      projectId, 
      user: !!user, 
      projectsCount: projects.length,
      projectsLoading,
      hasGetProjectById: !!getProjectById
    });
    
    if (isEditMode && projectId && user && !projectsLoading && projects.length > 0) {
      const project = getProjectById(projectId);
      console.log('Found project for editing:', project);
      
      if (project) {
        // Store original project data for comparison
        setOriginalProjectData({
          project: { ...project },
          outcomes: [],
          activities: [],
          kpis: []
        });
        
        // Load project basic info into local copy
        const updatedProjectData = {
          id: project.id,
          name: project.name,
          description: project.description,
          country: project.country,
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate,
          budget: project.budget,
          backgroundInformation: project.backgroundInformation || '',
          mapData: project.mapData,
          theoryOfChange: project.theoryOfChange,
        };
        
        console.log('Setting wizard state with project data:', updatedProjectData);
        
        setWizardState(prev => {
          const newState = {
            ...prev,
            projectData: updatedProjectData
          };
          console.log('New wizard state after setting project data:', newState);
          return newState;
        });

        // Load outcomes, activities, and KPIs from API
        const loadProjectData = async () => {
          try {
            const [outcomesData, activitiesData, kpisData] = await Promise.all([
              getProjectOutcomes(projectId),
              getProjectActivities(projectId),
              getProjectKPIs(projectId)
            ]);

            // Store original data for comparison
            setOriginalProjectData((prev: any) => ({
              ...prev,
              outcomes: [...outcomesData],
              activities: [...activitiesData],
              kpis: [...kpisData]
            }));
            
            // Load into local copy
            setWizardState(prev => ({
              ...prev,
              outcomes: outcomesData.map((outcome: any) => ({
                id: outcome.id,
                title: outcome.title,
                description: outcome.description,
                target: outcome.target || 0,
                current: outcome.current ?? 0,
                unit: outcome.unit || '',
                progress: outcome.progress ?? 0,
              })),
              activities: activitiesData.map((activity: any) => ({
                id: activity.id,
                outcomeId: activity.outcomeId,
                title: activity.title,
                description: activity.description,
                startDate: activity.startDate,
                endDate: activity.endDate,
                responsible: activity.responsible,
                progress: activity.progress ?? 0,
              })),
              kpis: kpisData.map((kpi: any) => ({
                id: kpi.outcomeId + '-' + kpi.name.toLowerCase().replace(/\s+/g, '-'),
                outcomeId: kpi.outcomeId,
                name: kpi.name,
                target: kpi.target,
                current: kpi.current ?? kpi.value ?? 0,
                unit: kpi.unit,
                type: kpi.type,
              })),
            }));
            setOriginalProjectData((prev: any) => (prev ? {
              ...prev,
              outcomes: outcomesData,
              activities: activitiesData,
              kpis: kpisData,
            } : prev));
          } catch (error) {
            console.error('Error loading project data from API:', error);
            toast({
              title: "Error Loading Project",
              description: "Could not load project data for editing.",
              variant: "destructive",
            });
          }
        };

        loadProjectData();
      }
    } else if (!isEditMode) {
      // Load draft for new project creation
      const draft = loadWizardDraft();
      if (draft) {
        setWizardState(draft);
      }
    }
  }, [isEditMode, projectId, user?.id, projectsLoading, projects.length]);

  // Auto-save draft when wizard state changes (only for new projects)
  useEffect(() => {
    if (!isEditMode && wizardState.projectData.name) {
      autoSaveWizardDraft(wizardState);
    }
    
    // Cleanup auto-save timeout on unmount
    return () => {
      clearAutoSaveTimeout();
    };
  }, [wizardState, isEditMode]);

  // Handle project data changes
  const handleProjectChange = (field: keyof ProjectFormData, value: any) => {
    setWizardState(prev => {
      const updated = { ...prev.projectData, [field]: value };
      // Only auto-generate ID for new projects, not when editing
      if (field === 'name' && !isEditMode && !updated.id) {
        updated.id = generateProjectId();
      }
      return {
        ...prev,
        projectData: updated,
      };
    });
  };

  // Outcome management functions
  const addOutcome = () => {
    const newOutcome: OutcomeFormData = {
      id: generateOutcomeId(),
      title: '',
      description: '',
      target: 0,
      current: 0,
      unit: '',
      progress: 0,
    };
    setWizardState(prev => ({
      ...prev,
      outcomes: [...prev.outcomes, newOutcome],
    }));
  };

  const updateOutcome = (index: number, field: keyof OutcomeFormData, value: any) => {
    setWizardState(prev => {
      const updated = [...prev.outcomes];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        outcomes: updated,
      };
    });
  };

  const removeOutcome = (index: number) => {
    const outcomeId = wizardState.outcomes[index].id;
    setWizardState(prev => ({
      ...prev,
      outcomes: prev.outcomes.filter((_, i) => i !== index),
      activities: prev.activities.filter(activity => activity.outcomeId !== outcomeId),
      kpis: prev.kpis.filter(kpi => kpi.outcomeId !== outcomeId),
    }));
  };

  // Activity management functions
  const addActivity = (outcomeId: string) => {
    const newActivity: ActivityFormData = {
      id: generateActivityId(),
      outcomeId,
      title: '',
      description: '',
      responsible: '',
      startDate: undefined,
      endDate: undefined,
      progress: 0,
    };
    setWizardState(prev => ({
      ...prev,
      activities: [...prev.activities, newActivity],
    }));
  };

  const updateActivity = (index: number, field: keyof ActivityFormData, value: any) => {
    setWizardState(prev => {
      const updated = [...prev.activities];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        activities: updated,
      };
    });
  };

  const removeActivity = (index: number) => {
    setWizardState(prev => ({
      ...prev,
      activities: prev.activities.filter((_, i) => i !== index),
    }));
  };

  // KPI management functions
  const addKPI = (outcomeId: string) => {
    const newKPI: KPIFormData = {
      id: generateKpiId(),
      outcomeId,
      name: '',
      target: 0,
      current: 0,
      unit: '',
      type: 'bar',
    };
    setWizardState(prev => ({
      ...prev,
      kpis: [...prev.kpis, newKPI],
    }));
  };

  const updateKPI = (index: number, field: keyof KPIFormData, value: any) => {
    setWizardState(prev => {
      const updated = [...prev.kpis];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        kpis: updated,
      };
    });
  };

  const removeKPI = (index: number) => {
    setWizardState(prev => ({
      ...prev,
      kpis: prev.kpis.filter((_, i) => i !== index),
    }));
  };

  // Navigation functions
  const nextStep = () => {
    if (wizardState.currentStep < steps.length - 1) {
      setWizardState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }));
    }
  };

  const prevStep = () => {
    if (wizardState.currentStep > 0) {
      setWizardState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }));
    }
  };

  // Safe navigation that warns about unsaved changes
  const safeNavigate = (path: string) => {
    if (isEditMode && hasUnsavedChanges()) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.'
      );
      if (confirmed) {
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };

  // Save project
  const saveProject = async () => {
    try {
      const projectData = {
        name: wizardState.projectData.name,
        description: wizardState.projectData.description,
        country: wizardState.projectData.country,
        status: wizardState.projectData.status,
        startDate: wizardState.projectData.startDate || new Date(),
        endDate: wizardState.projectData.endDate || new Date(),
        progress: 0,
        budget: wizardState.projectData.budget,
        spent: 0,
        backgroundInformation: wizardState.projectData.backgroundInformation,
        mapData: wizardState.projectData.mapData,
        theoryOfChange: wizardState.projectData.theoryOfChange,
      };

      // Convert form data to the expected format for project data manager
      const outcomes = wizardState.outcomes.map(outcome => ({
        id: outcome.id,
        projectId: wizardState.projectData.id,
        title: outcome.title,
        description: outcome.description,
        target: outcome.target,
        current: outcome.current ?? 0,
        unit: outcome.unit,
        progress: outcome.progress ?? 0,
        status: 'ON_TRACK' as const,
      }));

      const activities = wizardState.activities.map(activity => ({
        id: activity.id,
        outcomeId: activity.outcomeId,
        title: activity.title,
        description: activity.description,
        progress: activity.progress ?? 0,
        status: 'NOT_STARTED' as const,
        startDate: activity.startDate || new Date(),
        endDate: activity.endDate || new Date(),
        responsible: activity.responsible,
      }));

      const kpis = wizardState.kpis.map(kpi => ({
        outcomeId: kpi.outcomeId,
        name: kpi.name,
        target: kpi.target,
        current: kpi.current ?? 0,
        unit: kpi.unit,
        type: 'progress' as const,
      }));

      if (isEditMode) {
        // Update existing project
        await updateProject(wizardState.projectData.id, projectData);
        
        // Save project data (outcomes, activities, KPIs) and wait for completion
        console.log(`💾 Saving project data: ${outcomes.length} outcomes, ${activities.length} activities, ${kpis.length} KPIs`);
        await saveOutcomesActivitiesKPIs(wizardState.projectData.id, outcomes, activities, kpis);
        console.log('✅ All database operations completed successfully');
        
        // Fetch fresh data directly after all save operations are complete
        console.log('🔄 Fetching fresh data post-save...');
        try {
          const [freshOutcomes, freshActivities] = await Promise.all([
            getProjectOutcomes(wizardState.projectData.id),
            getProjectActivities(wizardState.projectData.id),
          ]);
          console.log(`✨ Fresh data loaded: ${freshOutcomes.length} outcomes, ${freshActivities.length} activities`);
          
          // Trigger data refresh to ensure all components get the latest data
          triggerDataRefresh();
          
          toast({
            title: "Project Updated Successfully",
            description: `${wizardState.projectData.name} has been updated with ${freshOutcomes.length} outcomes, ${freshActivities.length} activities, and ${kpis.length} KPIs.`,
          });
          
          // Navigate immediately since all operations are complete and data is fresh
          console.log(`🧭 Navigating to project overview: /dashboard/projects/${wizardState.projectData.id}`);
          navigate(`/dashboard/projects/${wizardState.projectData.id}`);
          
        } catch (error) {
          console.error('❌ Error fetching fresh data after save:', error);
          // Fallback: trigger refresh and navigate with small delay
          triggerDataRefresh();
          setTimeout(() => {
            navigate(`/dashboard/projects/${wizardState.projectData.id}`);
          }, 500);
        }
      } else {
        // Create new project
        const newProject = await addProject(projectData);
        console.log(`✅ New project created: ${newProject.id}`);
        
        // Save project data (outcomes, activities, KPIs) to the new project and wait for completion
        console.log(`💾 Saving project data to new project: ${outcomes.length} outcomes, ${activities.length} activities, ${kpis.length} KPIs`);
        await saveOutcomesActivitiesKPIs(newProject.id, outcomes, activities, kpis);
        console.log('✅ All database operations completed for new project');
        
        // Trigger data refresh so all components reload their data
        triggerDataRefresh();
        
        toast({
          title: "Project Created Successfully",
          description: `${wizardState.projectData.name} has been created with ${outcomes.length} outcomes, ${activities.length} activities, and ${kpis.length} KPIs.`,
        });
        
        // Clear draft after successful save
        clearWizardDraft();
        
        // Navigate immediately since all operations are complete
        console.log(`🧭 Navigating to dashboard after new project creation`);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: isEditMode ? "Error Updating Project" : "Error Creating Project",
        description: "There was an error saving your project. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Save draft manually
  const saveDraft = () => {
    saveWizardDraft(wizardState);
    toast({
      title: "Draft Saved",
      description: "Your project draft has been saved successfully.",
    });
  };

  // Check if there are unsaved changes in edit mode
  const hasUnsavedChanges = () => {
    if (!isEditMode || !originalProjectData) return false;
    
    // Compare project data
    const originalProject = originalProjectData.project;
    const currentProject = wizardState.projectData;
    
    const projectChanged = 
      originalProject.name !== currentProject.name ||
      originalProject.description !== currentProject.description ||
      originalProject.country !== currentProject.country ||
      originalProject.status !== currentProject.status ||
      originalProject.budget !== currentProject.budget ||
      originalProject.backgroundInformation !== currentProject.backgroundInformation ||
      JSON.stringify(originalProject.mapData) !== JSON.stringify(currentProject.mapData) ||
      JSON.stringify(originalProject.theoryOfChange) !== JSON.stringify(currentProject.theoryOfChange);
    
    // Compare outcomes, activities, and KPIs
    const outcomesChanged = JSON.stringify(originalProjectData.outcomes) !== JSON.stringify(wizardState.outcomes);
    const activitiesChanged = JSON.stringify(originalProjectData.activities) !== JSON.stringify(wizardState.activities);
    const kpisChanged = JSON.stringify(originalProjectData.kpis) !== JSON.stringify(wizardState.kpis);
    
    return projectChanged || outcomesChanged || activitiesChanged || kpisChanged;
  };

  // Helper function to safely convert dates to ISO string
  const toISOString = (date: any): string | undefined => {
    if (!date) return undefined;
    if (date instanceof Date) return date.toISOString();
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }
    return undefined;
  };

  // Helper function to save outcomes, activities, and KPIs via API
  const saveOutcomesActivitiesKPIs = async (projectId: string, outcomes: any[], activities: any[], kpis: any[]) => {
    try {
      // Get original data for comparison
      const originalOutcomes = originalProjectData?.outcomes || [];
      const originalActivities = originalProjectData?.activities || [];
      const originalKPIs = originalProjectData?.kpis || [];

      // Handle Outcomes first and track ID mappings for new ones
      const outcomeIdMapping: { [frontendId: string]: string } = {};
      
      for (const outcome of outcomes) {
        const original = originalOutcomes.find((o: any) => o.id === outcome.id);
        const isNewItem = !original;
        if (isNewItem) {
          // Create new outcome
          const outcomeData: CreateOutcomeDto = {
            title: outcome.title,
            description: outcome.description,
            target: outcome.target || 0,
            current: outcome.current ?? 0,
            unit: outcome.unit || '',
            status: 'ON_TRACK' as const,
            progress: outcome.progress ?? 0,
          };
          const createdOutcome = await projectDataApi.createProjectOutcome(projectId, outcomeData);
          // Map frontend UUID to database UUID (they might be different)
          outcomeIdMapping[outcome.id] = createdOutcome.id;
          console.log(`Mapped outcome ID: ${outcome.id} -> ${createdOutcome.id}`);
        } else {
          // Update existing outcome if changed
          const needsUpdate = 
            original.title !== outcome.title ||
            original.description !== outcome.description ||
            original.target !== outcome.target ||
            original.current !== outcome.current ||
            original.progress !== outcome.progress ||
            original.status !== outcome.status;
          
          if (needsUpdate) {
            const updateData = {
              title: outcome.title,
              description: outcome.description,
              target: outcome.target || 0,
              current: outcome.current ?? original.current ?? 0,
              unit: outcome.unit || original.unit || '',
              status: outcome.status || 'ON_TRACK',
              progress: outcome.progress ?? original.progress ?? 0,
            };
            await projectDataApi.updateProjectOutcome(projectId, outcome.id, updateData);
          }
        }
      }

      // Delete removed outcomes
      for (const original of originalOutcomes) {
        const stillExists = outcomes.find((o: any) => o.id === original.id);
        if (!stillExists) {
          await projectDataApi.deleteProjectOutcome(projectId, original.id);
        }
      }

      // Handle Activities (now properly linked to outcomes via outcomeId)
      console.log('Outcome ID mapping:', outcomeIdMapping);
      
      for (const activity of activities) {
        const original = originalActivities.find((a: any) => a.id === activity.id);
        const isNewItem = !original;
        
        // Resolve the real outcomeId (use mapped ID if outcome was just created)
        const realOutcomeId = outcomeIdMapping[activity.outcomeId] || activity.outcomeId;
        console.log(`Activity ${activity.title}: mapping ${activity.outcomeId} -> ${realOutcomeId}`);
        
        if (isNewItem) {
          // Create new activity
          const activityData: CreateActivityDto = {
            outcomeId: realOutcomeId,
            title: activity.title,
            description: activity.description,
            responsible: activity.responsible || 'Unassigned',
            status: 'NOT_STARTED' as const,
            startDate: toISOString(activity.startDate) || new Date().toISOString(),
            endDate: toISOString(activity.endDate) || new Date().toISOString(),
            progress: activity.progress || 0,
          };
          await projectDataApi.createProjectActivity(projectId, activityData);
        } else {
          // Update existing activity if changed
          const needsUpdate = 
            original.title !== activity.title ||
            original.description !== activity.description ||
            original.status !== activity.status ||
            original.outcomeId !== activity.outcomeId ||
            original.progress !== activity.progress;
          
          if (needsUpdate) {
            const updateData = {
              outcomeId: realOutcomeId,
              title: activity.title,
              description: activity.description,
              responsible: activity.responsible || original.responsible || 'Unassigned',
              status: activity.status || 'NOT_STARTED',
              startDate: toISOString(activity.startDate) || original.startDate,
              endDate: toISOString(activity.endDate) || original.endDate,
              progress: activity.progress ?? original.progress ?? 0,
            };
            await projectDataApi.updateProjectActivity(projectId, activity.id, updateData);
          }
        }
      }

      // Delete removed activities
      for (const original of originalActivities) {
        const stillExists = activities.find((a: any) => a.id === original.id);
        if (!stillExists) {
          await projectDataApi.deleteProjectActivity(projectId, original.id);
        }
      }

      // Handle KPIs (note: backend API might not be fully implemented yet)
      // We'll implement this with error handling in case the endpoints don't exist
      try {
        for (const kpi of kpis) {
          const original = originalKPIs.find((k: any) => k.id === kpi.id);
          const isNewItem = !original;
          // Map frontend outcome ID to backend outcome ID
          const realKpiOutcomeId = outcomeIdMapping[kpi.outcomeId] || kpi.outcomeId;
          
          if (isNewItem) {
            // Create new KPI
            const kpiData: CreateKPIDto = {
              outcomeId: realKpiOutcomeId,
              name: kpi.name,
              title: kpi.name, // Keep for backward compatibility
              description: `KPI for project ${projectId}`,
              target: kpi.target,
              current: kpi.current ?? 0,
              unit: kpi.unit,
              type: kpi.type || 'bar',
              frequency: 'MONTHLY',
            };
            await projectDataApi.createProjectKPI(projectId, kpiData);
          } else {
            // Update existing KPI if changed
            const needsUpdate = 
              original.name !== kpi.name ||
              original.target !== kpi.target ||
              original.current !== kpi.current ||
              original.unit !== kpi.unit;
            
            if (needsUpdate) {
              const updateData = {
                title: kpi.name,
                target: kpi.target,
                current: kpi.current ?? original.current ?? 0,
                unit: kpi.unit,
              };
              await projectDataApi.updateProjectKPI(projectId, kpi.id, updateData);
            }
          }
        }

        // Delete removed KPIs
        for (const original of originalKPIs) {
          const stillExists = kpis.find((k: any) => k.id === original.id);
          if (!stillExists) {
            await projectDataApi.deleteProjectKPI(projectId, original.id);
          }
        }
      } catch (kpiError) {
        console.warn('KPI operations failed (API might not be fully implemented):', kpiError);
        // Continue without failing the entire save operation
      }

    } catch (error) {
      console.error('Error saving outcomes/activities/KPIs:', error);
      throw error;
    }
  };

  // Save edits (for edit mode) - now only saves when user completes the process
  const saveEdits = async () => {
    try {
      const projectData = {
        name: wizardState.projectData.name,
        description: wizardState.projectData.description,
        country: wizardState.projectData.country,
        status: wizardState.projectData.status,
        startDate: wizardState.projectData.startDate || new Date(),
        endDate: wizardState.projectData.endDate || new Date(),
        progress: 0,
        budget: wizardState.projectData.budget,
        spent: 0,
        backgroundInformation: wizardState.projectData.backgroundInformation,
        mapData: wizardState.projectData.mapData,
        theoryOfChange: wizardState.projectData.theoryOfChange,
      };

      // Convert form data to the expected format for project data manager
      const outcomes = wizardState.outcomes.map(outcome => ({
        id: outcome.id,
        projectId: wizardState.projectData.id,
        title: outcome.title,
        description: outcome.description,
        target: outcome.target,
        current: outcome.current ?? 0,
        unit: outcome.unit,
        progress: outcome.progress ?? 0,
        status: 'ON_TRACK' as const,
      }));

      const activities = wizardState.activities.map(activity => ({
        id: activity.id,
        outcomeId: activity.outcomeId,
        title: activity.title,
        description: activity.description,
        progress: activity.progress ?? 0,
        status: 'NOT_STARTED' as const,
        startDate: activity.startDate || new Date(),
        endDate: activity.endDate || new Date(),
        responsible: activity.responsible,
      }));

      const kpis = wizardState.kpis.map(kpi => ({
        outcomeId: kpi.outcomeId,
        name: kpi.name,
        target: kpi.target,
        current: kpi.current ?? 0,
        unit: kpi.unit,
        type: 'progress' as const,
      }));

      // Update basic project data
      await updateProject(wizardState.projectData.id, projectData);

      // Save project data (outcomes, activities, KPIs) using API
      await saveOutcomesActivitiesKPIs(wizardState.projectData.id, outcomes, activities, kpis);
      
      // Update original data to reflect saved state
      setOriginalProjectData({
        project: { id: wizardState.projectData.id, ...projectData },
        outcomes: [...outcomes],
        activities: [...activities],
        kpis: [...kpis]
      });
      
      toast({
        title: "Project Saved Successfully",
        description: `Your project changes have been saved successfully with ${outcomes.length} outcomes, ${activities.length} activities, and ${kpis.length} KPIs.`,
      });
      
      // Navigate back to the project overview page
      navigate(`/dashboard/projects/${wizardState.projectData.id}`);
    } catch (error) {
      console.error('Error saving edits:', error);
      toast({
        title: "Error Saving Edits",
        description: "There was an error saving your changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Clear draft
  const clearDraft = () => {
    clearWizardDraft();
    setWizardState({
      currentStep: 0,
      projectData: {
        id: '',
        name: '',
        description: '',
        country: '',
        status: 'PLANNING',
        startDate: undefined,
        endDate: undefined,
        budget: 0,
        backgroundInformation: '',
        mapData: undefined,
        theoryOfChange: undefined,
      },
      outcomes: [],
      activities: [],
      kpis: [],
    });
    toast({
      title: "Draft Cleared",
      description: "Your project draft has been cleared.",
    });
  };

      return {
      wizardState,
      steps,
      isEditMode,
      handleProjectChange,
      addOutcome,
      updateOutcome,
      removeOutcome,
      addActivity,
      updateActivity,
      removeActivity,
      addKPI,
      updateKPI,
      removeKPI,
      nextStep,
      prevStep,
      saveProject,
      saveDraft,
      saveEdits,
      clearDraft,
      hasDraft: hasWizardDraft,
      hasUnsavedChanges,
      navigate: safeNavigate,
    };
}
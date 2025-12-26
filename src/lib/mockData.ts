import { User, Project, Outcome, Activity, KPI } from '@/types/dashboard';

export const mockUser: User = {
  id: '1',
  organizationId: '1',
  firstName: 'Sarah',
  lastName: 'Johnson',
  email: 'sarah.johnson@ics.org',
  isActive: true,
  lastLoginAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  roles: [{
    id: '1',
    roleName: 'GLOBAL_ADMIN',
    level: 1,
    isActive: true
  }],
  projectAccess: [],
  permissions: []
};

export const mockProjects: Project[] = [
  {
    id: 'mameb',
    name: 'MaMeb',
    description: 'Maternal and Neonatal Health Project',
    country: 'Kenya',
    status: 'ACTIVE',
    startDate: new Date('2023-01-01'),
    endDate: new Date('2027-12-31'),
    progress: 45,
    budget: 2500000,
    spent: 1125000,
    backgroundInformation: 'The MaMeb project addresses critical gaps in maternal and neonatal healthcare in rural Kenya. The project focuses on improving access to quality healthcare services, strengthening community health systems, and reducing maternal and infant mortality rates through comprehensive interventions including capacity building, infrastructure development, and community engagement.',
    mapData: {
      type: 'data-visualization',
      title: 'Project Data Map',
      description: 'Visualization of project data from form responses with location information',
      mapProvider: 'openstreetmap',
      visualizationType: 'markers',
      center: { lat: -1.2921, lng: 36.8219 },
      zoom: 7,
      dataSource: 'form-responses'
    },
    theoryOfChange: {
      type: 'text',
      content: `INPUTS → ACTIVITIES → OUTPUTS → OUTCOMES → IMPACT

INPUTS:
• Healthcare infrastructure development
• Medical equipment and supplies
• Training programs for healthcare workers
• Community health worker networks

ACTIVITIES:
• Establish and upgrade health facilities
• Conduct maternal and neonatal care training
• Implement community health programs
• Provide mobile health services

OUTPUTS:
• Improved health facilities
• Trained healthcare workers
• Community health programs
• Mobile health services

OUTCOMES:
• Increased access to maternal care
• Improved neonatal survival rates
• Enhanced community health awareness
• Strengthened health systems

IMPACT:
• Reduced maternal mortality
• Reduced neonatal mortality
• Improved overall community health`,
      description: 'Theory of Change framework showing the logical pathway from inputs to impact'
    }
  },
  {
    id: 'vacis-ke',
    name: 'VACIS Kenya',
    description: 'Violence Against Children in Schools - Kenya',
    country: 'Kenya',
    status: 'ACTIVE',
    startDate: new Date('2023-06-01'),
    endDate: new Date('2026-05-31'),
    progress: 42,
    budget: 1800000,
    spent: 756000
  },
  {
    id: 'vacis-tz',
    name: 'VACIS Tanzania',
    description: 'Violence Against Children in Schools - Tanzania',
    country: 'Tanzania',
    status: 'ACTIVE',
    startDate: new Date('2023-06-01'),
    endDate: new Date('2026-05-31'),
    progress: 38,
    budget: 1600000,
    spent: 608000
  },
  {
    id: 'cdw',
    name: 'CDW',
    description: 'Community Development for Women',
    country: 'Kenya',
    status: 'ACTIVE',
    startDate: new Date('2023-03-01'),
    endDate: new Date('2026-02-28'),
    progress: 35,
    budget: 1200000,
    spent: 420000
  },
  {
    id: 'kuimarisha',
    name: 'Kuimarisha',
    description: 'Early Childhood Development Program',
    country: 'Kenya',
    status: 'ACTIVE',
    startDate: new Date('2023-01-15'),
    endDate: new Date('2025-12-31'),
    progress: 52,
    budget: 950000,
    spent: 494000
  },
  {
    id: 'nppp',
    name: 'NPPP',
    description: 'National Parenting Program Project',
    country: 'Kenya',
    status: 'ACTIVE',
    startDate: new Date('2023-04-01'),
    endDate: new Date('2026-03-31'),
    progress: 30,
    budget: 800000,
    spent: 240000
  },
  {
    id: 'aacl',
    name: 'AACL',
    description: 'Accelerated Action for Children Learning',
    country: 'Kenya',
    status: 'ACTIVE',
    startDate: new Date('2023-02-01'),
    endDate: new Date('2025-01-31'),
    progress: 60,
    budget: 700000,
    spent: 420000
  }
];

export const mockOutcomes: Outcome[] = [
  {
    id: 'outcome-1',
    projectId: 'vacis',
    title: 'Enhanced Parent-Teacher-Learner Collaboration',
    description: 'Enhanced collaboration between parents, teachers and learners resulting in improved learning and protection outcomes',
    target: 100,
    current: 68,
    unit: '% improvement',
    progress: 68,
    status: 'ON_TRACK'
  },
  {
    id: 'outcome-2',
    projectId: 'vacis',
    title: 'Community and Religious Leaders Engagement',
    description: '100 community and religious leaders model and promote the right to learning and protection and take action to coordinate efforts towards the realization of child rights at all levels',
    target: 100,
    current: 72,
    unit: 'leaders',
    progress: 72,
    status: 'ON_TRACK'
  },
  {
    id: 'outcome-3',
    projectId: 'vacis',
    title: 'School Capacity and Resources',
    description: 'Schools have the right capacity, resources, and policies and are implementing actions in collaboration with education stakeholders towards better safety and learning outcomes for children',
    target: 5,
    current: 3,
    unit: 'schools',
    progress: 60,
    status: 'ON_TRACK'
  },
  {
    id: 'outcome-4',
    projectId: 'vacis',
    title: 'Government and CSO Collaboration',
    description: 'Collaborate with Government and CSOs in conducting stakeholders\' engagement meetings to raise awareness on children rights and the importance for their protection and well-being',
    target: 12,
    current: 7,
    unit: 'meetings',
    progress: 58,
    status: 'ON_TRACK'
  }
];

export const mockActivities: Activity[] = [
  // Outcome 1 Activities
  {
    id: 'activity-1.1',
    outcomeId: 'outcome-1',
    title: 'Recruitment and training of mentors',
    description: 'Recruit and train 5 mentors (1 per school) with refreshments and transport reimbursement',
    progress: 80,
    status: 'IN_PROGRESS',
    startDate: new Date('2023-02-01'),
    endDate: new Date('2024-01-31'),
    responsible: 'Mary Wanjiku'
  },
  {
    id: 'activity-1.2',
    outcomeId: 'outcome-1',
    title: 'Formation of child rights clubs',
    description: 'Form child rights clubs where children meet to express opinions, discuss rights and plan advocacy (two clubs per school in 5 schools)',
    progress: 70,
    status: 'IN_PROGRESS',
    startDate: new Date('2023-03-01'),
    endDate: new Date('2024-02-28'),
    responsible: 'John Kimani'
  },
  {
    id: 'activity-1.3',
    outcomeId: 'outcome-1',
    title: 'Establish child friendly reporting mechanisms',
    description: 'Establish child friendly reporting mechanisms within schools and communities that encourage children to report violence and seek support',
    progress: 85,
    status: 'IN_PROGRESS',
    startDate: new Date('2023-01-15'),
    endDate: new Date('2023-12-31'),
    responsible: 'Grace Muthoni'
  },
  {
    id: 'activity-1.4',
    outcomeId: 'outcome-1',
    title: 'Child-friendly key messages creation',
    description: 'Engage children in creating child friendly key messages through artwork, illustrations, storytelling, writings, and songs',
    progress: 60,
    status: 'IN_PROGRESS',
    startDate: new Date('2023-04-01'),
    endDate: new Date('2024-03-31'),
    responsible: 'Peter Ochieng'
  },
  {
    id: 'activity-1.5',
    outcomeId: 'outcome-1',
    title: 'Children\'s participation in assemblies and events',
    description: 'Facilitate learners to participate in children\'s assemblies, summits, inter-school debates, and cultural days',
    progress: 45,
    status: 'IN_PROGRESS',
    startDate: new Date('2023-05-01'),
    endDate: new Date('2024-04-30'),
    responsible: 'Anne Njeri'
  },
  {
    id: 'activity-1.6',
    outcomeId: 'outcome-1',
    title: 'Media campaigns for children',
    description: 'Conduct media campaigns for children to express their views and raise awareness',
    progress: 30,
    status: 'IN_PROGRESS',
    startDate: new Date('2023-06-01'),
    endDate: new Date('2024-05-31'),
    responsible: 'David Mutua'
  },
  // Outcome 2 Activities
  {
    id: 'activity-2.1',
    outcomeId: 'outcome-2',
    title: 'Skillful parenting training',
    description: 'Train parents and caregivers on positive parenting skills and child development',
    progress: 75,
    status: 'IN_PROGRESS',
    startDate: new Date('2023-03-01'),
    endDate: new Date('2024-02-29'),
    responsible: 'Susan Wanjiru'
  },
  {
    id: 'activity-2.2',
    outcomeId: 'outcome-2',
    title: 'Parent-teacher collaboration initiatives',
    description: 'Launch collaborative initiatives between parents, caregivers, and teachers for safe learning environments',
    progress: 55,
    status: 'IN_PROGRESS',
    startDate: new Date('2023-04-01'),
    endDate: new Date('2024-03-31'),
    responsible: 'James Kariuki'
  },
  // Outcome 3 Activities
  {
    id: 'activity-3.1',
    outcomeId: 'outcome-3',
    title: 'Community leaders mapping and training',
    description: 'Identify, map and train community and religious leaders on child rights and their roles as duty bearers',
    progress: 80,
    status: 'IN_PROGRESS',
    startDate: new Date('2023-02-01'),
    endDate: new Date('2024-01-31'),
    responsible: 'Pastor Michael Omondi'
  },
  {
    id: 'activity-3.2',
    outcomeId: 'outcome-3',
    title: 'Community awareness sessions',
    description: 'Conduct community awareness sessions led by trained religious and community leaders',
    progress: 65,
    status: 'IN_PROGRESS',
    startDate: new Date('2023-05-01'),
    endDate: new Date('2024-04-30'),
    responsible: 'Elder Sarah Akinyi'
  }
];

export const mockKPIs: KPI[] = [
  {
    id: 'kpi-1',
    name: 'Children with Rights Knowledge',
    value: 1350,
    target: 3000,
    unit: 'children',
    trend: 'up',
    change: 15
  },
  {
    id: 'kpi-2',
    name: 'Mentors Trained',
    value: 4,
    target: 5,
    unit: 'mentors',
    trend: 'up',
    change: 1
  },
  {
    id: 'kpi-3',
    name: 'Child Rights Clubs Formed',
    value: 7,
    target: 10,
    unit: 'clubs',
    trend: 'up',
    change: 2
  },
  {
    id: 'kpi-4',
    name: 'Parents Trained in Skillful Parenting',
    value: 245,
    target: 400,
    unit: 'parents',
    trend: 'up',
    change: 35
  },
  {
    id: 'kpi-5',
    name: 'Community Leaders Trained',
    value: 72,
    target: 100,
    unit: 'leaders',
    trend: 'up',
    change: 8
  },
  {
    id: 'kpi-6',
    name: 'Schools with Enhanced Capacity',
    value: 3,
    target: 5,
    unit: 'schools',
    trend: 'up',
    change: 1
  }
];

// Detailed outputs for Outcome 1
export const outcome1Outputs = [
  {
    id: 'output-1.1',
    title: '% of children who report improved knowledge on their rights and responsibilities',
    target: 80,
    current: 65,
    unit: '%'
  },
  {
    id: 'output-1.2',
    title: '% of children actively using safe platforms to engage on their rights',
    target: 70,
    current: 45,
    unit: '%'
  },
  {
    id: 'output-1.3',
    title: '# of mentors trained on life skills value-based education',
    target: 5,
    current: 4,
    unit: 'mentors'
  },
  {
    id: 'output-1.4',
    title: '# of children participating in life skills value-based education',
    target: 3000,
    current: 1350,
    unit: 'children'
  },
  {
    id: 'output-1.5',
    title: '# of clubs created or strengthened to empower children',
    target: 10,
    current: 7,
    unit: 'clubs'
  },
  {
    id: 'output-1.6',
    title: '# of children actively participating in club activities',
    target: 2500,
    current: 980,
    unit: 'children'
  },
  {
    id: 'output-1.7',
    title: '# of learners sensitized on speak out boxes',
    target: 3000,
    current: 2100,
    unit: 'learners'
  },
  {
    id: 'output-1.8',
    title: '% of learners utilizing child-friendly reporting mechanisms',
    target: 60,
    current: 42,
    unit: '%'
  },
  {
    id: 'output-1.9',
    title: '# of incidences reported through speak out boxes',
    target: 50,
    current: 23,
    unit: 'incidents'
  }
];

// Sub-activities for detailed tracking
export const subActivities = [
  {
    id: 'sub-activity-1.3.1',
    parentId: 'activity-1.3',
    title: 'Sensitize schools on the use of speakout box',
    progress: 100,
    status: 'COMPLETED'
  },
  {
    id: 'sub-activity-1.3.2',
    parentId: 'activity-1.3',
    title: 'Provide talking walls and speak out boxes in schools (1 per school)',
    progress: 80,
    status: 'IN_PROGRESS'
  },
  {
    id: 'sub-activity-1.3.3',
    parentId: 'activity-1.3',
    title: 'Facilitate referral and response to children - Case management',
    progress: 70,
    status: 'IN_PROGRESS'
  },
  {
    id: 'sub-activity-1.4.1',
    parentId: 'activity-1.4',
    title: 'Hold consultative meeting with children',
    progress: 90,
    status: 'IN_PROGRESS'
  },
  {
    id: 'sub-activity-1.4.2',
    parentId: 'activity-1.4',
    title: 'Develop key messages',
    progress: 60,
    status: 'IN_PROGRESS'
  },
  {
    id: 'sub-activity-1.5.1',
    parentId: 'activity-1.5',
    title: 'Support children in clubs to meaningfully participate in debates and assemblies',
    progress: 50,
    status: 'IN_PROGRESS'
  },
  {
    id: 'sub-activity-1.5.2',
    parentId: 'activity-1.5',
    title: 'Support children to participate in international days',
    progress: 40,
    status: 'IN_PROGRESS'
  },
  {
    id: 'sub-activity-1.5.3',
    parentId: 'activity-1.5',
    title: 'Support children to participate in advocacy platforms and summits',
    progress: 30,
    status: 'IN_PROGRESS'
  },
  {
    id: 'sub-activity-1.5.4',
    parentId: 'activity-1.5',
    title: 'Procure project banners, fliers, summaries, t-shirts, reflector jackets',
    progress: 85,
    status: 'IN_PROGRESS'
  },
  {
    id: 'sub-activity-1.6.1',
    parentId: 'activity-1.6',
    title: 'Training children on reporting and journalism',
    progress: 25,
    status: 'IN_PROGRESS'
  },
  {
    id: 'sub-activity-1.6.2',
    parentId: 'activity-1.6',
    title: 'Subscription/facilitation for media campaigns',
    progress: 35,
    status: 'IN_PROGRESS'
  },
  {
    id: 'sub-activity-1.6.3',
    parentId: 'activity-1.6',
    title: 'Creating awareness on environment and climate change through clubs',
    progress: 20,
    status: 'NOT_STARTED'
  }
];

// Comprehensive mock data for all outcomes, outputs, and activities
export const comprehensiveOutcomesData = {
  '1': {
    id: '1',
    title: 'Children\'s Rights & Empowerment',
    description: 'Children feel empowered and are playing a meaningful role in decisions that affect their lives, including demanding protection from violence and claiming their rights.',
    target: 3000,
    current: 1350,
    unit: 'children',
    status: 'ON_TRACK',
    progress: 45,
    outputs: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9'],
    activities: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6']
  },
  '2': {
    id: '2',
    title: 'Parent-Teacher Collaboration',
    description: 'Parents and teachers are working together to ensure children\'s well-being and educational success.',
    target: 200,
    current: 145,
    unit: 'parents',
    status: 'ON_TRACK',
    progress: 72,
    outputs: ['2.1', '2.2', '2.3', '2.4', '2.5'],
    activities: ['2.1']
  },
  '3': {
    id: '3',
    title: 'Community Leaders Engagement',
    description: 'Community and religious leaders are actively promoting positive parenting practices and child protection.',
    target: 85,
    current: 67,
    unit: '%',
    status: 'ON_TRACK',
    progress: 79,
    outputs: ['3.1', '3.2', '3.3', '3.4'],
    activities: ['3.1']
  },
  '4': {
    id: '4',
    title: 'School Capacity & Resources',
    description: 'Schools have improved capacity and resources to support children\'s holistic development and protection.',
    target: 5,
    current: 3,
    unit: 'schools',
    status: 'AT_RISK',
    progress: 60,
    outputs: ['4.1', '4.2'],
    activities: ['4.1']
  },
  '5': {
    id: '5',
    title: 'Government & CSO Collaboration',
    description: 'Government agencies and CSOs are working together effectively to protect children\'s rights.',
    target: 10,
    current: 6,
    unit: 'partnerships',
    status: 'ON_TRACK',
    progress: 60,
    outputs: ['5.1'],
    activities: ['5.1']
  }
};

export const comprehensiveOutputsData = {
  // Outcome 1 Outputs
  '1.1': {
    id: '1.1',
    title: 'Children who report improved knowledge on their rights',
    description: 'Percentage of children demonstrating improved understanding of their rights and responsibilities through assessments and surveys.',
    target: 80,
    current: 65,
    unit: '%',
    status: 'ON_TRACK',
    outcomeId: '1',
    activities: ['1.1', '1.2']
  },
  '1.2': {
    id: '1.2',
    title: 'Children actively using safe platforms to engage on their rights',
    description: 'Percentage of children utilizing designated safe platforms and mechanisms for expressing their views and concerns.',
    target: 70,
    current: 45,
    unit: '%',
    status: 'AT_RISK',
    outcomeId: '1',
    activities: ['1.2', '1.5']
  },
  '1.3': {
    id: '1.3',
    title: 'Mentors trained on life skills value-based education',
    description: 'Number of mentors successfully trained and certified in life skills value-based education methodologies.',
    target: 5,
    current: 4,
    unit: 'mentors',
    status: 'ON_TRACK',
    outcomeId: '1',
    activities: ['1.1']
  },
  '1.4': {
    id: '1.4',
    title: 'Children participating in life skills education',
    description: 'Number of children actively participating in life skills education programs.',
    target: 3000,
    current: 1350,
    unit: 'children',
    status: 'ON_TRACK',
    outcomeId: '1',
    activities: ['1.1', '1.4']
  },
  '1.5': {
    id: '1.5',
    title: 'Clubs created or strengthened',
    description: 'Number of child rights clubs that have been established or strengthened.',
    target: 10,
    current: 7,
    unit: 'clubs',
    status: 'ON_TRACK',
    outcomeId: '1',
    activities: ['1.2']
  },
  '1.6': {
    id: '1.6',
    title: 'Children in club activities',
    description: 'Number of children actively participating in club activities.',
    target: 2500,
    current: 980,
    unit: 'children',
    status: 'BEHIND',
    outcomeId: '1',
    activities: ['1.2', '1.5']
  },
  '1.7': {
    id: '1.7',
    title: 'Learners sensitized on speak out boxes',
    description: 'Number of learners who have been sensitized on the use of speak out boxes.',
    target: 3000,
    current: 2100,
    unit: 'learners',
    status: 'ON_TRACK',
    outcomeId: '1',
    activities: ['1.3']
  },
  '1.8': {
    id: '1.8',
    title: 'Using child-friendly reporting mechanisms',
    description: 'Percentage of children using child-friendly reporting mechanisms.',
    target: 60,
    current: 42,
    unit: '%',
    status: 'ON_TRACK',
    outcomeId: '1',
    activities: ['1.3']
  },
  '1.9': {
    id: '1.9',
    title: 'Incidents reported through speak out boxes',
    description: 'Number of incidents reported through speak out boxes.',
    target: 50,
    current: 23,
    unit: 'incidents',
    status: 'AT_RISK',
    outcomeId: '1',
    activities: ['1.3']
  },
  // Outcome 2 Outputs
  '2.1': {
    id: '2.1',
    title: 'Parents trained and graduated from Skilful parenting training',
    description: 'Number of parents who have successfully completed the comprehensive skilful parenting training program.',
    target: 200,
    current: 145,
    unit: 'parents',
    status: 'ON_TRACK',
    outcomeId: '2',
    activities: ['2.1']
  },
  '2.2': {
    id: '2.2',
    title: 'Parents demonstrating improved parenting skills',
    description: 'Percentage of parents demonstrating improved parenting skills through assessments.',
    target: 85,
    current: 72,
    unit: '%',
    status: 'ON_TRACK',
    outcomeId: '2',
    activities: ['2.1']
  },
  '2.3': {
    id: '2.3',
    title: 'Parent-teacher meetings held regularly',
    description: 'Number of schools where parent-teacher meetings are held regularly.',
    target: 5,
    current: 4,
    unit: 'schools',
    status: 'ON_TRACK',
    outcomeId: '2',
    activities: ['2.1']
  },
  '2.4': {
    id: '2.4',
    title: 'Parents actively involved in school activities',
    description: 'Percentage of parents actively involved in school activities.',
    target: 70,
    current: 58,
    unit: '%',
    status: 'AT_RISK',
    outcomeId: '2',
    activities: ['2.1']
  },
  '2.5': {
    id: '2.5',
    title: 'Positive parenting practices reported',
    description: 'Percentage of parents reporting use of positive parenting practices.',
    target: 80,
    current: 67,
    unit: '%',
    status: 'ON_TRACK',
    outcomeId: '2',
    activities: ['2.1']
  },
  // Outcome 3 Outputs
  '3.1': {
    id: '3.1',
    title: 'Parents reporting positive influence from community and religious leaders',
    description: 'Proportion of parents who report positive influence and support from trained community and religious leaders.',
    target: 85,
    current: 67,
    unit: '%',
    status: 'ON_TRACK',
    outcomeId: '3',
    activities: ['3.1']
  },
  '3.2': {
    id: '3.2',
    title: 'Community leaders actively promoting child protection',
    description: 'Number of community leaders actively promoting child protection practices.',
    target: 20,
    current: 15,
    unit: 'leaders',
    status: 'ON_TRACK',
    outcomeId: '3',
    activities: ['3.1']
  },
  '3.3': {
    id: '3.3',
    title: 'Community awareness sessions conducted',
    description: 'Number of community awareness sessions conducted by trained leaders.',
    target: 50,
    current: 32,
    unit: 'sessions',
    status: 'ON_TRACK',
    outcomeId: '3',
    activities: ['3.1']
  },
  '3.4': {
    id: '3.4',
    title: 'Community members reached through awareness campaigns',
    description: 'Number of community members reached through awareness campaigns.',
    target: 2000,
    current: 1280,
    unit: 'people',
    status: 'ON_TRACK',
    outcomeId: '3',
    activities: ['3.1']
  },
  // Outcome 4 Outputs
  '4.1': {
    id: '4.1',
    title: 'Schools with improved child protection policies',
    description: 'Number of schools with improved and implemented child protection policies.',
    target: 5,
    current: 3,
    unit: 'schools',
    status: 'AT_RISK',
    outcomeId: '4',
    activities: ['4.1']
  },
  '4.2': {
    id: '4.2',
    title: 'Teachers trained on child protection',
    description: 'Number of teachers trained on child protection and positive discipline.',
    target: 50,
    current: 28,
    unit: 'teachers',
    status: 'BEHIND',
    outcomeId: '4',
    activities: ['4.1']
  },
  // Outcome 5 Outputs
  '5.1': {
    id: '5.1',
    title: 'Government-CSO partnerships established',
    description: 'Number of formal partnerships established between government agencies and CSOs.',
    target: 10,
    current: 6,
    unit: 'partnerships',
    status: 'ON_TRACK',
    outcomeId: '5',
    activities: ['5.1']
  }
};

export const comprehensiveActivitiesData = {
  // Outcome 1 Activities
  '1.1': {
    id: '1.1',
    title: 'Recruitment and training of mentors',
    description: 'Training of 5 mentors (1 per school) with refreshments and transport reimbursement',
    outcomeId: '1',
    target: 5,
    current: 4,
    unit: 'mentors',
    status: 'ON_TRACK',
    budget: 15000,
    spent: 12000,
    startDate: '2023-01-15',
    endDate: '2023-12-31',
    responsible: 'Training Team',
    location: 'All 5 schools',
    subActivities: [
      {
        id: '1.1.1',
        title: 'Mentor recruitment and selection',
        description: 'Identify and recruit suitable mentors from each school',
        status: 'COMPLETED',
        progress: 100,
        dueDate: '2023-02-28'
      },
      {
        id: '1.1.2',
        title: 'Mentor training workshops',
        description: 'Conduct comprehensive training workshops for selected mentors',
        status: 'IN_PROGRESS',
        progress: 80,
        dueDate: '2023-08-31'
      },
      {
        id: '1.1.3',
        title: 'Mentor certification and ongoing support',
        description: 'Certify trained mentors and provide ongoing support',
        status: 'pending',
        progress: 20,
        dueDate: '2023-12-31'
      }
    ]
  },
  '1.2': {
    id: '1.2',
    title: 'Establish and strengthen child clubs',
    description: 'Establish new child clubs and strengthen existing ones to promote children\'s rights',
    outcomeId: '1',
    target: 10,
    current: 7,
    unit: 'clubs',
    status: 'ON_TRACK',
    budget: 12000,
    spent: 8500,
    startDate: '2023-02-01',
    endDate: '2023-11-30',
    responsible: 'Community Mobilization Team',
    location: 'Community centers and schools',
    subActivities: [
      {
        id: '1.2.1',
        title: 'Club formation and registration',
        description: 'Form and register new child clubs in target areas',
        status: 'COMPLETED',
        progress: 100,
        dueDate: '2023-04-30'
      },
      {
        id: '1.2.2',
        title: 'Club leadership training',
        description: 'Train club leaders and provide governance support',
        status: 'IN_PROGRESS',
        progress: 70,
        dueDate: '2023-09-30'
      },
      {
        id: '1.2.3',
        title: 'Club activity implementation',
        description: 'Support clubs in implementing their activity plans',
        status: 'IN_PROGRESS',
        progress: 60,
        dueDate: '2023-11-30'
      }
    ]
  },
  '1.3': {
    id: '1.3',
    title: 'Establish child friendly reporting mechanisms',
    description: 'Establish child friendly reporting mechanisms within schools and communities that encourages children to report incidence of violence and seek support',
    outcomeId: '1',
    target: 5,
    current: 3,
    unit: 'schools',
    status: 'ON_TRACK',
    budget: 8000,
    spent: 5200,
    startDate: '2023-03-01',
    endDate: '2023-11-30',
    responsible: 'Child Protection Team',
    location: 'All target schools',
    subActivities: [
      {
        id: '1.3.1',
        title: 'Sensitize schools on the use of speak out boxes',
        description: 'Conduct sensitization sessions with school administrators and teachers',
        status: 'COMPLETED',
        progress: 100,
        dueDate: '2023-04-30'
      },
      {
        id: '1.3.2',
        title: 'Provide talking walls and speak out boxes in schools',
        description: 'Install talking walls and speak out boxes in all 5 target schools',
        status: 'IN_PROGRESS',
        progress: 60,
        dueDate: '2023-09-30'
      },
      {
        id: '1.3.3',
        title: 'Facilitate referral and response to children - Case management',
        description: 'Establish case management system for reports received through mechanisms',
        status: 'IN_PROGRESS',
        progress: 40,
        dueDate: '2023-11-30'
      }
    ]
  },
  '1.4': {
    id: '1.4',
    title: 'Life skills education implementation',
    description: 'Implement comprehensive life skills education programs for children',
    outcomeId: '1',
    target: 3000,
    current: 1350,
    unit: 'children',
    status: 'ON_TRACK',
    budget: 25000,
    spent: 15000,
    startDate: '2023-02-01',
    endDate: '2023-12-31',
    responsible: 'Education Team',
    location: 'Schools and community centers',
    subActivities: [
      {
        id: '1.4.1',
        title: 'Curriculum development',
        description: 'Develop age-appropriate life skills curriculum',
        status: 'COMPLETED',
        progress: 100,
        dueDate: '2023-03-31'
      },
      {
        id: '1.4.2',
        title: 'Teacher training',
        description: 'Train teachers on life skills education delivery',
        status: 'COMPLETED',
        progress: 100,
        dueDate: '2023-05-31'
      },
      {
        id: '1.4.3',
        title: 'Program implementation',
        description: 'Roll out life skills education programs',
        status: 'IN_PROGRESS',
        progress: 45,
        dueDate: '2023-12-31'
      }
    ]
  },
  '1.5': {
    id: '1.5',
    title: 'Children\'s participation in decision-making',
    description: 'Facilitate meaningful participation of children in decisions that affect them',
    outcomeId: '1',
    target: 2500,
    current: 980,
    unit: 'children',
    status: 'BEHIND',
    budget: 18000,
    spent: 9000,
    startDate: '2023-04-01',
    endDate: '2023-12-31',
    responsible: 'Participation Team',
    location: 'Schools and communities',
    subActivities: [
      {
        id: '1.5.1',
        title: 'Child participation training',
        description: 'Train children on meaningful participation principles',
        status: 'IN_PROGRESS',
        progress: 60,
        dueDate: '2023-08-31'
      },
      {
        id: '1.5.2',
        title: 'Establish child parliaments',
        description: 'Establish child parliaments in schools and communities',
        status: 'IN_PROGRESS',
        progress: 40,
        dueDate: '2023-10-31'
      },
      {
        id: '1.5.3',
        title: 'Youth advocacy campaigns',
        description: 'Support youth-led advocacy campaigns',
        status: 'pending',
        progress: 20,
        dueDate: '2023-12-31'
      }
    ]
  },
  '1.6': {
    id: '1.6',
    title: 'Children\'s rights awareness campaigns',
    description: 'Conduct awareness campaigns to promote children\'s rights knowledge',
    outcomeId: '1',
    target: 3000,
    current: 2100,
    unit: 'children',
    status: 'ON_TRACK',
    budget: 14000,
    spent: 9800,
    startDate: '2023-03-01',
    endDate: '2023-11-30',
    responsible: 'Advocacy Team',
    location: 'Schools and communities',
    subActivities: [
      {
        id: '1.6.1',
        title: 'Campaign material development',
        description: 'Develop age-appropriate campaign materials',
        status: 'COMPLETED',
        progress: 100,
        dueDate: '2023-04-30'
      },
      {
        id: '1.6.2',
        title: 'School-based campaigns',
        description: 'Conduct rights awareness campaigns in schools',
        status: 'IN_PROGRESS',
        progress: 70,
        dueDate: '2023-09-30'
      },
      {
        id: '1.6.3',
        title: 'Community outreach',
        description: 'Conduct community-based awareness activities',
        status: 'IN_PROGRESS',
        progress: 65,
        dueDate: '2023-11-30'
      }
    ]
  },
  // Outcome 2 Activities
  '2.1': {
    id: '2.1',
    title: 'Skilful parenting training',
    description: 'Training parents on positive parenting techniques and child development',
    outcomeId: '2',
    target: 200,
    current: 145,
    unit: 'parents',
    status: 'ON_TRACK',
    budget: 25000,
    spent: 18000,
    startDate: '2023-02-01',
    endDate: '2023-12-31',
    responsible: 'Parenting Team',
    location: 'Community centers',
    subActivities: [
      {
        id: '2.1.1',
        title: 'Develop parenting training curriculum',
        description: 'Create comprehensive curriculum for skilful parenting training',
        status: 'COMPLETED',
        progress: 100,
        dueDate: '2023-03-31'
      },
      {
        id: '2.1.2',
        title: 'Conduct parenting training sessions',
        description: 'Deliver training sessions to groups of parents',
        status: 'IN_PROGRESS',
        progress: 72,
        dueDate: '2023-12-31'
      },
      {
        id: '2.1.3',
        title: 'Follow-up and support sessions',
        description: 'Provide ongoing support and follow-up to trained parents',
        status: 'IN_PROGRESS',
        progress: 30,
        dueDate: '2023-12-31'
      }
    ]
  },
  // Outcome 3 Activities
  '3.1': {
    id: '3.1',
    title: 'Training and mobilization of community and religious leaders',
    description: 'Train and mobilize community and religious leaders to promote positive parenting',
    outcomeId: '3',
    target: 20,
    current: 15,
    unit: 'leaders',
    status: 'ON_TRACK',
    budget: 20000,
    spent: 15000,
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    responsible: 'Community Engagement Team',
    location: 'Community centers and religious facilities',
    subActivities: [
      {
        id: '3.1.1',
        title: 'Leader identification and recruitment',
        description: 'Identify and recruit influential community and religious leaders',
        status: 'COMPLETED',
        progress: 100,
        dueDate: '2023-03-31'
      },
      {
        id: '3.1.2',
        title: 'Leadership training workshops',
        description: 'Conduct comprehensive training workshops for leaders',
        status: 'IN_PROGRESS',
        progress: 75,
        dueDate: '2023-09-30'
      },
      {
        id: '3.1.3',
        title: 'Community mobilization activities',
        description: 'Support leaders in conducting community mobilization',
        status: 'IN_PROGRESS',
        progress: 65,
        dueDate: '2023-12-31'
      }
    ]
  },
  // Outcome 4 Activities
  '4.1': {
    id: '4.1',
    title: 'School capacity building and resource development',
    description: 'Build school capacity and develop resources for child protection and holistic development',
    outcomeId: '4',
    target: 5,
    current: 3,
    unit: 'schools',
    status: 'AT_RISK',
    budget: 30000,
    spent: 18000,
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    responsible: 'School Development Team',
    location: 'Target schools',
    subActivities: [
      {
        id: '4.1.1',
        title: 'School assessment and planning',
        description: 'Conduct comprehensive assessments and develop improvement plans',
        status: 'COMPLETED',
        progress: 100,
        dueDate: '2023-04-30'
      },
      {
        id: '4.1.2',
        title: 'Teacher training and capacity building',
        description: 'Train teachers on child protection and positive discipline',
        status: 'IN_PROGRESS',
        progress: 60,
        dueDate: '2023-10-31'
      },
      {
        id: '4.1.3',
        title: 'Resource development and provision',
        description: 'Develop and provide necessary resources for schools',
        status: 'IN_PROGRESS',
        progress: 45,
        dueDate: '2023-12-31'
      }
    ]
  },
  // Outcome 5 Activities
  '5.1': {
    id: '5.1',
    title: 'Government-CSO partnership development',
    description: 'Develop formal partnerships between government agencies and CSOs',
    outcomeId: '5',
    target: 10,
    current: 6,
    unit: 'partnerships',
    status: 'ON_TRACK',
    budget: 15000,
    spent: 9000,
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    responsible: 'Partnership Team',
    location: 'Government offices and CSO headquarters',
    subActivities: [
      {
        id: '5.1.1',
        title: 'Stakeholder mapping and engagement',
        description: 'Map key stakeholders and initiate engagement processes',
        status: 'COMPLETED',
        progress: 100,
        dueDate: '2023-03-31'
      },
      {
        id: '5.1.2',
        title: 'Partnership agreement development',
        description: 'Develop formal partnership agreements',
        status: 'IN_PROGRESS',
        progress: 60,
        dueDate: '2023-09-30'
      },
      {
        id: '5.1.3',
        title: 'Joint program implementation',
        description: 'Implement joint programs and activities',
        status: 'IN_PROGRESS',
        progress: 40,
        dueDate: '2023-12-31'
      }
    ]
  }
};

// Helper function to generate mock progress data
export const generateProgressData = (current: number, target: number) => {
  const months = ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06', '2023-07'];
  const data = [];
  let cumulative = 0;
  
  for (let i = 0; i < months.length; i++) {
    const monthlyValue = i < 6 ? Math.round(current / 6) : 0;
    cumulative += monthlyValue;
    data.push({
      date: months[i],
      value: monthlyValue,
      cumulative: Math.min(cumulative, current)
    });
  }
  
  return data;
};

// Helper function to get status color
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800';
    case 'ON_TRACK':
      return 'bg-green-100 text-green-800';
    case 'AT_RISK':
      return 'bg-yellow-100 text-yellow-800';
    case 'BEHIND':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// TODO: Replace with actual user management API calls
export const mockUsers: User[] = [];
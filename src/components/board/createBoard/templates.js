export const TEMPLATES = [
  {
    key: 'blank',
    label: 'Blank',
    icon: null,
    columns: ['To Do', 'In Progress', 'Review', 'Done'],
    description: 'Start from scratch',
  },
  {
    key: 'bug-tracker',
    label: 'Bug Tracker',
    icon: 'bug',
    columns: ['Triage', 'Investigating', 'Fix In Progress', 'Verified'],
    description: 'Track and squash bugs',
  },
  {
    key: 'sprint',
    label: 'Sprint Board',
    icon: 'lightning',
    columns: ['Backlog', 'Sprint', 'In Progress', 'Done'],
    description: 'Agile sprint workflow',
  },
  {
    key: 'content',
    label: 'Content Pipeline',
    icon: 'pen-nib',
    columns: ['Ideas', 'Drafting', 'Editing', 'Published'],
    description: 'Create and ship content',
  },
  {
    key: 'hiring',
    label: 'Hiring Pipeline',
    icon: 'user-plus',
    columns: ['Applied', 'Phone Screen', 'Interview', 'Offer'],
    description: 'Manage candidates',
  },
  {
    key: 'simple',
    label: 'Simple',
    icon: null,
    columns: ['To Do', 'Done'],
    description: 'Just two columns',
  },
]

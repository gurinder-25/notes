export const ROUTES = {
  HOME: '/home',

  SUBJECT: {
    PATH: '/home/:subject',
    TO: (subject: string) => `/home/${subject}`,
  },

  CHAPTER: {
    PATH: '/home/:subject/:chapter',
    TO: (subject: string, chapter: string) => `/home/${subject}/${chapter}`,
  },

  // Dev-only authoring tool; excluded from production builds in App.tsx.
  WRITE: '/write',

  WRITE_SUBJECT: {
    PATH: '/write/:subject',
    TO: (subject: string) => `/write/${subject}`,
  },

  WRITE_CHAPTER: {
    PATH: '/write/:subject/:chapter',
    TO: (subject: string, chapter: string) => `/write/${subject}/${chapter}`,
  },

  /** New, unsaved chapter under an existing subject. */
  WRITE_NEW_CHAPTER: {
    PATH: '/write/:subject/new',
    TO: (subject: string) => `/write/${subject}/new`,
  },
} as const;

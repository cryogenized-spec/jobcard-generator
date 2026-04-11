export type AppRole = 'workshop' | 'neonsales' | 'viewer';

export type Profile = {
  id: string;
  display_name: string | null;
  role: AppRole | null;
};

export const roles: AppRole[] = ['workshop', 'neonsales', 'viewer'];

export type Option = {
  id: string;
  title: string;
  teacher: string;
  max: number;
  description: string;
  leaders?: string[];
};

export type Choice = {
  id: string;
  name: string;
  grade: number;
  selected: string[];
  extraFields: any[];
  listIndex: string;
};

export type Vote = {
  id: string;
  selectCount: number;
  title: string;
  extraFields: any[];
  active: boolean;
  description?: string;
  startTime?: { seconds: number; nanoseconds: number };
  endTime?: { seconds: number; nanoseconds: number };
  schoolId?: string;
};

export type Student = {
  listIndex: string;
  name: string;
  email?: string;
};

export type Class = {
  grade: number;
  students: Student[];
  id?: string;
};

export type SchoolData = {
  name: string;
  icon: string;
  shortName: string;
  link: string;
  primaryColor: string;
  oauth?: {
    authorizeEndpoint?: string;
    tokenEndpoint?: string;
    userInfoEndpoint?: string;
    clientId?: string;
    enabled?: boolean;
  };
};

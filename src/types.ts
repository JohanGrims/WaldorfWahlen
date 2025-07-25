export type Option = {
  id: string;
  title: string;
  teacher: string;
  max: number;
  description: string;
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

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
};

export type Vote = {
  id: string;
  selectCount: number;
  title: string;
  extraFields: any[];
  active: boolean;
};

import { DocumentData } from "firebase/firestore";

export interface VoteData extends DocumentData {
  id: string;
  selectCount: number;
}

export interface ChoiceData extends DocumentData {
  id: string;
  name: string;
  grade: number;
  listIndex: number;
  selected: string[];
}

export interface OptionData extends DocumentData {
  id: string;
  title: string;
  max: number;
  leaders?: string[];
}

export interface ResultData extends DocumentData {
  id: string;
  result: string;
}

export interface LoaderData {
  vote: VoteData;
  choices: ChoiceData[];
  options: OptionData[];
  results: ResultData[];
  classes: any[];
}

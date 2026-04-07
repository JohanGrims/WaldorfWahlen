/**
 * Represents a scoring rule for the assignment algorithm.
 * Note: Condition separators moved from ',' to ';' to support multiple selected IDs (e.g., "grade=12;selected=a,b"). Persisted rules using ',' need migration.
 */
export interface Rule {
  /** The condition string, e.g. "*", "grade=12", "grade=12;name=Max" */
  apply: string;
  /** The scores for each choice position, e.g. [1, 2, 4] */
  scores: number[];
}

/**
 * Represents a student's choice/vote.
 */
export interface ChoiceForRules {
  id: string;
  name: string;
  grade: number;
  listIndex: number;
  selected: string[];
}

/**
 * Calculates the score points for a given choice based on a set of rules.
 *
 * Rules are evaluated in order. The last matching rule wins.
 * A wildcard rule (apply === "*") matches all choices.
 * Conditions can be combined with commas: "grade=12,name=Max"
 *
 * Supported conditions:
 * - grade=N: Matches if choice.grade === N
 * - listIndex=N: Matches if choice.listIndex === N
 * - name=X: Matches if choice.name contains X (case-insensitive)
 * - selected=id1,id2: Matches if choice.selected contains all specified IDs
 *
 * @param choice - The student's choice.
 * @param rules - The list of scoring rules.
 * @param defaultScores - Default scores if no rule matches (default: [1, 2, 4]).
 * @returns The calculated score points array.
 */
export function calculatePoints(
  choice: ChoiceForRules,
  rules: Rule[],
  defaultScores: number[] = [1, 2, 4]
): number[] {
  let points = defaultScores;

  for (const rule of rules) {
    if (rule.apply === "*") {
      points = rule.scores;
      continue;
    }

    const conditions = rule.apply.split(";");
    let matches = true;

    for (const condition of conditions) {
      const [key, value] = condition.split("=");

      if (
        key === "grade" &&
        parseInt(choice.grade.toString()) !== parseInt(value)
      ) {
        matches = false;
        break;
      }
      if (key === "listIndex" && choice.listIndex !== parseInt(value)) {
        matches = false;
        break;
      }
      if (key === "selected") {
        const selected = value.split(",");
        if (!selected.every((id) => choice.selected.includes(id))) {
          matches = false;
          break;
        }
      }
      if (
        key === "name" &&
        !choice.name.toLowerCase().includes(value.toLowerCase())
      ) {
        matches = false;
        break;
      }
    }

    if (matches) {
      points = rule.scores;
    }
  }

  return points;
}

/**
 * Calculates points for all choices based on the given rules.
 *
 * @param choices - All student choices.
 * @param rules - The list of scoring rules.
 * @returns A record mapping choice ID to its score points.
 */
export function calculateAllPoints(
  choices: ChoiceForRules[],
  rules: Rule[]
): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (const choice of choices) {
    result[choice.id] = calculatePoints(choice, rules);
  }
  return result;
}

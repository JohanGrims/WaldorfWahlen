/**
 * Generates a random hash string of a specified length.
 *
 * @param {number} [length=4] - The length of the hash to generate. Defaults to 4 if not specified.
 * @returns {string} A randomly generated hash string consisting of uppercase letters, lowercase letters, and digits.
 */
export function generateRandomHash(length = 4) {
  let hash = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    hash += characters.charAt(array[i] % characters.length);
  }

  return hash;
}

/**
 * Compares two values to determine if they are deeply equal.
 *
 * This function performs a deep comparison between two values to determine if they are equivalent.
 * It handles comparisons for objects, arrays, and primitive values.
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @returns `true` if the values are deeply equal, otherwise `false`.
 */
export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  )
    return false;

  const keysA: string[] = Object.keys(a);
  const keysB: string[] = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (let key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
  }

  return true;
};

/**
 * Capitalizes the first letter of each word in a given string.
 * Words are defined as sequences of alphabetic characters, including umlauts (ä, ö, ü, Ä, Ö, Ü, ß).
 * Non-alphabetic characters (except hyphens and umlauts) are removed from the string.
 *
 * @param {string} str - The input string to be transformed.
 * @returns {string} - The transformed string with each word capitalized.
 */
export const capitalizeWords = (str: string): string => {
  return str
    .replace(/[^a-zA-ZäöüÄÖÜß\s-]/g, "") // Remove non-alphabetic characters except hyphens and umlauts
    .replace(/\b\w/g, (char: string, index: number): string => {
      if (index === 0 || str[index - 1].match(/\s/)) {
        return char.toUpperCase();
      } else if (str[index - 1] === "-") {
        return char.toUpperCase();
      }
      return char;
    }); // Capitalize words correctly
};



/**
 * Sorts a list of votes based on a search query and date range.
 *
 * This function filters the list of votes based on a search query and date range,
 * and then sorts the remaining votes by their start time in descending order.
 *
 * @param {Array} votes - The list of votes to be sorted.
 * @param {string} search - The search query to filter the votes by.
 * @param {string} fromDate - The start date of the date range to filter the votes by.
 * @param {string} toDate - The end date of the date range to filter the votes by.
 * @returns {Array} The sorted list of votes that match the search query and date range.
 */
export function sortVotes(
  votes: any[],
  search: string,
  fromDate: string,
  toDate: string
) {
  return votes
    .filter((vote: any) => {
      return (
        vote.title.toLowerCase().includes(search.toLowerCase()) ||
        vote.description?.toLowerCase().includes(search.toLowerCase())
      );
    })
    .filter((vote: any) => {
      return (
        new Date(vote.startTime.seconds * 1000).toISOString().split("T")[0] >=
        fromDate
      );
    })
    .filter((vote: any) => {
      return (
        new Date(vote.startTime.seconds * 1000).toISOString().split("T")[0] <=
        toDate
      );
    })
    .sort((a, b) => {
      return b.startTime.seconds - a.startTime.seconds;
    });
}

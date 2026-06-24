export function formatGrades(grades: number[]): string {
  if (!grades || grades.length === 0) return "";
  
  const sorted = [...grades].sort((a, b) => a - b);
  const result: string[] = [];
  let i = 0;
  
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) {
      j++;
    }
    
    if (j > i + 1) {
      result.push(`${sorted[i]}-${sorted[j]}`);
      i = j + 1;
    } else if (j === i + 1) {
      result.push(`${sorted[i]}, ${sorted[j]}`);
      i = j + 1;
    } else {
      result.push(`${sorted[i]}`);
      i++;
    }
  }
  
  return result.join(", ");
}

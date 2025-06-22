import { collection, getDocs } from "firebase/firestore";
import React from "react";
import { Link, useLoaderData } from "react-router-dom";
import { db } from "../../firebase";
import { Class, Student } from "../../types";

// Define interface for possible match
interface PossibleMatch {
  student: Student;
  offset: number; // +1 or -1 to indicate one listIndex up or down
}

// Define interface for mismatched student entry
interface MismatchedStudent {
  student: Student;
  choice: any;
  className: number;
  possibleMatches?: PossibleMatch[]; // Nearby students with matching names
}

// Define interface for duplicate choices (multiple answers for same listIndex and grade)
interface DuplicateChoice {
  grade: number;
  listIndex: string;
  choices: any[]; // Multiple choice entries with same listIndex and grade
}

// Define interface for duplicate students (multiple students with same name)
interface DuplicateStudent {
  grade: number;
  name: string;
  students: Student[]; // Multiple students with same name in same class
}

export default function Match() {
  const { choices, classes } = useLoaderData() as {
    classes: Class[];
    choices: any[];
  };

  const [mode, setMode] = React.useState("database");

  const sortedClasses = classes.sort((a, b) => a.grade - b.grade);

  // Get available grades for filtering
  const grades = [...new Set(sortedClasses.map((c) => c.grade))].sort(
    (a, b) => a - b
  );
  const [selectedGrade, setSelectedGrade] = React.useState<number | "all">(
    "all"
  );
  const [customMessage, setCustomMessage] = React.useState("");

  // Function to print non-voters table (similar to Results.jsx)
  function printNonVoters() {
    // Generate HTML content directly from data
    const title = `Nicht-Wähler ${
      selectedGrade !== "all" ? `Klasse ${selectedGrade}` : ""
    } (${filteredNonVoters.length})`;

    const tableRows = editableNonVoters
      .map(
        (item) =>
          `<tr>
        <td>${item.className}</td>
        <td>${item.student.listIndex}</td>
        <td>${item.student.name}</td>
      </tr>`
      )
      .join("");

    const printContents = `
      ${
        customMessage
          ? `<div style="margin-bottom: 20px; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #2196F3;"><p style="margin: 0; font-style: italic;">${customMessage}</p></div>`
          : ""
      }
      <h3>${title}</h3>
      <table>
        <thead>
          <tr>
            <th>Klasse</th>
            <th>#</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    // Check if we have content to print
    if (editableNonVoters.length === 0) {
      alert("Keine Nicht-Wähler zum Drucken vorhanden.");
      return;
    }

    // Create new iframe
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "none";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow;
    if (!frameDoc) return;

    frameDoc.document.open();
    frameDoc.document.write(`
      <html>
        <head>
          <title>Nicht-Wähler</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            h3 { margin-bottom: 10px; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    frameDoc.document.close();

    // Use iframe's print function
    frameDoc.focus();
    frameDoc.print();

    // Remove iframe after printing
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  }

  // Find all choices with non-matching names against the database
  const mismatchedStudents = React.useMemo(() => {
    const result: MismatchedStudent[] = [];

    // Start from choices and check against database
    choices.forEach((choice) => {
      // Find the corresponding class
      const classItem = sortedClasses.find(
        (c) => Number(c.grade) === Number(choice.grade)
      );

      if (!classItem) {
        return; // Skip if class not found
      }

      // Find the student with matching listIndex in the database
      const student = classItem.students.find(
        (s) => Number(s.listIndex) === Number(choice.listIndex)
      );

      if (student) {
        // Check if names don't match
        if (!matchName(student.name, choice.name)) {
          // Look for all students in the same class with matching names
          const possibleMatches: PossibleMatch[] = [];

          // Check for all students with matching names in the same class
          classItem.students.forEach((potentialMatch) => {
            // Skip the current student
            if (potentialMatch.listIndex === student.listIndex) {
              return;
            }

            // Check if the name matches
            if (matchName(potentialMatch.name, choice.name)) {
              // Calculate the offset (difference in list indices)
              const offset =
                Number(potentialMatch.listIndex) - Number(student.listIndex);
              possibleMatches.push({ student: potentialMatch, offset });
            }
          });

          result.push({
            student,
            choice: choice,
            className: classItem.grade,
            possibleMatches:
              possibleMatches.length > 0
                ? possibleMatches.sort(
                    (a, b) => Math.abs(a.offset) - Math.abs(b.offset)
                  ) // Sort by closest distance
                : undefined,
          });
        }
      }
    });

    return result;
  }, [choices, sortedClasses]);

  // Track choices that are already handled in mismatchedStudents
  const handledChoiceIds = React.useMemo(() => {
    const ids = new Set<string>();
    mismatchedStudents.forEach((item) => {
      ids.add(item.choice.id);
    });
    return ids;
  }, [mismatchedStudents]);

  // Track student list indices that are already handled in mismatchedStudents
  const handledStudentKeys = React.useMemo(() => {
    const keys = new Set<string>();
    mismatchedStudents.forEach((item) => {
      keys.add(`${item.className}-${item.student.listIndex}`);
    });
    return keys;
  }, [mismatchedStudents]);

  // Find duplicate choices (multiple answers for same listIndex and grade)
  const duplicateChoices = React.useMemo(() => {
    const result: DuplicateChoice[] = [];
    const choiceMap = new Map<string, any[]>();

    // Group choices by listIndex+grade
    choices.forEach((choice) => {
      // Skip choices that are already handled in mismatchedStudents
      if (handledChoiceIds.has(choice.id)) {
        return;
      }

      const key = `${choice.grade}-${choice.listIndex}`;
      if (!choiceMap.has(key)) {
        choiceMap.set(key, []);
      }
      choiceMap.get(key)!.push(choice);
    });

    // Find groups with more than one choice
    choiceMap.forEach((choiceGroup, key) => {
      if (choiceGroup.length > 1) {
        const [grade, listIndex] = key.split("-");
        result.push({
          grade: Number(grade),
          listIndex,
          choices: choiceGroup,
        });
      }
    });

    return result;
  }, [choices, handledChoiceIds]);

  // Find duplicate students (multiple students with same name in the same class)
  const duplicateStudents = React.useMemo(() => {
    const result: DuplicateStudent[] = [];

    sortedClasses.forEach((classItem) => {
      const studentMap = new Map<string, Student[]>();

      // Group students by name in each class
      classItem.students.forEach((student) => {
        // Skip students that are already handled in mismatchedStudents
        if (handledStudentKeys.has(`${classItem.grade}-${student.listIndex}`)) {
          return;
        }

        const normalizedName = student.name.toLowerCase().trim();
        if (!studentMap.has(normalizedName)) {
          studentMap.set(normalizedName, []);
        }
        studentMap.get(normalizedName)!.push(student);
      });

      // Find groups with more than one student
      studentMap.forEach((studentGroup, name) => {
        if (studentGroup.length > 1) {
          result.push({
            grade: classItem.grade,
            name: studentGroup[0].name, // Use the name of the first student
            students: studentGroup,
          });
        }
      });
    });

    return result;
  }, [sortedClasses, handledStudentKeys]);

  // Find students who haven't voted
  const nonVoters = React.useMemo(() => {
    const result: Array<{ student: Student; className: number }> = [];

    sortedClasses.forEach((classItem) => {
      classItem.students.forEach((student) => {
        // Check if this student has any votes
        const hasVoted = choices.some(
          (choice) =>
            Number(choice.listIndex) === Number(student.listIndex) &&
            Number(choice.grade) === Number(classItem.grade)
        );

        if (!hasVoted) {
          result.push({
            student,
            className: classItem.grade,
          });
        }
      });
    });

    return result.sort((a, b) => {
      if (a.className === b.className) {
        return Number(a.student.listIndex) - Number(b.student.listIndex);
      }
      return a.className - b.className;
    });
  }, [choices, sortedClasses]);

  // Filter non-voters by selected grade
  const filteredNonVoters = React.useMemo(() => {
    if (selectedGrade === "all") {
      return nonVoters;
    }
    return nonVoters.filter((item) => item.className === selectedGrade);
  }, [nonVoters, selectedGrade]);

  // State for managing editable non-voters list
  const [editableNonVoters, setEditableNonVoters] = React.useState<
    Array<{
      student: Student;
      className: number;
    }>
  >([]);

  // Update editable list when filtered non-voters change
  React.useEffect(() => {
    setEditableNonVoters([...filteredNonVoters]);
  }, [filteredNonVoters]);

  // Functions for managing the editable list
  const removeNonVoter = (index: number) => {
    setEditableNonVoters((prev) => prev.filter((_, i) => i !== index));
  };

  const addNonVoter = () => {
    const newEntry = {
      student: { name: "", listIndex: "" },
      className: sortedClasses[0]?.grade || 1,
    };
    setEditableNonVoters((prev) => [...prev, newEntry]);
  };

  const updateNonVoter = (index: number, field: string, value: any) => {
    setEditableNonVoters((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field === "name" || field === "listIndex" ? "student" : field]:
                field === "name" || field === "listIndex"
                  ? { ...item.student, [field]: value }
                  : value,
            }
          : item
      )
    );
  };

  function matchName(name1: string, name2: string): boolean {
    if (!name1 || !name2) {
      return false;
    }

    const norm = (n: string): string => {
      if (n.includes(",")) {
        let [last, first] = n.split(",").map((s) => s.trim());
        return `${first} ${last}`.toLowerCase();
      }
      return n.toLowerCase();
    };

    const extract = (n: string) => {
      let parts = n.split(" ").filter((part) => part.length > 0);
      let first = parts[0];
      let lastPart = parts.at(-1);
      let last =
        lastPart && /^[a-z]\.$/.test(lastPart) ? lastPart[0] : lastPart;
      return { first, last, allParts: parts };
    };

    const n1 = extract(norm(name1));
    const n2 = extract(norm(name2));

    // Helper function to check if two name parts match (handles initials)
    const partsMatch = (part1: string, part2: string): boolean => {
      if (part1 === part2) return true;

      // Check if one is an initial of the other
      if (part1.length === 2 && part1.endsWith(".") && part2.length > 1) {
        return part1[0] === part2[0];
      }
      if (part2.length === 2 && part2.endsWith(".") && part1.length > 1) {
        return part2[0] === part1[0];
      }

      // Check if one is just the first letter of the other (without dot)
      if (part1.length === 1 && part2.length > 1) {
        return part1[0] === part2[0];
      }
      if (part2.length === 1 && part1.length > 1) {
        return part2[0] === part1[0];
      }

      return false;
    };

    // Check if first names match and last names match (enhanced logic)
    const exactMatch =
      partsMatch(n1.first, n2.first) &&
      ((n1.last && n2.last && partsMatch(n1.last, n2.last)) ||
        (!n1.last && !n2.last));

    if (exactMatch) {
      return true;
    }

    // Check if one name is a subset of the other (for cases like "Max" vs "Max Erika M.")
    const isSubset = (shorter: string[], longer: string[]): boolean => {
      return shorter.every((shorterPart) =>
        longer.some((longerPart) => partsMatch(shorterPart, longerPart))
      );
    };

    // Compare all parts to see if one is a subset of the other
    if (n1.allParts.length !== n2.allParts.length) {
      const shorter =
        n1.allParts.length < n2.allParts.length ? n1.allParts : n2.allParts;
      const longer =
        n1.allParts.length > n2.allParts.length ? n1.allParts : n2.allParts;

      return isSubset(shorter, longer);
    }

    // If same number of parts, check if all parts match using enhanced matching
    if (n1.allParts.length === n2.allParts.length) {
      return n1.allParts.every((part1, index) =>
        partsMatch(part1, n2.allParts[index])
      );
    }

    return false;
  }

  return (
    <div className="mdui-prose">
      <h2>Abgleichen</h2>

      {/* Card for mismatched students */}
      {mismatchedStudents.length > 0 && (
        <mdui-card
          style={{ width: "100%", padding: "20px", marginBottom: "20px" }}
          variant="filled"
        >
          <h3>Nicht übereinstimmende Namen ({mismatchedStudents.length})</h3>
          <p>
            Einige Schüler haben in der Datenbank einen anderen Namen als in den
            Antworten. Bitte überprüfen Sie diese Einträge.
          </p>
          <div>
            <div className="mdui-table">
              <table>
                <thead>
                  <tr>
                    <th>Klasse</th>
                    <th>#</th>
                    <th>Name in Antwort</th>
                    <th>Name in Datenbank</th>
                    <th>Mögliche Korrektur</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {mismatchedStudents.map((item, index) => (
                    <tr key={index}>
                      <td>{item.className}</td>
                      <td>{item.student.listIndex}</td>
                      <td>{item.choice.name}</td>
                      <td>{item.student.name}</td>
                      <td>
                        {item.possibleMatches?.map((match, matchIndex) => (
                          <div key={matchIndex} style={{ marginBottom: "8px" }}>
                            <span style={{ fontWeight: "bold" }}>
                              Korrigiere listIndex zu #{match.student.listIndex}{" "}
                              ({match.student.name})
                              {Math.abs(match.offset) > 1
                                ? ` (${Math.abs(match.offset)} entfernt)`
                                : ""}
                            </span>
                            <mdui-icon
                              style={{
                                color:
                                  Math.abs(match.offset) <= 1
                                    ? "rgb(0, 150, 0)"
                                    : "rgb(80, 150, 0)",
                                marginLeft: "5px",
                                translate: "0 5px",
                              }}
                              mdui-tooltip={`title: ${
                                match.offset > 0
                                  ? "Weiter unten"
                                  : "Weiter oben"
                              } (${Math.abs(match.offset)} Positionen)`}
                            >
                              {match.offset > 0
                                ? "arrow_downward" // If offset is positive, name is below (higher index)
                                : "arrow_upward"}{" "}
                            </mdui-icon>
                          </div>
                        ))}
                        {!item.possibleMatches && (
                          <span style={{ color: "gray" }}>
                            Keine Vorschläge
                          </span>
                        )}
                      </td>
                      <td>
                        <Link to={`../answers?search=${item.choice.id}`}>
                          Bearbeiten
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </mdui-card>
      )}

      {/* Card for duplicate choices */}
      {duplicateChoices.length > 0 && (
        <mdui-card
          style={{ width: "100%", padding: "20px", marginBottom: "20px" }}
          variant="filled"
          color="warning"
        >
          <h3>Doppelte Antworten ({duplicateChoices.length})</h3>
          <p>
            Mehrere Antworten für die gleiche Listennummer und Klasse gefunden.
            Bitte überprüfen und bereinigen Sie diese Einträge.
          </p>
          <div className="mdui-table">
            <table>
              <thead>
                <tr>
                  <th>Klasse</th>
                  <th>#</th>
                  <th>Anzahl</th>
                  <th>Namen</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {duplicateChoices.map((item, index) => (
                  <tr key={index}>
                    <td>{item.grade}</td>
                    <td>{item.listIndex}</td>
                    <td>{item.choices.length}</td>
                    <td>
                      {item.choices.map((choice, i) => (
                        <div key={i} style={{ marginBottom: "4px" }}>
                          {choice.name}
                        </div>
                      ))}
                    </td>
                    <td>
                      <Link
                        to={`../answers?grade=${item.grade}&listIndex=${item.listIndex}`}
                        style={{ color: "rgb(255, 100, 100)" }}
                      >
                        Bearbeiten
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </mdui-card>
      )}

      {/* Card for duplicate students */}
      {duplicateStudents.length > 0 && (
        <mdui-card
          style={{ width: "100%", padding: "20px", marginBottom: "20px" }}
          variant="filled"
          color="warning"
        >
          <h3>Doppelte Schüler ({duplicateStudents.length})</h3>
          <p>
            Mehrere Schüler mit dem gleichen Namen in der gleichen Klasse
            gefunden. Dies kann zu Verwechslungen führen.
          </p>
          <div className="mdui-table">
            <table>
              <thead>
                <tr>
                  <th>Klasse</th>
                  <th>Name</th>
                  <th>Listeneinträge</th>
                </tr>
              </thead>
              <tbody>
                {duplicateStudents.map((item, index) => (
                  <tr key={index}>
                    <td>{item.grade}</td>
                    <td>{item.name}</td>
                    <td>
                      {item.students.map((student, i) => (
                        <div key={i} style={{ marginBottom: "4px" }}>
                          #{student.listIndex}{" "}
                          <Link
                            to={`../answers?grade=${item.grade}&listIndex=${student.listIndex}`}
                            style={{
                              color: "rgb(0, 100, 200)",
                              marginLeft: "8px",
                            }}
                          >
                            Antworten anzeigen
                          </Link>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </mdui-card>
      )}

      <mdui-radio-group value={mode}>
        <mdui-radio value="database" onClick={() => setMode("database")}>
          Datenbank
        </mdui-radio>
        <mdui-radio value="answers" onClick={() => setMode("answers")}>
          Antworten
        </mdui-radio>
        <mdui-radio value="non-voters" onClick={() => setMode("non-voters")}>
          Nicht-Wähler
        </mdui-radio>
      </mdui-radio-group>

      {mode === "database" && (
        <mdui-tabs value={sortedClasses[0].id}>
          {sortedClasses.map((c) => (
            <mdui-tab value={c.id}>
              Klasse {c.grade}
              <mdui-badge>{c.students.length}</mdui-badge>
            </mdui-tab>
          ))}
          <p />
          {sortedClasses.map((c) => (
            <mdui-tab-panel slot="panel" value={c.id}>
              <div className="p-10">
                <div className="mdui-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>#</th>
                        <th>Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.students.map((s) => (
                        <tr key={s.listIndex}>
                          <td>{s.name}</td>
                          <td>{s.listIndex}</td>
                          <td>
                            <Link
                              to={`../answers?grade=${c.grade}&listIndex=${s.listIndex}`}
                            >
                              {
                                choices.filter(
                                  (choice) =>
                                    choice.listIndex == s.listIndex &&
                                    choice.grade == c.grade
                                )[0]?.name
                              }
                              {choices.filter(
                                (choice) =>
                                  choice.listIndex == s.listIndex &&
                                  choice.grade == c.grade
                              ).length > 1 &&
                                " + " +
                                  (choices.filter(
                                    (choice) =>
                                      choice.listIndex == s.listIndex &&
                                      choice.grade == c.grade
                                  ).length -
                                    1) +
                                  " weitere"}
                            </Link>
                            {choices.filter(
                              (choice) =>
                                choice.listIndex == s.listIndex &&
                                choice.grade == c.grade
                            ).length < 1 && (
                              <Link
                                to={`../add?name=${s.name}&grade=${c.grade}&listIndex=${s.listIndex}`}
                                style={{ color: "rgb(255, 100, 100)" }}
                              >
                                (Erstellen)
                              </Link>
                            )}

                            {(() => {
                              const matchingChoices = choices.filter(
                                (choice) =>
                                  choice.listIndex == s.listIndex &&
                                  choice.grade == c.grade
                              );

                              if (matchingChoices.length === 0) {
                                return null;
                              }

                              if (matchingChoices.length > 1) {
                                return (
                                  <mdui-icon
                                    style={{
                                      color: "rgb(255, 150, 0)",
                                      marginLeft: "10px",
                                      translate: "0 5px",
                                    }}
                                    mdui-tooltip="title: Mehrere Antworten gefunden"
                                  >
                                    content_copy
                                  </mdui-icon>
                                );
                              }

                              return matchName(
                                s.name,
                                matchingChoices[0]?.name
                              ) ? (
                                <mdui-icon
                                  style={{
                                    color: "rgb(180, 255, 180)",
                                    marginLeft: "10px",
                                    translate: "0 5px",
                                  }}
                                  mdui-tooltip="title: Name stimmt überein"
                                >
                                  done
                                </mdui-icon>
                              ) : (
                                <mdui-icon
                                  style={{
                                    color: "rgb(255, 100, 100)",
                                    marginLeft: "10px",
                                    translate: "0 5px",
                                  }}
                                  mdui-tooltip="title: Name stimmt nicht überein"
                                >
                                  priority_high
                                </mdui-icon>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </mdui-tab-panel>
          ))}
        </mdui-tabs>
      )}

      {mode === "answers" && (
        <div>
          <div className="mdui-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>#</th>
                  <th>Klasse</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {choices
                  .sort((a, b) => {
                    if (a.grade === b.grade) {
                      return a.listIndex - b.listIndex;
                    }
                    return a.grade - b.grade;
                  })
                  .map((choice) => (
                    <tr key={choice.id}>
                      <td>
                        <Link to={`../answers?search=${choice.id}`}>
                          {choice.name}
                        </Link>
                      </td>
                      <td>{choice.listIndex}</td>
                      <td>{choice.grade}</td>
                      <td>
                        {
                          sortedClasses
                            .find(
                              (c) => Number(c.grade) === Number(choice.grade)
                            )
                            ?.students.find(
                              (s) =>
                                Number(s.listIndex) === Number(choice.listIndex)
                            )?.name
                        }
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === "non-voters" && (
        <mdui-card
          style={{ width: "100%", padding: "20px", marginBottom: "20px" }}
          variant="filled"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3>Nicht-Wähler ({filteredNonVoters.length})</h3>
            <mdui-button variant="outlined" onClick={printNonVoters}>
              <mdui-icon slot="icon">print</mdui-icon>
              Drucken
            </mdui-button>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <mdui-radio-group value={String(selectedGrade)}>
              <mdui-radio value="all" onClick={() => setSelectedGrade("all")}>
                Alle Klassen
              </mdui-radio>
              {grades.map((grade) => (
                <mdui-radio
                  key={grade}
                  value={String(grade)}
                  onClick={() => setSelectedGrade(grade)}
                >
                  Klasse {grade}
                </mdui-radio>
              ))}
            </mdui-radio-group>
          </div>

          <p>
            Diese Schüler haben nicht an der Umfrage teilgenommen. Sie können
            sie hier bearbeiten oder hinzufügen.
          </p>

          {/* Custom message for print */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
              Benutzerdefinierte Nachricht für Ausdruck:
            </label>
            <mdui-text-field
              value={customMessage}
              onInput={(e) =>
                setCustomMessage((e.target as HTMLInputElement).value)
              }
              placeholder="Optional: Nachricht, die oben auf der gedruckten Seite erscheint..."
              style={{ width: "100%" }}
              rows={2}
              variant="outlined"
            />
          </div>

          {/* Editing table - visible on screen */}
          <h4>Bearbeitung ({editableNonVoters.length} Einträge)</h4>
          <div className="mdui-table" style={{ marginBottom: "20px" }}>
            <table>
              <thead>
                <tr>
                  <th>Klasse</th>
                  <th>#</th>
                  <th>Name</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {editableNonVoters.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <mdui-text-field
                        type="number"
                        value={item.className.toString()}
                        onChange={(e) =>
                          updateNonVoter(
                            index,
                            "className",
                            parseInt((e.target as HTMLInputElement).value) || 1
                          )
                        }
                        placeholder="Klasse"
                      />
                    </td>
                    <td>
                      <mdui-text-field
                        type="text"
                        value={item.student.listIndex}
                        onChange={(e) =>
                          updateNonVoter(
                            index,
                            "listIndex",
                            (e.target as HTMLInputElement).value
                          )
                        }
                        placeholder="#"
                      />
                    </td>
                    <td>
                      <mdui-text-field
                        type="text"
                        value={item.student.name}
                        onChange={(e) =>
                          updateNonVoter(
                            index,
                            "name",
                            (e.target as HTMLInputElement).value
                          )
                        }
                        placeholder="Name"
                      />
                    </td>
                    <td>
                      <mdui-button-icon
                        icon="remove_circle"
                        onClick={() => removeNonVoter(index)}
                        style={{ color: "rgb(255, 100, 100)" }}
                        mdui-tooltip={{ content: "Eintrag entfernen" }}
                      ></mdui-button-icon>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <mdui-divider />

          <mdui-button
            variant="elevated"
            color="primary"
            onClick={addNonVoter}
            style={{ width: "100%" }}
          >
            Nicht-Wähler hinzufügen
          </mdui-button>
        </mdui-card>
      )}
    </div>
  );
}

Match.loader = async function loader({ params }) {
  const { id } = params;
  const choices = await getDocs(collection(db, `/votes/${id}/choices`));
  const choiceData = choices.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const classes = await getDocs(collection(db, `/class`));
  const classData = classes.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    choices: choiceData,
    classes: classData,
  };
};

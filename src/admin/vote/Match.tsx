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

  // Find all students with non-matching names who have choices
  const mismatchedStudents = React.useMemo(() => {
    const result: MismatchedStudent[] = [];

    sortedClasses.forEach((classItem) => {
      classItem.students.forEach((student) => {
        const matchingChoices = choices.filter(
          (choice) =>
            choice.listIndex == student.listIndex &&
            choice.grade == classItem.grade
        );

        if (matchingChoices.length > 0) {
          const firstChoice = matchingChoices[0];
          if (!matchName(student.name, firstChoice.name)) {
            // Look for all students in the same class with matching names
            const possibleMatches: PossibleMatch[] = [];

            // Check for all students with matching names in the same class
            classItem.students.forEach((potentialMatch) => {
              // Skip the current student
              if (potentialMatch.listIndex === student.listIndex) {
                return;
              }

              // Check if the name matches
              if (matchName(potentialMatch.name, firstChoice.name)) {
                // Calculate the offset (difference in list indices)
                const offset =
                  Number(potentialMatch.listIndex) - Number(student.listIndex);
                possibleMatches.push({ student: potentialMatch, offset });
              }
            });

            result.push({
              student,
              choice: firstChoice,
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

  function matchName(name1, name2) {
    if (!name1 || !name2) {
      return false;
    }
    const norm = (n) => {
      if (n.includes(",")) {
        let [last, first] = n.split(",").map((s) => s.trim());
        return `${first} ${last}`.toLowerCase();
      }
      return n.toLowerCase();
    };

    const extract = (n) => {
      let parts = n.split(" ");
      let first = parts[0];
      let last = /^[a-z]\.$/.test(parts.at(-1))
        ? parts.at(-1)[0]
        : parts.at(-1);
      return { first, last };
    };

    const n1 = extract(norm(name1));
    const n2 = extract(norm(name2));

    return (
      n1.first === n2.first &&
      (n1.last === n2.last || n1.last[0] === n2.last[0])
    );
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

                            {matchName(
                              s.name,
                              choices.filter(
                                (choice) =>
                                  choice.listIndex == s.listIndex &&
                                  choice.grade == c.grade
                              )[0]?.name
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
                              choices.filter(
                                (choice) =>
                                  choice.listIndex == s.listIndex &&
                                  choice.grade == c.grade
                              ).length > 0 && (
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
                              )
                            )}
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

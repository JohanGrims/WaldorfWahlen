import React from "react";
import { VoteData, ChoiceData, OptionData } from "./types";
import { Link } from "react-router-dom";

interface Props {
  results: Record<string, string>;
  vote: VoteData;
  choices: ChoiceData[];
  options: OptionData[];
  classes: any[];
  onSearchRequest: (query: string) => void;
  onDistributeMissingStudents?: () => void;
}

export default function Overview({
  results,
  vote,
  choices,
  options,
  classes,
  onSearchRequest,
  onDistributeMissingStudents,
}: Props) {
  // 1. Success Metrics: Count 1st, 2nd, 3rd choices
  const countWahlen = (wahlen: number) => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= wahlen; i++) {
      counts[i] = 0;
    }
    Object.entries(results).forEach(([key, value]) => {
      const choice = choices.find((c) => c.id === key);
      if (choice) {
        const selected = choice.selected || [];
        const index = selected.indexOf(value);
        if (index !== -1) {
          const wahl = index + 1;
          counts[wahl] = (counts[wahl] || 0) + 1;
        } else {
          // Assigned to a project not in their list
          counts[-1] = (counts[-1] || 0) + 1;
        }
      }
    });
    return counts;
  };

  const wahlenCounts = countWahlen(vote.selectCount);
  const totalAssigned = Object.keys(results).length;

  // 2. Identify Warnings
  const unexpectedAssignments = Object.entries(results).filter(([key, value]) => {
    const choice = choices.find((c) => c.id === key);
    const selected = choice?.selected || [];
    return choice && !selected.includes(value);
  });

  const overCapacityProjects = options.filter((option) => {
    const assignedCount = Object.values(results).filter((val) => val === option.id).length;
    return assignedCount > option.max;
  });

  const wrongGradeAssignments = Object.entries(results).filter(([key, value]) => {
    const choice = choices.find((c) => c.id === key);
    const option = options.find((o) => o.id === value);
    if (!choice || !option) return false;
    
    if (option.allowedGrades && option.allowedGrades.length > 0) {
      if (!option.allowedGrades.includes(Number(choice.grade))) {
        return true;
      }
    }
    return false;
  });

  let missingStudentsCount = 0;
  classes.forEach((c: any) => {
    if (!c.students) return;
    c.students.forEach((s: any) => {
      const isLeader = options.some(opt => opt.leaders?.includes(`${c.grade}-${s.listIndex}`));
      if (isLeader) return;

      const hasVoted = choices.some(choice => choice.grade == c.grade && choice.listIndex == s.listIndex);
      if (!hasVoted) missingStudentsCount++;
    });
  });

  return (
    <div className="mdui-prose" style={{ marginTop: "24px" }}>
      {missingStudentsCount > 0 && (
        <mdui-card variant="filled" color="warning" style={{ width: "100%", padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <mdui-icon style={{ fontSize: "32px", color: "rgb(255, 165, 0)" }}>person_off</mdui-icon>
              <h3 style={{ margin: 0 }}>Fehlende Wahlen ({missingStudentsCount})</h3>
            </div>
            {onDistributeMissingStudents && (
              <mdui-button onClick={onDistributeMissingStudents}>
                Fehlende Schüler verteilen
              </mdui-button>
            )}
          </div>
          <p>
            Es gibt {missingStudentsCount} Schüler, die nicht gewählt haben und daher noch nicht zugeteilt wurden.
            Sie können diese automatisch auf die am wenigsten gefüllten Projekte verteilen lassen.
          </p>
        </mdui-card>
      )}

      {unexpectedAssignments.length === 0 && overCapacityProjects.length === 0 && missingStudentsCount === 0 && wrongGradeAssignments.length === 0 ? (
        <mdui-card style={{ padding: "40px", textAlign: "center", width: "100%" }} variant="filled">
          <mdui-icon style={{ fontSize: "48px", color: "rgb(0, 150, 0)", marginBottom: "16px" }}>check_circle</mdui-icon>
          <h3>Alles in Ordnung!</h3>
          <p>Alle Schüler wurden zugewiesen und keine Projekte sind überbelegt.</p>
        </mdui-card>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <mdui-card variant="filled" style={{ padding: "20px" }}>
          <div style={{ fontSize: "1.2em", fontWeight: "bold" }}>Insgesamt zugewiesen</div>
          <div style={{ fontSize: "2.5em", color: "rgb(var(--mdui-color-primary))" }}>{totalAssigned}</div>
          <div style={{ color: "gray", fontSize: "0.9em" }}>Schüler</div>
        </mdui-card>

        {Object.entries(wahlenCounts).map(([wahl, count]) => {
          if (wahl === "-1") return null;
          return (
            <mdui-card key={wahl} variant="filled" style={{ padding: "20px" }}>
              <div style={{ fontSize: "1.2em", fontWeight: "bold" }}>
                {wahl === "1" ? "Erstwahlen" : `${wahl}. Wahlen`}
              </div>
              <div style={{ fontSize: "2.5em", color: "rgb(var(--mdui-color-primary))" }}>{count}</div>
              <div style={{ color: "gray", fontSize: "0.9em" }}>Schüler</div>
            </mdui-card>
          );
        })}
      </div>

      {unexpectedAssignments.length > 0 && (
        <mdui-card variant="filled" color="error" style={{ width: "100%", padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
            <mdui-icon style={{ fontSize: "32px", color: "rgb(255, 100, 100)" }}>warning</mdui-icon>
            <h3 style={{ margin: 0 }}>Unerwartete Zuweisungen ({unexpectedAssignments.length})</h3>
          </div>
          <p>Folgende Schüler wurden einem Projekt zugewiesen, das sie <b>nicht</b> gewählt haben.</p>
          <div className="mdui-table">
            <table>
              <thead>
                <tr>
                  <th>Klasse</th>
                  <th>Name</th>
                  <th>Zugewiesenes Projekt</th>
                </tr>
              </thead>
              <tbody>
                {unexpectedAssignments.map(([key, value], i) => {
                  const choice = choices.find((c) => c.id === key)!;
                  const option = options.find((o) => o.id === value)!;
                  return (
                    <tr key={i}>
                      <td>{choice.grade || <span style={{ color: "gray" }}>-</span>}</td>
                      <td>{choice.name || <span style={{ color: "gray" }}>-</span>}</td>
                      <td>{option?.title || value || <span style={{ color: "gray" }}>-</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </mdui-card>
      )}

      {overCapacityProjects.length > 0 && (
        <mdui-card variant="filled" color="warning" style={{ width: "100%", padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
            <mdui-icon style={{ fontSize: "32px", color: "rgb(255, 165, 0)" }}>group_add</mdui-icon>
            <h3 style={{ margin: 0 }}>Projekte über Kapazität ({overCapacityProjects.length})</h3>
          </div>
          <p>Folgende Projekte haben mehr Schüler zugewiesen bekommen, als Plätze vorhanden sind.</p>
          <div className="mdui-table">
            <table>
              <thead>
                <tr>
                  <th>Projekt</th>
                  <th>Plätze (Max)</th>
                  <th>Zugewiesen</th>
                </tr>
              </thead>
              <tbody>
                {overCapacityProjects.map((option, i) => {
                  const assignedCount = Object.values(results).filter((val) => val === option.id).length;
                  return (
                    <tr key={i}>
                      <td>{option.title}</td>
                      <td>{option.max}</td>
                      <td style={{ color: "rgb(255, 100, 100)", fontWeight: "bold" }}>{assignedCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </mdui-card>
      )}

      {wrongGradeAssignments.length > 0 && (
        <mdui-card variant="filled" color="error" style={{ width: "100%", padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
            <mdui-icon style={{ fontSize: "32px", color: "rgb(255, 100, 100)" }}>warning</mdui-icon>
            <h3 style={{ margin: 0 }}>Klassenbeschränkungen missachtet ({wrongGradeAssignments.length})</h3>
          </div>
          <p>Folgende Schüler wurden einem Projekt zugewiesen, das eigentlich <b>nicht</b> für ihre Klasse vorgesehen ist. (Muss ggf. abgesprochen sein)</p>
          <div className="mdui-table">
            <table>
              <thead>
                <tr>
                  <th>Klasse</th>
                  <th>Name</th>
                  <th>Zugewiesenes Projekt</th>
                  <th>Erlaubte Klassen</th>
                </tr>
              </thead>
              <tbody>
                {wrongGradeAssignments.map(([key, value], i) => {
                  const choice = choices.find((c) => c.id === key)!;
                  const option = options.find((o) => o.id === value)!;
                  return (
                    <tr key={i}>
                      <td>{choice.grade || <span style={{ color: "gray" }}>-</span>}</td>
                      <td>{choice.name || <span style={{ color: "gray" }}>-</span>}</td>
                      <td>{option?.title || value || <span style={{ color: "gray" }}>-</span>}</td>
                      <td style={{ color: "var(--mdui-color-error)" }}>{option.allowedGrades?.join(", ") || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </mdui-card>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { VoteData, ChoiceData, OptionData } from "./types";
import { snackbar } from "mdui";

interface Props {
  results: Record<string, string>;
  setResults: (r: Record<string, string>) => void;
  vote: VoteData;
  choices: ChoiceData[];
  options: OptionData[];
  choicePoints: Record<string, number[]>;
  cancelledProjects?: string[];
  classes?: any[];
  onAddChoice?: (c: ChoiceData) => void;
}

export default function ProjectView({
  results,
  setResults,
  vote,
  choices,
  options,
  choicePoints,
  cancelledProjects = [],
  classes = [],
  onAddChoice,
}: Props) {
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");
  const [activeTab, setActiveTab] = useState(options[0]?.id || "");

  const sortedResults = Object.entries(results).sort(([keyA], [keyB]) => {
    const choiceA = choices.find((c) => c.id === keyA);
    const choiceB = choices.find((c) => c.id === keyB);
    const gradeA = Number(choiceA?.grade) || 0;
    const gradeB = Number(choiceB?.grade) || 0;
    if (gradeA !== gradeB) return gradeA - gradeB;
    const nameA = choiceA?.name?.toLowerCase() || "";
    const nameB = choiceB?.name?.toLowerCase() || "";
    return nameA.localeCompare(nameB);
  });

  const renderProjectTable = (option: OptionData) => {
    const assignedCount = sortedResults.filter(([, value]) => value === option.id).length;
    const isCancelled = cancelledProjects.includes(option.id);

    return (
      <div key={option.id} style={{ marginBottom: "24px" }}>
        {isCancelled && (
          <div style={{ background: "var(--mdui-color-error-container)", color: "var(--mdui-color-on-error-container)", padding: "12px", borderRadius: "8px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <mdui-icon>warning</mdui-icon>
            <b>ABGESAGT:</b> Dieses Projekt hat die Mindestteilnehmerzahl nicht erreicht.
          </div>
        )}
        <div style={{ padding: "10px" }}>
          <div className="mdui-table" style={{ width: "100%" }}>
            <table>
              <thead>
                <tr>
                  <th><b>Name</b></th>
                  <th><b>Klasse</b></th>
                  <th><b>Punkte</b></th>
                  {Array.from({ length: vote.selectCount }, (_, i) => i + 1).map((i) => (
                    <th key={i}><b>Wahl {i}</b></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedResults
                  .filter(([, value]) => value === option.id)
                  .map(([key, value]) => {
                    const choice = choices.find((c) => c.id === key)!;
                    return (
                      <tr key={key}>
                        <td>{choice.name || <span style={{ color: "gray" }}>-</span>}</td>
                        <td>{choice.grade || <span style={{ color: "gray" }}>-</span>}</td>
                        <td>
                          {choicePoints[key] ? `[${choicePoints[key].join(", ")}]` : "[1, 2, 4]"}
                        </td>
                        {Array.from({ length: vote.selectCount }).map((_, i) => {
                          const selected = (choice.selected || [])[i];
                          if (!selected) {
                            return <td key={i}><span style={{ color: "gray" }}>-</span></td>;
                          }
                          const isAssigned = selected === value;
                          return (
                            <td
                              key={i}
                              style={{
                                cursor: !isAssigned ? "pointer" : "default",
                                textDecoration: !isAssigned ? "underline" : "none",
                                color: !isAssigned ? "rgb(var(--mdui-color-primary))" : "inherit",
                                whiteSpace: "nowrap"
                              }}
                              onClick={() => {
                                if (isAssigned) return;
                                const newResults = { ...results };
                                newResults[key] = selected;
                                setResults(newResults);
                                const previousResults = { ...results };
                                snackbar({
                                  message: "Änderung rückgängig machen",
                                  action: "Rückgängig",
                                  onActionClick: () => setResults(previousResults),
                                });
                              }}
                            >
                              {isAssigned ? "✓" : (
                                `${options.find((o) => o.id === selected)?.title || selected} (${
                                  Object.values(results).filter((val) => val === selected).length
                                }/${options.find((o) => o.id === selected)?.max || "?"})`
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                {assignedCount === 0 && (
                  <tr>
                    <td colSpan={vote.selectCount + 3} style={{ textAlign: "center", color: "gray" }}>
                      Keine Zuweisungen
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <h2 style={{ color: "gray", marginTop: "40px", fontSize: "1.2rem" }}>Alle Wähler</h2>
        <div style={{ padding: "10px" }}>
          <div className="mdui-table" style={{ width: "100%", color: "gray" }}>
            <table>
              <thead>
                <tr>
                  <th><b>Name</b></th>
                  <th><b>Klasse</b></th>
                  <th><b>#</b></th>
                  {Array.from({ length: vote.selectCount }, (_, i) => i + 1).map((i) => (
                    <th key={i}><b>Wahl {i}</b></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {choices
                  .filter((choice) => (choice.selected || []).includes(option.id) || choice.name?.endsWith(" [*]"))
                  .sort((a, b) => {
                    const gradeA = Number(a.grade) || 0;
                    const gradeB = Number(b.grade) || 0;
                    if (gradeA !== gradeB) return gradeA - gradeB;
                    const nameA = a.name?.toLowerCase() || "";
                    const nameB = b.name?.toLowerCase() || "";
                    return nameA.localeCompare(nameB);
                  })
                  .map((choice, i) => {
                    const isAuto = choice.name?.endsWith(" [*]");
                    return (
                    <tr key={i}>
                      <td>{choice.name || <span style={{ color: "gray" }}>-</span>}</td>
                      <td>{choice.grade || <span style={{ color: "gray" }}>-</span>}</td>
                      <td>{choice.listIndex || <span style={{ color: "gray" }}>-</span>}</td>
                      {Array.from({ length: vote.selectCount }).map((_, i) => {
                        const isAuto = (choice.selected || []).length === 0;
                        const selected = isAuto ? undefined : (choice.selected || [])[i];
                        if (!selected) {
                          return <td key={i}><span style={{ color: "gray" }}>-</span></td>;
                        }
                        const isAssigned = results[choice.id] === selected;
                        return (
                          <td
                            key={i}
                            style={{
                              cursor: !isAssigned ? "pointer" : "default",
                              textDecoration: !isAssigned ? "underline" : "none",
                              color: !isAssigned ? "rgb(var(--mdui-color-tertiary))" : "inherit",
                              whiteSpace: "nowrap"
                            }}
                            onClick={() => {
                              if (isAssigned) return;
                              const newResults = { ...results };
                              newResults[choice.id] = selected;
                              setResults(newResults);
                              const previousResults = { ...results };
                              snackbar({
                                message: "Änderung rückgängig machen",
                                action: "Rückgängig",
                                onActionClick: () => setResults(previousResults),
                              });
                            }}
                          >
                            {options.find((o) => o.id === selected)?.title || selected}
                            {isAssigned &&
                              ` (${Object.values(results).filter((val) => val === selected).length}/${options.find((o) => o.id === selected)?.max || "?"}) ✓`}
                          </td>
                        );
                      })}
                    </tr>
                  )})}
                {choices.filter((choice) => (choice.selected || []).includes(option.id) || choice.name?.endsWith(" [*]")).length === 0 && (
                  <tr>
                    <td colSpan={vote.selectCount + 3} style={{ textAlign: "center", fontStyle: "italic", padding: "16px" }}>Keine Wähler gefunden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectGrid = () => {
    const unassignedMissing: ChoiceData[] = [];
    const unassignedLeaders: ChoiceData[] = [];

    classes.forEach((c: any) => {
      if (!c.students) return;
      c.students.forEach((s: any) => {
        const leaderOption = options.find((o) => o.leaders?.includes(`${c.grade}-${s.listIndex}`));
        const isLeader = !!leaderOption;
        const isLeaderOfCancelled = leaderOption && cancelledProjects.includes(leaderOption.id);

        let choice = choices.find((ch) => String(ch.grade) === String(c.grade) && String(ch.listIndex) === String(s.listIndex));

        // Skip if assigned
        if (choice && results[choice.id]) return;
        if (results[`${c.grade}-${s.listIndex}`]) return;

        // Skip active leaders
        if (isLeader && !isLeaderOfCancelled) return;

        const syntheticChoice: ChoiceData = choice || {
          id: `${c.grade}-${s.listIndex}`,
          name: `${s.name} ${isLeader ? '[-]' : '[*]'}`,
          grade: c.grade,
          listIndex: s.listIndex,
          selected: [],
          timestamp: "",
        };

        if (isLeaderOfCancelled) {
          unassignedLeaders.push(syntheticChoice);
        } else {
          unassignedMissing.push(syntheticChoice);
        }
      });
    });

    const renderPoolCard = (title: string, list: ChoiceData[], color: string, icon: string) => {
      if (list.length === 0) return null;
      
      const sortedList = [...list].sort((a, b) => {
        const gradeA = Number(a.grade) || 0;
        const gradeB = Number(b.grade) || 0;
        if (gradeA !== gradeB) return gradeA - gradeB;
        const nameA = a.name?.toLowerCase() || "";
        const nameB = b.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
      });

      return (
        <mdui-card
          key={title}
          variant="filled"
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            border: `2px dashed ${color}`,
            backgroundColor: "var(--mdui-color-surface-variant)",
            gridColumn: "1 / -1",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid rgba(128, 128, 128, 0.2)", paddingBottom: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px", color: color }}>
              <mdui-icon>{icon}</mdui-icon>
              {title}
            </h3>
            <span style={{ fontWeight: "bold", color: color, backgroundColor: "rgba(128, 128, 128, 0.1)", padding: "4px 8px", borderRadius: "12px", fontSize: "0.85rem" }}>
              {list.length}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {sortedList.map((choice, index, array) => {
              const prevChoice = index > 0 ? array[index - 1] : null;
              const prevGrade = Number(prevChoice?.grade) || 0;
              const currGrade = Number(choice.grade) || 0;
              const showGap = prevChoice && currGrade !== prevGrade;
              const diff = prevChoice ? Math.max(1, currGrade - prevGrade) : 0;

              return (
                <React.Fragment key={choice.id}>
                  {showGap && <div style={{ flexBasis: "100%", height: `${(diff - 1) * 16}px` }} />}
                  <mdui-chip
                    draggable
                    onDragStart={(e: any) => {
                      e.dataTransfer.setData("text/plain", choice.id);
                      e.dataTransfer.setData("application/json", JSON.stringify(choice));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    style={{ cursor: "grab", backgroundColor: "rgba(128, 128, 128, 0.1)", border: "1px solid rgba(128, 128, 128, 0.2)" }}
                  >
                    {choice.name} ({choice.grade})
                  </mdui-chip>
                </React.Fragment>
              );
            })}
          </div>
        </mdui-card>
      );
    };

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {options.map((option) => {
          const assignedCount = Object.values(results).filter((val) => val === option.id).length;
          const isOverCapacity = assignedCount > option.max;
          const isCancelled = cancelledProjects.includes(option.id);

          return (
            <mdui-card
              key={option.id}
              variant="filled"
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                border: isOverCapacity ? "2px solid rgb(255, 100, 100)" : isCancelled ? "2px dashed var(--mdui-color-error)" : "2px solid transparent",
                opacity: isCancelled ? 0.7 : 1,
                transition: "all 0.2s ease"
              }}
              onDragOver={(e: any) => {
                if (isCancelled) return;
                e.preventDefault();
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
              }}
              onDragLeave={(e: any) => {
                if (isCancelled) return;
                e.preventDefault();
                e.currentTarget.style.backgroundColor = "";
              }}
              onDrop={(e: any) => {
                if (isCancelled) return;
                e.preventDefault();
                e.currentTarget.style.backgroundColor = "";
                const choiceId = e.dataTransfer.getData("text/plain");
                
                let choiceToAssign = choices.find((c) => c.id === choiceId);
                if (!choiceToAssign) {
                  try {
                    const rawData = e.dataTransfer.getData("application/json");
                    if (rawData) {
                      choiceToAssign = JSON.parse(rawData);
                      if (choiceToAssign && onAddChoice && !choices.some(c => c.id === choiceToAssign?.id)) {
                        onAddChoice(choiceToAssign);
                      }
                    }
                  } catch (err) {}
                }

                if (choiceToAssign && results[choiceToAssign.id] !== option.id) {
                  const newResults = { ...results };
                  newResults[choiceToAssign.id] = option.id;
                  setResults(newResults);
                  snackbar({ message: `Schüler zugewiesen: ${choiceToAssign.name}` });
                }
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid rgba(128, 128, 128, 0.2)", paddingBottom: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                  {option.title}
                  {isCancelled && <span style={{ marginLeft: "8px", fontSize: "0.75rem", background: "var(--mdui-color-error)", color: "var(--mdui-color-on-error)", padding: "2px 6px", borderRadius: "4px", verticalAlign: "middle" }}>ABGESAGT</span>}
                </h3>
                <span style={{ 
                  fontWeight: "bold",
                  color: isOverCapacity ? "rgb(255, 100, 100)" : "gray",
                  backgroundColor: isOverCapacity ? "rgba(255, 100, 100, 0.1)" : "rgba(128, 128, 128, 0.1)",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontSize: "0.85rem",
                  display: isCancelled ? "none" : "inline-block"
                }}>
                  {assignedCount} / {option.max}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {sortedResults
                  .filter(([, value]) => value === option.id)
                  .map(([key], index, array) => {
                    const choice = choices.find((c) => c.id === key)!;
                    
                    const prevChoiceKey = index > 0 ? array[index - 1][0] : null;
                    const prevChoice = prevChoiceKey ? choices.find((c) => c.id === prevChoiceKey) : null;
                    const prevGrade = Number(prevChoice?.grade) || 0;
                    const currGrade = Number(choice.grade) || 0;
                    const showGap = prevChoice && currGrade !== prevGrade;
                    const diff = prevChoice ? Math.max(1, currGrade - prevGrade) : 0;

                    const isAuto = (choice.selected || []).length === 0;
                    const selectedRank = isAuto ? 0 : (choice.selected || []).indexOf(option.id) + 1;
                    
                    let chipColor = "inherit";
                    let chipBorder = "1px solid rgba(128, 128, 128, 0.2)";
                    
                    if (isAuto) {
                      chipColor = "rgba(128, 128, 128, 0.1)";
                    } else if (selectedRank === 1) {
                      chipColor = "rgba(76, 175, 80, 0.15)";
                    } else if (selectedRank === 2) {
                      chipColor = "rgba(255, 193, 7, 0.2)";
                    } else if (selectedRank >= 3) {
                      chipColor = "rgba(255, 152, 0, 0.15)";
                    } else {
                      chipColor = "rgba(244, 67, 54, 0.1)";
                      chipBorder = "1px dashed rgba(244, 67, 54, 0.5)";
                    }

                    const menuOptions = isAuto ? options.map(o => o.id) : (choice.selected || []);

                    return (
                      <React.Fragment key={key}>
                        {showGap && <div style={{ flexBasis: "100%", height: `${(diff - 1) * 16}px` }} />}
                        <mdui-dropdown>
                          <mdui-chip
                            slot="trigger"
                          draggable
                          onDragStart={(e: any) => {
                            e.dataTransfer.setData("text/plain", choice.id);
                            e.dataTransfer.setData("application/json", JSON.stringify(choice));
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          style={{
                            cursor: "grab",
                            backgroundColor: chipColor,
                            border: chipBorder
                          }}
                        >
                          {choice.name} ({choice.grade})
                        </mdui-chip>
                        <mdui-menu>
                          <div style={{ padding: "8px 16px", color: "gray", fontSize: "0.85em", fontWeight: "bold" }}>
                            Zuweisen zu:
                          </div>
                          {menuOptions.map((optId, i) => {
                            const opt = options.find((o) => o.id === optId);
                            const optAssigned = Object.values(results).filter((val) => val === optId).length;
                            return (
                              <mdui-menu-item 
                                key={optId} 
                                disabled={optId === option.id}
                                onClick={() => {
                                  if (optId === option.id) return;
                                  const newResults = { ...results };
                                  newResults[choice.id] = optId;
                                  setResults(newResults);
                                  snackbar({ message: `Umgebucht zu: ${opt?.title || optId}` });
                                }}
                              >
                                {isAuto ? opt?.title || optId : `${i + 1}. Wahl: ${opt?.title || optId}`} ({optAssigned}/{opt?.max || "?"})
                              </mdui-menu-item>
                            );
                          })}
                          </mdui-menu>
                        </mdui-dropdown>
                      </React.Fragment>
                    );
                  })}
                {assignedCount === 0 && (
                  <div style={{ color: "gray", fontStyle: "italic", fontSize: "0.9em", padding: "8px 0" }}>
                    Leer (Ziehe Schüler hierher)
                  </div>
                )}
              </div>
            </mdui-card>
          );
        })}
        {renderPoolCard("Nicht-Wähler", unassignedMissing, "var(--mdui-color-primary)", "person_off")}
        {renderPoolCard("Leiter (abgesagt)", unassignedLeaders, "var(--mdui-color-error)", "group_off")}
      </div>
    );
  };

  return (
    <div style={{ marginTop: "24px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <mdui-segmented-button-group selects="single" value={viewMode}>
          <mdui-segmented-button value="single" icon="tab" onClick={() => setViewMode("single")}>Einzelansicht</mdui-segmented-button>
          <mdui-segmented-button value="grid" icon="grid_view" onClick={() => setViewMode("grid")}>Kompaktansicht</mdui-segmented-button>
        </mdui-segmented-button-group>
      </div>

      {viewMode === "single" ? (
        <mdui-tabs value={activeTab}>
          {options.map((option) => {
            const assignedCount = Object.values(results).filter((val) => val === option.id).length;
            const isCancelled = cancelledProjects.includes(option.id);
            const isOverCapacity = assignedCount > option.max;
            return (
              <mdui-tab key={option.id} value={option.id} onClick={() => setActiveTab(option.id)} style={{ whiteSpace: "nowrap" }}>
                {isCancelled && <span style={{ color: "var(--mdui-color-error)", marginRight: "4px", fontWeight: "bold" }}>X</span>}
                {isOverCapacity && !isCancelled && <span style={{ color: "rgb(255, 100, 100)", marginRight: "4px", fontWeight: "bold" }}>!</span>}
                {option.title} ({assignedCount}/{option.max})
              </mdui-tab>
            );
          })}
          {options.map((option) => (
            <mdui-tab-panel key={option.id} slot="panel" value={option.id}>
              <div style={{ padding: "16px 0" }}>
                {renderProjectTable(option)}
              </div>
            </mdui-tab-panel>
          ))}
        </mdui-tabs>
      ) : (
        renderProjectGrid()
      )}
    </div>
  );
}

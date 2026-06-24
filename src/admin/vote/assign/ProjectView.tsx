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
}

export default function ProjectView({
  results,
  setResults,
  vote,
  choices,
  options,
  choicePoints,
}: Props) {
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");
  const [activeTab, setActiveTab] = useState(options[0]?.id || "");

  const sortedResults = Object.entries(results).sort(([keyA], [keyB]) => {
    const nameA = choices.find((c) => c.id === keyA)?.name.toLowerCase() || "";
    const nameB = choices.find((c) => c.id === keyB)?.name.toLowerCase() || "";
    return nameA.localeCompare(nameB);
  });

  const renderProjectTable = (option: OptionData) => {
    const assignedCount = sortedResults.filter(([, value]) => value === option.id).length;

    return (
      <div key={option.id} style={{ marginBottom: "24px" }}>
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
                      <td>{choice.name}</td>
                      <td>{choice.grade}</td>
                      <td>
                        {choicePoints[key] ? `[${choicePoints[key].join(", ")}]` : "[1, 2, 4]"}
                      </td>
                      {(choice.selected || []).map((selected, i) => {
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

        <h2 style={{ color: "gray", marginTop: "40px", fontSize: "1.2rem" }}>Alle Wähler</h2>
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
                .filter((choice) => (choice.selected || []).includes(option.id))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((choice, i) => (
                  <tr key={i}>
                    <td>{choice.name}</td>
                    <td>{choice.grade}</td>
                    <td>{choice.listIndex}</td>
                    {(choice.selected || []).map((selected, i) => {
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
                ))}
              {choices.filter((choice) => (choice.selected || []).includes(option.id)).length === 0 && (
                <tr>
                  <td colSpan={vote.selectCount + 3} style={{ textAlign: "center", fontStyle: "italic", padding: "16px" }}>Keine Wähler gefunden.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderProjectGrid = () => {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {options.map((option) => {
          const assignedCount = Object.values(results).filter((val) => val === option.id).length;
          const isOverCapacity = assignedCount > option.max;

          return (
            <mdui-card
              key={option.id}
              variant="filled"
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                border: isOverCapacity ? "2px solid rgb(255, 100, 100)" : "2px solid transparent",
                transition: "all 0.2s ease"
              }}
              onDragOver={(e: any) => {
                e.preventDefault();
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
              }}
              onDragLeave={(e: any) => {
                e.preventDefault();
                e.currentTarget.style.backgroundColor = "";
              }}
              onDrop={(e: any) => {
                e.preventDefault();
                e.currentTarget.style.backgroundColor = "";
                const choiceId = e.dataTransfer.getData("text/plain");
                if (choiceId && results[choiceId] !== option.id) {
                  const newResults = { ...results };
                  newResults[choiceId] = option.id;
                  setResults(newResults);
                  snackbar({ message: `Schüler zugewiesen: ${choices.find((c) => c.id === choiceId)?.name}` });
                }
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid rgba(128, 128, 128, 0.2)", paddingBottom: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{option.title}</h3>
                <span style={{ 
                  fontWeight: "bold",
                  color: isOverCapacity ? "rgb(255, 100, 100)" : "gray",
                  backgroundColor: isOverCapacity ? "rgba(255, 100, 100, 0.1)" : "rgba(128, 128, 128, 0.1)",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontSize: "0.85rem"
                }}>
                  {assignedCount} / {option.max}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {sortedResults
                  .filter(([, value]) => value === option.id)
                  .map(([key]) => {
                    const choice = choices.find((c) => c.id === key)!;
                    const selectedRank = (choice.selected || []).indexOf(option.id) + 1;
                    
                    let chipColor = "inherit";
                    if (selectedRank === 1) chipColor = "rgba(76, 175, 80, 0.15)";
                    else if (selectedRank === 2) chipColor = "rgba(255, 193, 7, 0.2)";
                    else if (selectedRank >= 3) chipColor = "rgba(255, 152, 0, 0.15)";
                    else chipColor = "rgba(244, 67, 54, 0.1)";

                    return (
                      <mdui-dropdown key={key}>
                        <mdui-chip
                          slot="trigger"
                          draggable
                          onDragStart={(e: any) => {
                            e.dataTransfer.setData("text/plain", choice.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          style={{
                            cursor: "grab",
                            backgroundColor: chipColor,
                            border: selectedRank === 0 ? "1px dashed rgba(244, 67, 54, 0.5)" : "1px solid rgba(128, 128, 128, 0.2)"
                          }}
                        >
                          {choice.name} ({choice.grade})
                        </mdui-chip>
                        <mdui-menu>
                          <div style={{ padding: "8px 16px", color: "gray", fontSize: "0.85em", fontWeight: "bold" }}>
                            Zuweisen zu:
                          </div>
                          {(choice.selected || []).map((optId, i) => {
                            const opt = options.find((o) => o.id === optId);
                            const optAssigned = Object.values(results).filter((val) => val === optId).length;
                            return (
                              <mdui-menu-item 
                                key={i} 
                                disabled={optId === option.id}
                                onClick={() => {
                                  if (optId === option.id) return;
                                  const newResults = { ...results };
                                  newResults[choice.id] = optId;
                                  setResults(newResults);
                                  snackbar({ message: `Umgebucht zu: ${opt?.title || optId}` });
                                }}
                              >
                                {i + 1}. Wahl: {opt?.title || optId} ({optAssigned}/{opt?.max || "?"})
                              </mdui-menu-item>
                            );
                          })}
                        </mdui-menu>
                      </mdui-dropdown>
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
            const isOverCapacity = assignedCount > option.max;
            return (
              <mdui-tab key={option.id} value={option.id} onClick={() => setActiveTab(option.id)} style={{ whiteSpace: "nowrap" }}>
                {isOverCapacity && <span style={{ color: "rgb(255, 100, 100)", marginRight: "4px" }}>!</span>}
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

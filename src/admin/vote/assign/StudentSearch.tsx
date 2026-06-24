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

type FilterField = "assignedTo" | "choice" | "selected" | "selected[0]" | "selected[1]" | "selected[2]";

interface Filter {
  id: string;
  field: FilterField;
  isNot: boolean;
  values: string[];
}

export default function StudentSearch({
  results,
  setResults,
  vote,
  choices,
  options,
  choicePoints,
}: Props) {
  const [nameSearch, setNameSearch] = useState("");
  const [activeClass, setActiveClass] = useState("all");
  const [filters, setFilters] = useState<Filter[]>([]);

  const grades = Array.from(new Set(choices.map((c) => c.grade))).sort((a, b) => parseInt(a) - parseInt(b));

  const filteredChoices = choices.filter((choice) => {
    // 1. Name search
    if (nameSearch.trim()) {
      if (!choice.name.toLowerCase().includes(nameSearch.toLowerCase())) {
        return false;
      }
    }

    // 2. Class search
    if (activeClass !== "all") {
      if (choice.grade !== activeClass) {
        return false;
      }
    }

    // 3. Advanced Filters (All must match - AND logic between rows)
    for (const filter of filters) {
      if (filter.values.length === 0) continue; // Skip empty filters

      let matchesFilter = false;

      // Inner logic handles OR between multiple values in the same filter
      for (const filterValue of filter.values) {
        let valueMatches = false;

        if (filter.field === "assignedTo") {
          valueMatches = !!results[choice.id] && results[choice.id] === filterValue;
        } else if (filter.field === "choice") {
          const selected = choice.selected || [];
          const targetOpt = selected[parseInt(filterValue) - 1];
          valueMatches = !!results[choice.id] && !!targetOpt && results[choice.id] === targetOpt;
        } else if (filter.field === "selected") {
          const selected = choice.selected || [];
          valueMatches = selected.includes(filterValue);
        } else if (filter.field.startsWith("selected[")) {
          const selected = choice.selected || [];
          const indexMatch = filter.field.match(/\d+/);
          const index = indexMatch ? parseInt(indexMatch[0]) : -1;
          if (index >= 0 && index < selected.length) {
            valueMatches = selected[index] === filterValue;
          }
        }

        if (valueMatches) {
          matchesFilter = true;
          break;
        }
      }

      if (filter.isNot ? matchesFilter : !matchesFilter) {
        return false;
      }
    }

    return true;
  });

  const addFilter = () => {
    setFilters([...filters, { id: Math.random().toString(36).substring(7), field: "assignedTo", isNot: false, values: [] }]);
  };

  const updateFilter = (id: string, updates: Partial<Filter>) => {
    setFilters(filters.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter((f) => f.id !== id));
  };

  return (
    <div style={{ marginTop: "24px" }}>
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
        <mdui-text-field
          icon="search"
          placeholder="Schüler suchen..."
          value={nameSearch}
          onInput={(e: any) => setNameSearch(e.target.value)}
          style={{ flexGrow: 1 }}
          clearable
        ></mdui-text-field>
      </div>

      <mdui-tabs value={activeClass} style={{ marginBottom: "16px" }}>
        <mdui-tab value="all" onClick={() => setActiveClass("all")}>Alle Klassen</mdui-tab>
        {grades.map((g) => (
          <mdui-tab key={g} value={g} onClick={() => setActiveClass(g)}>Klasse {g}</mdui-tab>
        ))}
      </mdui-tabs>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px", padding: "16px", backgroundColor: "rgba(128,128,128,0.05)", borderRadius: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ margin: "0" }}>Aktive Filter</h4>
          <mdui-button icon="add" variant="text" onClick={addFilter}>
            Filter hinzufügen
          </mdui-button>
        </div>
        
        {filters.map((filter) => (
          <div key={filter.id} style={{ display: "grid", gridTemplateColumns: "280px 120px 1fr auto", gap: "12px", alignItems: "center" }}>
            <mdui-select
              variant="outlined"
              value={filter.field}
              onChange={(e: any) => updateFilter(filter.id, { field: e.target.value, values: [] })}
            >
              <mdui-menu-item value="assignedTo">Zugewiesenes Projekt</mdui-menu-item>
              <mdui-menu-item value="choice">Erhaltene Wahl</mdui-menu-item>
              <mdui-menu-item value="selected">Gewähltes Projekt (Egal welche Wahl)</mdui-menu-item>
              {Array.from({ length: vote.selectCount }, (_, i) => (
                <mdui-menu-item key={i} value={`selected[${i}]`}>Gewähltes Projekt (als {i + 1}. Wahl)</mdui-menu-item>
              ))}
            </mdui-select>

            <mdui-select
              variant="outlined"
              value={filter.isNot ? "not" : "is"}
              onChange={(e: any) => updateFilter(filter.id, { isNot: e.target.value === "not" })}
            >
              <mdui-menu-item value="is">Ist</mdui-menu-item>
              <mdui-menu-item value="not">Ist nicht</mdui-menu-item>
            </mdui-select>

            {filter.field === "choice" ? (
              <mdui-text-field
                variant="outlined"
                type="number"
                min="1"
                max={vote.selectCount.toString()}
                placeholder="1, 2, 3..."
                value={filter.values[0] || ""}
                onInput={(e: any) => updateFilter(filter.id, { values: [e.target.value] })}
              ></mdui-text-field>
            ) : (
              <mdui-select
                variant="outlined"
                multiple
                clearable
                placeholder="Projekt(e) auswählen..."
                value={filter.values as any}
                onChange={(e: any) => updateFilter(filter.id, { values: e.target.value || [] })}
              >
                {options.map((opt) => (
                  <mdui-menu-item key={opt.id} value={opt.id}>{opt.title}</mdui-menu-item>
                ))}
              </mdui-select>
            )}

            <mdui-button-icon icon="close" onClick={() => removeFilter(filter.id)}></mdui-button-icon>
          </div>
        ))}
        {filters.length === 0 && (
          <div style={{ color: "gray", fontStyle: "italic", padding: "8px 0" }}>Keine Filter aktiv.</div>
        )}
      </div>

      <div style={{ marginBottom: "8px", color: "gray" }}>
        {filteredChoices.length} Schüler gefunden
      </div>

      <div className="mdui-table" style={{ width: "100%", overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th><b>Name</b></th>
              <th><b>Klasse</b></th>
              <th><b>#</b></th>
              <th><b>Punkte</b></th>
              {Array.from({ length: vote.selectCount }, (_, i) => i + 1).map((i) => (
                <th key={i}><b>Wahl {i}</b></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredChoices.map((choice) => {
              const assignedOptionId = results[choice.id];
              return (
                <tr key={choice.id}>
                  <td>{choice.name}</td>
                  <td>{choice.grade}</td>
                  <td>{choice.listIndex}</td>
                  <td>{choicePoints[choice.id] ? `[${choicePoints[choice.id].join(", ")}]` : "[1, 2, 4]"}</td>
                  {(choice.selected || []).map((selected, i) => {
                    const isAssigned = selected === assignedOptionId;
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
            {filteredChoices.length === 0 && (
              <tr>
                <td colSpan={vote.selectCount + 4} style={{ textAlign: "center", padding: "24px", color: "gray" }}>
                  Keine passenden Schüler gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

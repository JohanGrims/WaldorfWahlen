import React from "react";
import { snackbar } from "mdui";
import { Rule } from "../../../utils/assign";

interface Props {
  open: boolean;
  onClose: () => void;
  rules: Rule[];
  setRules: (rules: Rule[]) => void;
}

type ConditionKey = "grade" | "name" | "listIndex" | "selected";

interface Condition {
  key: ConditionKey;
  value: string;
}

function parseConditions(apply: string): Condition[] {
  if (apply === "*" || apply === "") return [];
  return apply
    .split(";")
    .filter((c) => c.includes("="))
    .map((c) => {
      const eqIdx = c.indexOf("=");
      return {
        key: c.slice(0, eqIdx).trim() as ConditionKey,
        value: c.slice(eqIdx + 1).trim(),
      };
    });
}

function serializeConditions(conditions: Condition[]): string {
  if (conditions.length === 0) return "";
  return conditions.map((c) => `${c.key}=${c.value}`).join(";");
}

const KEY_LABELS: Record<ConditionKey, string> = {
  grade: "Klasse",
  name: "Name",
  listIndex: "Nr.",
  selected: "Projekt-ID",
};

const KEY_PLACEHOLDERS: Record<ConditionKey, string> = {
  grade: "12",
  name: "Müller",
  listIndex: "1",
  selected: "abc123",
};

export default function RulesDialog({ open, onClose, rules, setRules }: Props) {
  function updateRule(i: number, updated: Rule) {
    const newRules = [...rules];
    newRules[i] = updated;
    setRules(newRules);
  }

  function deleteRule(i: number) {
    const newRules = [...rules];
    newRules.splice(i, 1);
    setRules(newRules);
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const newRules = [...rules];
    [newRules[i - 1], newRules[i]] = [newRules[i], newRules[i - 1]];
    setRules(newRules);
  }

  function moveDown(i: number) {
    if (i === rules.length - 1) return;
    const newRules = [...rules];
    [newRules[i + 1], newRules[i]] = [newRules[i], newRules[i + 1]];
    setRules(newRules);
  }

  return (
    <mdui-dialog open={open} headline="Regeln anpassen" fullscreen>
      <div style={{ color: "gray", fontSize: "13px", marginBottom: "20px" }}>
        Regeln bestimmen, wie viele Punkte Schüler für ihre Wahlpositionen erhalten.
        Die letzte zutreffende Regel gewinnt. Mehr Punkte = bevorzugte Erstzuteilung.
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: "8px",
          alignItems: "center",
          padding: "0 8px",
          marginBottom: "8px",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          opacity: 0.5,
        }}
      >
        <span>Bedingung(en)</span>
        <span>Punkte (je Wahl)</span>
        <span></span>
      </div>

      {rules.map((rule, i) => {
        const isDefault = rule.apply === "*";
        const conditions = isDefault ? [] : parseConditions(rule.apply);

        function updateCondition(ci: number, updates: Partial<Condition>) {
          const newConds = [...conditions];
          newConds[ci] = { ...newConds[ci], ...updates };
          updateRule(i, { ...rule, apply: serializeConditions(newConds) });
        }

        function addCondition() {
          const newConds = [...conditions, { key: "grade" as ConditionKey, value: "" }];
          updateRule(i, { ...rule, apply: serializeConditions(newConds) });
        }

        function removeCondition(ci: number) {
          const newConds = conditions.filter((_, idx) => idx !== ci);
          updateRule(i, { ...rule, apply: newConds.length === 0 ? "" : serializeConditions(newConds) });
        }

        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: "8px",
              alignItems: "center",
              padding: "10px 8px",
              borderRadius: "10px",
              marginBottom: "4px",
              background: i % 2 === 0 ? "rgba(128,128,128,0.04)" : "transparent",
            }}
          >
            {/* Conditions column */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
              {isDefault ? (
                <span style={{ fontSize: "14px", opacity: 0.6, fontStyle: "italic" }}>
                  Alle Schüler (Standard)
                </span>
              ) : (
                <>
                  {conditions.map((cond, ci) => (
                    <React.Fragment key={ci}>
                      {ci > 0 && (
                        <span style={{ fontSize: "12px", opacity: 0.4, padding: "0 2px" }}>UND</span>
                      )}
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <mdui-select
                          variant="outlined"
                          value={cond.key}
                          onChange={(e: any) => updateCondition(ci, { key: e.target.value as ConditionKey, value: "" })}
                          style={{ width: "130px", fontSize: "13px" }}
                        >
                          {(Object.keys(KEY_LABELS) as ConditionKey[]).map((k) => (
                            <mdui-menu-item key={k} value={k}>{KEY_LABELS[k]}</mdui-menu-item>
                          ))}
                        </mdui-select>
                        <mdui-text-field
                          variant="outlined"
                          value={cond.value}
                          placeholder={KEY_PLACEHOLDERS[cond.key]}
                          onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateCondition(ci, { value: e.target.value })
                          }
                          style={{ width: "90px" }}
                        ></mdui-text-field>
                        <mdui-button-icon
                          icon="close"
                          onClick={() => removeCondition(ci)}
                          style={{ flexShrink: 0 }}
                        ></mdui-button-icon>
                      </div>
                    </React.Fragment>
                  ))}
                  <mdui-button-icon
                    icon="add"
                    onClick={addCondition}
                    style={{ flexShrink: 0 }}
                  ></mdui-button-icon>
                </>
              )}
            </div>

            {/* Scores column */}
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              {rule.scores.map((score, si) => (
                <mdui-text-field
                  key={si}
                  variant="outlined"
                  type="number"
                  label={`W${si + 1}`}
                  value={String(score)}
                  style={{ width: "64px" }}
                  onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newScores = [...rule.scores];
                    newScores[si] = parseInt(e.target.value) || 0;
                    updateRule(i, { ...rule, scores: newScores });
                  }}
                ></mdui-text-field>
              ))}
              <mdui-button-icon
                icon="add"
                onClick={() => updateRule(i, { ...rule, scores: [...rule.scores, 0] })}
              ></mdui-button-icon>
              {rule.scores.length > 1 && (
                <mdui-button-icon
                  icon="remove"
                  onClick={() => updateRule(i, { ...rule, scores: rule.scores.slice(0, -1) })}
                ></mdui-button-icon>
              )}
            </div>

            {/* Move / delete column */}
            <div style={{ display: "flex", gap: "2px" }}>
              <mdui-button-icon icon="arrow_upward" disabled={i === 0} onClick={() => moveUp(i)}></mdui-button-icon>
              <mdui-button-icon icon="arrow_downward" disabled={i === rules.length - 1} onClick={() => moveDown(i)}></mdui-button-icon>
              <mdui-button-icon
                icon="delete"
                style={{ color: "var(--mdui-color-error)" }}
                onClick={() => deleteRule(i)}
                disabled={isDefault}
              ></mdui-button-icon>
            </div>
          </div>
        );
      })}

      <mdui-button
        onClick={() => setRules([...rules, { apply: "", scores: [1, 2, 4] }])}
        icon="add"
        variant="outlined"
        style={{ width: "100%", marginTop: "12px" }}
      >
        Neue Regel hinzufügen
      </mdui-button>

      <mdui-button
        slot="action"
        onClick={() => {
          onClose();
          snackbar({ message: "Regeln gespeichert." });
        }}
      >
        Speichern
      </mdui-button>
    </mdui-dialog>
  );
}

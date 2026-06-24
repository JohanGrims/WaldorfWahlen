import React from "react";
import { snackbar } from "mdui";
import { Rule } from "../../../utils/assign";

interface Props {
  open: boolean;
  onClose: () => void;
  rules: Rule[];
  setRules: (rules: Rule[]) => void;
}

export default function RulesDialog({ open, onClose, rules, setRules }: Props) {
  return (
    <mdui-dialog open={open} headline="Regeln anpassen" fullscreen>
      {rules.map((rule, i) => (
        <div
          key={i}
          style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
        >
          {rule.apply === "*" ? (
            <mdui-text-field
              label="Bedingung"
              placeholder="grade=12"
              value={rule.apply}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newRules = [...rules];
                newRules[i].apply = e.target.value;
                setRules(newRules);
              }}
              disabled
            />
          ) : (
            <mdui-text-field
              label="Bedingung"
              placeholder="grade=12"
              value={rule.apply}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newRules = [...rules];
                newRules[i].apply = e.target.value;
                setRules(newRules);
              }}
            />
          )}
          <mdui-text-field
            label="Punkte"
            placeholder="1,2,4"
            value={rule.scores.join(",")}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
              const newRules = [...rules];
              newRules[i].scores = e.target.value.split(",").map(Number);
              setRules(newRules);
            }}
          />
          {rule.apply === "*" ? (
            <mdui-button-icon icon="lock" disabled />
          ) : (
            <mdui-button-icon
              icon="delete"
              onClick={() => {
                const newRules = [...rules];
                newRules.splice(i, 1);
                setRules(newRules);
              }}
            />
          )}
          {i === 0 ? (
            <mdui-button-icon icon="arrow_upward" disabled />
          ) : (
            <mdui-button-icon
              icon="arrow_upward"
              onClick={() => {
                const newRules = [...rules];
                const temp = newRules[i - 1];
                newRules[i - 1] = newRules[i];
                newRules[i] = temp;
                setRules(newRules);
              }}
            />
          )}
          {i === rules.length - 1 ? (
            <mdui-button-icon icon="arrow_downward" disabled />
          ) : (
            <mdui-button-icon
              icon="arrow_downward"
              onClick={() => {
                const newRules = [...rules];
                const temp = newRules[i + 1];
                newRules[i + 1] = newRules[i];
                newRules[i] = temp;
                setRules(newRules);
              }}
            />
          )}
        </div>
      ))}
      <mdui-button
        onClick={() => setRules([...rules, { apply: "", scores: [] }])}
        icon="add"
      >
        Regel hinzufügen
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
      <p />
      <div style={{ color: "gray" }}>
        <b>Regeln</b> sind Bedingungen, die festlegen, wie die Schüler den
        Projekten zugeordnet werden. Die Regeln werden in der Reihenfolge
        angewendet, in der sie hier aufgelistet sind. Die Regeln werden auf die
        Schüler angewendet, die die Bedingungen erfüllen. Die Punkte geben an,
        wie viele Punkte die Schüler für die jeweilige Wahl erhalten. Die
        Kriterien sind in der Form <code>key=value</code> angegeben. Mehrere
        Kriterien können durch Kommas getrennt werden. Die Kriterien sind:
        <ul>
          <li>
            <code>grade</code>: Klasse
          </li>
          <li>
            <code>listIndex</code>: Nummer auf der Liste
          </li>
          <li>
            <code>selected</code>: IDs der Projekte, die gewählt wurden
          </li>
          <li>
            <code>name</code>: Teil des Namens des Schülers
          </li>
        </ul>
        <p />
        <b>Beispiel:</b> Die Regel <code>grade=12</code> wird nur auf die
        Schüler der 12. Klasse angewendet. Die Regel{" "}
        <code>grade=12,listIndex=1</code> wird nur auf den Schüler angewendet,
        der an erster Stelle steht.
        <p />
        Das Sternchen <code>*</code> steht für alle Schüler. Die Regel{" "}
        <code>*</code> wird auf alle Schüler angewendet.
      </div>
    </mdui-dialog>
  );
}

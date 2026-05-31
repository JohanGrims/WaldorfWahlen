import React from "react";
import { useLoaderData } from "react-router-dom";
import { useDecryption } from "../../contexts";
import { V2LoaderData } from "./V2Layout";

export default function V2Answers() {
  const { vote, choices } = useLoaderData() as V2LoaderData;
  const { students } = useDecryption();

  const votedTokens = new Set(choices.map(c => c.id));

  return (
    <div>
      <h3>Antworten ({choices.length} / {students.length})</h3>
      <p>Hier sehen Sie, wer bereits abgestimmt hat.</p>
      
      <div style={{ overflowX: "auto", marginTop: 16 }}>
        <table className="mdui-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--mdui-color-outline)" }}>
              <th style={{ padding: 12 }}>Name</th>
              <th style={{ padding: 12 }}>Klasse</th>
              <th style={{ padding: 12 }}>E-Mail</th>
              <th style={{ padding: 12 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name)).map((s, i) => {
              const hasVoted = votedTokens.has(s.token);
              return (
                <tr key={i} style={{ borderBottom: "1px solid var(--mdui-color-surface-variant)" }}>
                  <td style={{ padding: 12 }}>{s.name}</td>
                  <td style={{ padding: 12 }}>{s.grade}</td>
                  <td style={{ padding: 12 }}>{s.email}</td>
                  <td style={{ padding: 12 }}>
                    {hasVoted ? (
                      <span style={{ color: "var(--mdui-color-primary)" }}>Abgestimmt</span>
                    ) : (
                      <span style={{ color: "var(--mdui-color-error)" }}>Fehlt</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

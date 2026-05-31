import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase";
import { hashEmail } from "../utils/crypto";
import * as XLSX from "xlsx";
import { alert, snackbar } from "mdui";

interface V2VoteData {
  title: string;
  selectCount: number;
  options: { id: string; title: string; max: number }[];
}

interface ChoiceData {
  selected: string[];
  timestamp: string;
}

interface DecryptedStudent {
  name: string;
  email: string;
  grade: number;
  token: string;
  choice?: ChoiceData;
  assignedOption?: string;
}

export default function V2ManageVote() {
  const { id } = useParams<{ id: string }>();

  const [vote, setVote] = useState<V2VoteData | null>(null);
  const [choices, setChoices] = useState<Record<string, ChoiceData>>({});
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState<DecryptedStudent[]>([]);
  const [decrypted, setDecrypted] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const voteSnap = await getDoc(doc(db, `schools/SCHOOLID/v2_votes/${id}`));
        if (voteSnap.exists()) {
          setVote(voteSnap.data() as V2VoteData);
        }

        const choicesSnap = await getDocs(collection(db, `schools/SCHOOLID/v2_votes/${id}/choices`));
        const choicesMap: Record<string, ChoiceData> = {};
        choicesSnap.docs.forEach(d => {
          choicesMap[d.id] = d.data() as ChoiceData;
        });
        setChoices(choicesMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(sheet);

        const parsed: DecryptedStudent[] = [];
        for (const row of json) {
          const email = row.Email || row["E-Mail"] || row.email || row.Mail;
          const name = row.Name || row.name || row.Schüler || row.Student;
          const grade = parseInt(row.Klasse || row.Grade || row.grade || row.Jahrgang || "0");
          
          if (email && name) {
            const token = await hashEmail(email);
            parsed.push({
              name,
              email,
              grade,
              token,
              choice: choices[token],
              assignedOption: undefined // can be populated later
            });
          }
        }
        
        setStudents(parsed);
        setDecrypted(true);
        snackbar({ message: `Erfolgreich entschlüsselt: ${parsed.length} Schüler gefunden.` });
      } catch (err) {
        console.error(err);
        alert({ headline: "Fehler", description: "Die Datei konnte nicht gelesen werden." });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const assignToFirstChoice = () => {
    const updated = students.map(s => {
      if (s.choice && s.choice.selected[0] !== "null") {
        return { ...s, assignedOption: s.choice.selected[0] };
      }
      return s;
    });
    setStudents(updated);
    snackbar({ message: "Alle Schüler mit einer Erstwahl wurden zugeteilt." });
  };

  const exportResults = () => {
    const data = students.map(s => {
      const row: any = {
        Name: s.name,
        Klasse: s.grade,
        "E-Mail": s.email,
        "Zugewiesenes Projekt": s.assignedOption ? vote?.options.find(o => o.id === s.assignedOption)?.title || s.assignedOption : "Keine Zuweisung"
      };

      if (vote) {
        for (let i = 0; i < vote.selectCount; i++) {
          const choiceId = s.choice?.selected[i];
          row[`${i + 1}. Wahl`] = choiceId && choiceId !== "null" ? vote.options.find(o => o.id === choiceId)?.title || choiceId : "Nicht gewählt";
        }
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ergebnisse");
    XLSX.writeFile(wb, `WaldorfWahlen_Ergebnisse_${vote?.title}.xlsx`);
  };

  if (loading) return <div><mdui-circular-progress></mdui-circular-progress></div>;
  if (!vote) return <div>Wahl nicht gefunden.</div>;

  const totalVoted = Object.keys(choices).length;

  return (
    <div>
      <h2>{vote.title} - Verwaltung</h2>
      
      {!decrypted ? (
        <mdui-card variant="outlined" style={{ padding: 24, marginTop: 24 }}>
          <h3>Daten entschlüsseln</h3>
          <p>Bisher haben {totalVoted} Personen abgestimmt. Die Daten liegen pseudonymisiert vor.</p>
          <p>Laden Sie die originale Excel-Datei hoch, um die Namen mit den Stimmen zu verknüpfen.</p>
          <mdui-button icon="lock_open" onClick={() => document.getElementById("decrypt-upload")?.click()}>
            Schlüssel-Excel hochladen
          </mdui-button>
          <input 
            id="decrypt-upload" 
            type="file" 
            accept=".xlsx,.xls,.csv" 
            style={{ display: "none" }} 
            onChange={handleExcelUpload} 
          />
        </mdui-card>
      ) : (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <mdui-button icon="auto_awesome" variant="filled" onClick={assignToFirstChoice}>Nach Erstwahl zuteilen</mdui-button>
            <mdui-button icon="download" onClick={exportResults}>Als Excel exportieren</mdui-button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="mdui-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--mdui-color-outline)" }}>
                  <th style={{ padding: 12 }}>Name</th>
                  <th style={{ padding: 12 }}>Klasse</th>
                  <th style={{ padding: 12 }}>Status</th>
                  <th style={{ padding: 12 }}>Zuweisung</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--mdui-color-surface-variant)" }}>
                    <td style={{ padding: 12 }}>{s.name}</td>
                    <td style={{ padding: 12 }}>{s.grade}</td>
                    <td style={{ padding: 12 }}>
                      {s.choice ? (
                        <span style={{ color: "var(--mdui-color-primary)" }}>Abgestimmt</span>
                      ) : (
                        <span style={{ color: "var(--mdui-color-error)" }}>Fehlt</span>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      {s.assignedOption ? (
                        <strong>{vote.options.find(o => o.id === s.assignedOption)?.title}</strong>
                      ) : (
                        <span style={{ color: "var(--mdui-color-on-surface-variant)" }}>-</span>
                      )}
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

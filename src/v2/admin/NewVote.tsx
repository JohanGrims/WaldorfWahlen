import { addDoc, doc, setDoc, Timestamp } from "firebase/firestore";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, functions } from "../../firebase";
import { generateRandomHash, hashEmail } from "../utils/crypto";
import * as XLSX from "xlsx";
import { alert, snackbar } from "mdui";
import { httpsCallable } from "firebase/functions";
import { V2_EMAIL_TEMPLATES } from "../utils/emailTemplates";

interface StudentRow {
  name: string;
  grade: number;
  email: string;
  token?: string; // computed locally
}

export default function V2NewVote() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectCount, setSelectCount] = useState(3);
  const [allowProposals, setAllowProposals] = useState(false);
  
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [options, setOptions] = useState<{ title: string; max: number; teacher: string; description: string }[]>([]);
  
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  
  // Option draft
  const [optTitle, setOptTitle] = useState("");
  const [optMax, setOptMax] = useState<number | "">("");
  const [optTeacher, setOptTeacher] = useState("");
  const [optDesc, setOptDesc] = useState("");

  const [saving, setSaving] = useState(false);

  const [emailSubject, setEmailSubject] = useState(V2_EMAIL_TEMPLATES.announcement.subject);
  const [emailBody, setEmailBody] = useState(V2_EMAIL_TEMPLATES.announcement.body);

  // Parse students Excel
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(sheet);

        const parsedStudents: StudentRow[] = [];
        for (const row of json) {
          const email = row.Email || row["E-Mail"] || row.email || row.Mail;
          const name = row.Name || row.name || row.Schüler || row.Student;
          const grade = parseInt(row.Klasse || row.Grade || row.grade || row.Jahrgang || "0");
          
          if (email && name) {
            const token = await hashEmail(email);
            parsedStudents.push({ name, email, grade, token });
          }
        }

        setStudents(parsedStudents);
        snackbar({ message: `${parsedStudents.length} Schüler mit E-Mails geladen.` });
      } catch (err) {
        console.error(err);
        alert({ headline: "Fehler", description: "Fehler beim Lesen der Excel Datei." });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const addOption = () => {
    if (!optTitle || !optMax) return;
    setOptions([...options, { 
      title: optTitle, 
      max: Number(optMax), 
      teacher: optTeacher, 
      description: optDesc 
    }]);
    setOptTitle(""); setOptMax(""); setOptTeacher(""); setOptDesc("");
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title || options.length === 0 || students.length === 0) {
      alert({ headline: "Fehlende Angaben", description: "Bitte füllen Sie alle erforderlichen Felder aus (Titel, mindestens 1 Option, Schülerliste hochgeladen)." });
      return;
    }

    setSaving(true);
    try {
      const voteId = generateRandomHash(10);
      
      // Determine dates
      let startObj = new Date();
      let endObj = new Date();
      endObj.setDate(endObj.getDate() + 14);

      if (startTime) {
        startObj = new Date(startTime);
      }
      if (endTime) {
        endObj = new Date(endTime);
      }

      const voteData = {
        title,
        description,
        selectCount,
        startTime: Timestamp.fromDate(startObj),
        endTime: Timestamp.fromDate(endObj),
        active: true,
        version: "v2",
        allowProposals,
        // remove options array
      };

      // 1. Save zero-PII vote config
      await setDoc(doc(db, `schools/SCHOOLID/v2_votes/${voteId}`), voteData);

      // Save options as subcollection
      const optionPromises = options.map((opt) => {
        const optId = generateRandomHash(8);
        return setDoc(doc(db, `schools/SCHOOLID/v2_votes/${voteId}/options/${optId}`), {
          ...opt
        });
      });
      await Promise.all(optionPromises);

      // 2. Send personalized emails via Cloud Function (without persisting PII)
      // Since send_email_func accepts emails and variables...
      const user = auth.currentUser;
      const token = await user?.getIdToken();

      let successCount = 0;
      let errorCount = 0;

      for (const student of students) {
        if (!student.token || !student.email) continue;
        
        const votingLink = `${window.location.origin}/v2/vote/${voteId}?token=${student.token}`;
        
        try {
          const personalizedSubject = emailSubject.replace(/{{title}}/g, title).replace(/{{name}}/g, student.name);
          const personalizedBody = emailBody
            .replace(/{{title}}/g, title)
            .replace(/{{name}}/g, student.name)
            .replace(/{{link}}/g, votingLink);

          const response = await httpsCallable(functions, "send_email_func")({
            token,
            uid: user?.uid,
            emails: [student.email],
            subject: personalizedSubject,
            body: personalizedBody,
            variables: {}
          });

          if ((response.data as any).error) {
            errorCount++;
          } else {
            successCount++;
          }
        } catch (e) {
          errorCount++;
        }
      }

      setSaving(false);
      alert({
        headline: "Wahl erstellt!",
        description: `Wahl wurde angelegt und ${successCount} E-Mails wurden versendet. (${errorCount} Fehler).`,
        confirmText: "Zum Dashboard",
        onConfirm: () => navigate("/v2/admin")
      });

    } catch (err) {
      console.error(err);
      setSaving(false);
      alert({ headline: "Fehler", description: "Fehler beim Erstellen der Wahl." });
    }
  };

  return (
    <div>
      <h2>Neue V2 Wahl erstellen</h2>
      <p style={{ color: "var(--mdui-color-on-surface-variant)" }}>
        Die Namen und E-Mail-Adressen werden NICHT in der Datenbank gespeichert. 
        Heben Sie die hochgeladene Excel-Datei gut auf, da sie der "Schlüssel" zum späteren Auswerten der Ergebnisse ist!
      </p>

      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 16 }}>
        <mdui-text-field 
          label="Titel der Wahl" 
          value={title} 
          onInput={(e: any) => setTitle(e.target.value)} 
          required 
        />
        <mdui-text-field 
          label="Beschreibung (Optional)" 
          value={description} 
          onInput={(e: any) => setDescription(e.target.value)} 
        />
        {/* selectCount is implicitly 1 for V2 or handled differently */}
        <div style={{ display: "flex", gap: 16 }}>
          <mdui-text-field 
            label="Startzeitpunkt (Optional)" 
            type="datetime-local" 
            value={startTime} 
            onInput={(e: any) => setStartTime(e.target.value)} 
            style={{ flex: 1 }}
          />
          <mdui-text-field 
            label="Endzeitpunkt (Optional)" 
            type="datetime-local" 
            value={endTime} 
            onInput={(e: any) => setEndTime(e.target.value)} 
            style={{ flex: 1 }}
          />
        </div>
        <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
          <mdui-text-field 
            label="Anzahl Wahlen pro Schüler" 
            type="number" 
            value={selectCount.toString()} 
            onInput={(e: any) => setSelectCount(parseInt(e.target.value))} 
            min="1"
          />
        </div>
        <div style={{ marginTop: "16px" }}>
          <mdui-checkbox 
            checked={allowProposals} 
            onInput={(e: any) => setAllowProposals(e.target.checked)}
          >
            Schülervorschläge erlauben
          </mdui-checkbox>
          <div style={{ color: "gray", fontSize: "0.9em", marginLeft: "32px", marginTop: "4px" }}>
            Schüler können eigene Projekte vorschlagen. Diese können dann im Dashboard als Optionen für die Wahl übernommen werden.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3>1. Schülerliste hochladen</h3>
        <p>Laden Sie eine Excel-Datei hoch, die die Spalten "Name", "Klasse" und "E-Mail" enthält.</p>
        <mdui-button onClick={() => document.getElementById("excel-upload")?.click()} icon="upload_file">
          Excel auswählen
        </mdui-button>
        <input 
          id="excel-upload" 
          type="file" 
          accept=".xlsx,.xls,.csv" 
          style={{ display: "none" }} 
          onChange={handleExcelUpload} 
        />
        {students.length > 0 && (
          <div style={{ marginTop: 16, color: "var(--mdui-color-primary)" }}>
            <mdui-icon name="check_circle" style={{ verticalAlign: "middle", marginRight: 8 }}></mdui-icon>
            {students.length} Schüler geladen und bereit zum E-Mail-Versand.
          </div>
        )}
      </div>

      <div style={{ marginTop: 32 }}>
        <h3>2. Projekte (Optionen) anlegen</h3>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <mdui-text-field label="Titel" value={optTitle} onInput={(e: any) => setOptTitle(e.target.value)} />
          <mdui-text-field label="Max. Teilnehmer" type="number" value={optMax.toString()} onInput={(e: any) => setOptMax(Number(e.target.value) || "")} />
          <mdui-text-field label="Lehrer (Optional)" value={optTeacher} onInput={(e: any) => setOptTeacher(e.target.value)} />
          <mdui-text-field label="Beschreibung (Optional)" value={optDesc} onInput={(e: any) => setOptDesc(e.target.value)} />
          <mdui-button icon="add" onClick={addOption} disabled={!optTitle || !optMax}>Hinzufügen</mdui-button>
        </div>

        <div style={{ marginTop: 16 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", backgroundColor: "var(--mdui-color-surface-container-high)", borderRadius: 8, marginBottom: 8 }}>
              <div>
                <strong>{opt.title}</strong> (Max: {opt.max}) {opt.teacher ? `- ${opt.teacher}` : ""}
              </div>
              <mdui-button-icon icon="delete" onClick={() => removeOption(i)}></mdui-button-icon>
            </div>
          ))}
          {options.length === 0 && <div style={{ color: "var(--mdui-color-on-surface-variant)" }}>Noch keine Optionen hinzugefügt.</div>}
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3>3. E-Mail Vorlage</h3>
        <p>Verwenden Sie die Platzhalter <code>{`{{name}}`}</code>, <code>{`{{title}}`}</code> und <code>{`{{link}}`}</code>.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <mdui-text-field 
            label="Betreff" 
            value={emailSubject} 
            onInput={(e: any) => setEmailSubject(e.target.value)} 
          />
          <mdui-text-field 
            label="E-Mail Text (HTML)" 
            rows={6}
            value={emailBody} 
            onInput={(e: any) => setEmailBody(e.target.value)} 
          />
        </div>
      </div>

      <div style={{ marginTop: 48, display: "flex", justifyContent: "flex-end" }}>
        <mdui-button 
          end-icon="send" 
          onClick={handleCreate} 
          loading={saving} 
          disabled={saving || !title || options.length === 0 || students.length === 0}
        >
          Wahl speichern & E-Mails versenden
        </mdui-button>
      </div>

    </div>
  );
}

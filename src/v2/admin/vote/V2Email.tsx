import React, { useState } from "react";
import { useLoaderData } from "react-router-dom";
import { V2LoaderData } from "./V2Layout";
import { useDecryption } from "../../contexts";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../../../firebase";
import { alert, snackbar } from "mdui";
import { V2_EMAIL_TEMPLATES } from "../../utils/emailTemplates";

export default function V2Email() {
  const { vote, choices } = useLoaderData() as V2LoaderData;
  const { students } = useDecryption();

  const [emailSubject, setEmailSubject] = useState(V2_EMAIL_TEMPLATES.reminder.subject);
  const [emailBody, setEmailBody] = useState(V2_EMAIL_TEMPLATES.reminder.body);

  const [targetGroup, setTargetGroup] = useState<"all" | "missing">("missing");
  const [sending, setSending] = useState(false);

  // Compute missing
  const choiceTokens = new Set(choices.map((c) => c.id));
  const missingStudents = students.filter((s) => !choiceTokens.has(s.token));

  const targetStudents = targetGroup === "all" ? students : missingStudents;

  const handleSend = async () => {
    if (targetStudents.length === 0) {
      alert({ headline: "Info", description: "Es gibt keine Schüler in der gewählten Zielgruppe." });
      return;
    }

    setSending(true);
    try {
      const user = auth.currentUser;
      const token = await user?.getIdToken();

      let successCount = 0;
      let errorCount = 0;

      for (const student of targetStudents) {
        const votingLink = `${window.location.origin}/v2/vote/${vote.id}?t=${student.token}`;
        const personalizedSubject = emailSubject
          .replace(/{{title}}/g, vote.title)
          .replace(/{{name}}/g, student.name);
        
        const personalizedBody = emailBody
          .replace(/{{title}}/g, vote.title)
          .replace(/{{name}}/g, student.name)
          .replace(/{{link}}/g, votingLink);

        try {
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

      setSending(false);
      alert({
        headline: "Versand abgeschlossen",
        description: `${successCount} E-Mails erfolgreich versendet. ${errorCount > 0 ? `(${errorCount} Fehler)` : ""}`,
      });
    } catch (err) {
      console.error(err);
      setSending(false);
      snackbar({ message: "Kritischer Fehler beim E-Mail-Versand." });
    }
  };

  return (
    <div className="mdui-prose">
      <h2>E-Mails versenden</h2>
      <p>
        Senden Sie personalisierte Links an die Schüler. Der Token (Schlüssel) ist in den generierten
        Links enthalten, sodass die Schüler pseudonymisiert abstimmen können.
      </p>

      <div style={{ marginTop: 32 }}>
        <h3>1. Zielgruppe</h3>
        <mdui-radio-group 
          value={targetGroup} 
          onInput={(e: any) => setTargetGroup(e.target.value)}
          style={{ display: "flex", flexDirection: "column", gap: "8px" }}
        >
          <mdui-radio value="missing">
            Nur fehlende Schüler 
            <span style={{ color: "gray", marginLeft: "8px" }}>({missingStudents.length} Schüler)</span>
          </mdui-radio>
          <mdui-radio value="all">
            Alle Schüler 
            <span style={{ color: "gray", marginLeft: "8px" }}>({students.length} Schüler)</span>
          </mdui-radio>
        </mdui-radio-group>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3>2. E-Mail Vorlage</h3>
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

      <div style={{ marginTop: 48, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "var(--mdui-color-primary)", fontWeight: "bold" }}>
          Empfänger insgesamt: {targetStudents.length}
        </div>
        <mdui-button 
          icon="send" 
          onClick={handleSend} 
          loading={sending}
          disabled={sending || targetStudents.length === 0}
        >
          Senden
        </mdui-button>
      </div>
    </div>
  );
}

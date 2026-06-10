import {
  collection,
  getDocs,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import React from "react";
import { useLoaderData, useParams } from "react-router-dom";
import { db, auth, functions } from "../../firebase";
import { alert, prompt, snackbar } from "mdui";
import { httpsCallable } from "firebase/functions";
import { useDecryption } from "../../contexts";
import { V2_EMAIL_TEMPLATES } from "../../utils/emailTemplates";

interface VoteData extends DocumentData {
  id: string;
  title: string;
  startTime?: Timestamp;
  endTime?: Timestamp;
  active: boolean;
}

interface ChoiceData extends DocumentData {
  id: string;
  name: string;
  grade: number;
  listIndex: string;
  selected?: string[];
}

interface OptionData extends DocumentData {
  id: string;
  title: string;
  teacher?: string;
  description?: string;
}

interface StudentData {
  name: string;
  listIndex: string;
  email?: string;
  token?: string;
}

interface ClassData extends DocumentData {
  id: string;
  grade: number;
  students: StudentData[];
}

interface ResultData extends DocumentData {
  id: string;
  listIndex: string;
  name: string;
  assignedOption: string;
}

interface LoaderData {
  vote: VoteData;
  choices: ChoiceData[];
  options: OptionData[];
  results?: ResultData[];
}

interface EmailTemplate {
  subject: string;
  body: string;
}

const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  announcement: {
    subject: "Wählen: {{vote_title}}",
    body: `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neue Wahl – WaldorfWahlen</title>
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            background-color: #F5F5F5;
            padding: 24px;
            display: flex;
            justify-content: center;
        }
        .container {
            max-width: 600px;
            background: #FFFFFF;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
            text-align: left;
        }
        h3 {
            font-size: 24px;
            font-weight: 500;
            margin-bottom: 16px;
            color: #333;
        }
        p {
            color: #424242;
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 16px;
        }
        .button {
            display: inline-block;
            background: #f89e24;
            color: white;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 9999px;
            font-size: 16px;
            font-weight: 500;
            text-align: center;
            margin-top: 16px;
            transition: background 0.3s;
        }
        .button:hover {
            background: #d8801b;
        }
        .footer {
            margin-top: 20px;
            font-size: 14px;
            color: #757575;
        }
        .link-box {
            margin-top: 12px;
            padding: 12px;
            background: #F5F5F5;
            border-radius: 8px;
            font-size: 14px;
            word-wrap: break-word;
            color: #333;
        }
        strong {
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h3>Neue Wahl: {{vote_title}}</h3>
        <p>Liebe/r {{student_name}},</p>
        <p>es ist eine neue Wahl verfügbar: <strong>{{vote_title}}</strong></p>
        <p><strong>Wahlzeitraum:</strong> {{start_time}} bis {{end_time}}</p>
        <p>Bitte besuchen Sie die folgende Website, um Ihre Stimme abzugeben:</p>
        <p style="text-align: center;">
            <a href="${window.location.origin}/v/{{vote_id}}?name={{student_name_encoded}}&grade={{student_grade}}&listIndex={{student_list_index}}" class="button">Jetzt wählen</a>
        </p>
        <p><strong>Direktlink (mit vorausgefüllten Daten):</strong></p>
        <p class="link-box">${window.location.origin}/v/{{vote_id}}?name={{student_name_encoded}}&grade={{student_grade}}&listIndex={{student_list_index}}</p>
        <p class="footer">Mit freundlichen Grüßen!</p>
    </div>
</body>
</html>`,
  },
  reminder: {
    subject: "Erinnerung: {{vote_title}}",
    body: `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erinnerung – WaldorfWahlen</title>
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            background-color: #F5F5F5;
            padding: 24px;
            display: flex;
            justify-content: center;
        }
        .container {
            max-width: 600px;
            background: #FFFFFF;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
            text-align: left;
        }
        h3 {
            font-size: 24px;
            font-weight: 500;
            margin-bottom: 16px;
            color: #333;
        }
        p {
            color: #424242;
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 16px;
        }
        .button {
            display: inline-block;
            background: #f89e24;
            color: white;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 9999px;
            font-size: 16px;
            font-weight: 500;
            text-align: center;
            margin-top: 16px;
            transition: background 0.3s;
        }
        .button:hover {
            background: #d8801b;
        }
        .footer {
            margin-top: 20px;
            font-size: 14px;
            color: #757575;
        }
        .link-box {
            margin-top: 12px;
            padding: 12px;
            background: #F5F5F5;
            border-radius: 8px;
            font-size: 14px;
            word-wrap: break-word;
            color: #333;
        }
        strong {
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h3>Erinnerung: {{vote_title}}</h3>
        <p>Liebe/r {{student_name}},</p>
        <p>Sie haben noch nicht an der Wahl <strong>{{vote_title}}</strong> teilgenommen.</p>
        <p><strong>Wahlende:</strong> {{end_time}}</p>
        <p>Bitte vergessen Sie nicht, Ihre Stimme abzugeben:</p>
        <p style="text-align: center;">
            <a href="${window.location.origin}/v/{{vote_id}}?name={{student_name_encoded}}&grade={{student_grade}}&listIndex={{student_list_index}}" class="button">Jetzt wählen</a>
        </p>
        <p>Falls Sie diese E-Mail unerwartet erhalten haben, ignorieren Sie diese Nachricht einfach.</p>
        <p><strong>Direktlink (mit vorausgefüllten Daten):</strong></p>
        <p class="link-box">${window.location.origin}/v/{{vote_id}}?name={{student_name_encoded}}&grade={{student_grade}}&listIndex={{student_list_index}}</p>
        <p class="footer">Mit freundlichen Grüßen!</p>
    </div>
</body>
</html>`,
  },
  results: {
    subject: "Ergebnisse: {{vote_title}}",
    body: `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wahlergebnisse – WaldorfWahlen</title>
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            background-color: #F5F5F5;
            padding: 24px;
            display: flex;
            justify-content: center;
        }
        .container {
            max-width: 600px;
            background: #FFFFFF;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
            text-align: left;
        }
        h3 {
            font-size: 24px;
            font-weight: 500;
            margin-bottom: 16px;
            color: #333;
        }
        p {
            color: #424242;
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 16px;
        }
        .button {
            display: inline-block;
            background: #f89e24;
            color: white;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 9999px;
            font-size: 16px;
            font-weight: 500;
            text-align: center;
            margin-top: 16px;
            transition: background 0.3s;
        }
        .button:hover {
            background: #d8801b;
        }
        .footer {
            margin-top: 20px;
            font-size: 14px;
            color: #757575;
        }
        .link-box {
            margin-top: 12px;
            padding: 12px;
            background: #F5F5F5;
            border-radius: 8px;
            font-size: 14px;
            word-wrap: break-word;
            color: #333;
        }
        strong {
            font-weight: 600;
        }
        .result-box {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h3>Ergebnisse: {{vote_title}}</h3>
        <p>Liebe/r {{student_name}},</p>
        <p>die Wahl <strong>{{vote_title}}</strong> ist beendet. Hier sind Ihre Ergebnisse:</p>
        
        <div class="result-box">
            <p style="margin: 0;"><strong>Ihre Zuteilung: {{assigned_option}}</strong></p>
            {{assigned_details}}
        </div>
        
        <p>Die vollständigen Ergebnisse können Sie hier einsehen:</p>
        <p style="text-align: center;">
            <a href="${window.location.origin}/r/{{vote_id}}?id={{choice_id}}" class="button">Ergebnisse ansehen</a>
        </p>
        
        <p><strong>Direktlink (mit Identifikation):</strong></p>
        <p class="link-box">${window.location.origin}/r/{{vote_id}}?id={{choice_id}}</p>

        <p class="footer">Mit freundlichen Grüßen!</p>
    </div>
</body>
</html>`,
  },
};

export default function Email() {
  const { vote, choices, options, results } = useLoaderData() as LoaderData;
  const { id } = useParams<{ id: string }>();
  const { students: decryptedStudents, hasMapping } = useDecryption();

  const [loading, setLoading] = React.useState<boolean>(true);
  const [classes, setClasses] = React.useState<ClassData[]>([]);
  const [step, setStep] = React.useState<
    "select" | "template" | "send" | "sending"
  >("select");

  // Selection state
  const [selectedStudents, setSelectedStudents] = React.useState<Set<string>>(
    new Set()
  );
  const [activeTab, setActiveTab] = React.useState<string>("class");

  const [progress, setProgress] = React.useState<number>(0);
  const [logs, setLogs] = React.useState<{type: 'success' | 'error' | 'info', message: string}[]>([]);

  // Email sending state
  const [selectedTemplate, setSelectedTemplate] = React.useState<
    "announcement" | "reminder" | "results"
  >("announcement");
  const [customSubject, setCustomSubject] = React.useState<string>("");
  const [customBody, setCustomBody] = React.useState<string>("");

  const [sending, setSending] = React.useState<boolean>(false);

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  React.useEffect(() => {
    async function loadClasses() {
      if (vote.anonymous) {
        // Group DecryptionContext students by grade to mimic class data
        if (!hasMapping || decryptedStudents.length === 0) {
          setClasses([]);
          setLoading(false);
          return;
        }

        const grouped = decryptedStudents.reduce((acc, student, index) => {
          const grade = student.grade || 0;
          if (!acc[grade]) {
            acc[grade] = [];
          }
          acc[grade].push({
            name: student.name,
            email: student.email,
            listIndex: student.token || index.toString(), // Use token as listIndex for anonymous
            token: student.token,
          });
          return acc;
        }, {} as Record<number, StudentData[]>);

        const classData: ClassData[] = Object.keys(grouped).map((gradeStr) => ({
          id: `grade-${gradeStr}`,
          grade: Number(gradeStr),
          students: grouped[Number(gradeStr)],
        }));
        setClasses(classData);
        setLoading(false);
      } else {
        try {
          const classSnapshot = await getDocs(
            collection(db, "schools/SCHOOLID/class")
          );
          const classData = classSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ClassData[];
          setClasses(classData);
          setLoading(false);
        } catch (error) {
          console.error("Error loading classes:", error);
          setLoading(false);
        }
      }
    }

    loadClasses();
  }, [vote.anonymous, hasMapping, decryptedStudents]);

  React.useEffect(() => {
    // Load template when selected
    const template = vote.anonymous ? V2_EMAIL_TEMPLATES[selectedTemplate as keyof typeof V2_EMAIL_TEMPLATES] : EMAIL_TEMPLATES[selectedTemplate];
    if (template) {
      setCustomSubject(template.subject);
      setCustomBody(template.body);
    }
  }, [selectedTemplate, vote.anonymous]);

  // Helper functions for selection management
  const toggleStudentSelection = (classId: string, listIndex: string) => {
    const studentKey = `${classId}-${listIndex}`;
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentKey)) {
      newSelected.delete(studentKey);
    } else {
      newSelected.add(studentKey);
    }
    setSelectedStudents(newSelected);
  };

  const selectAllInClass = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return;

    const newSelected = new Set(selectedStudents);
    cls.students.forEach((student) => {
      if (student.email) {
        newSelected.add(`${classId}-${student.listIndex}`);
      }
    });
    setSelectedStudents(newSelected);
  };

  const deselectAllInClass = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return;

    const newSelected = new Set(selectedStudents);
    cls.students.forEach((student) => {
      newSelected.delete(`${classId}-${student.listIndex}`);
    });
    setSelectedStudents(newSelected);
  };

  const selectAllVoters = () => {
    const participantKeys = new Set(
      choices.map((choice) => `${choice.grade}-${choice.listIndex}`)
    );
    const newSelected = new Set<string>();

    classes.forEach((cls) => {
      cls.students.forEach((student) => {
        const studentKey = `${cls.grade}-${student.listIndex}`;
        if (student.email && participantKeys.has(studentKey)) {
          newSelected.add(`${cls.id}-${student.listIndex}`);
        }
      });
    });

    setSelectedStudents(newSelected);
  };

  const selectAllNonVoters = () => {
    const participantKeys = new Set(
      choices.map((choice) => `${choice.grade}-${choice.listIndex}`)
    );
    const newSelected = new Set<string>();

    classes.forEach((cls) => {
      cls.students.forEach((student) => {
        const studentKey = `${cls.grade}-${student.listIndex}`;
        if (student.email && !participantKeys.has(studentKey)) {
          newSelected.add(`${cls.id}-${student.listIndex}`);
        }
      });
    });

    setSelectedStudents(newSelected);
  };

  const selectAll = () => {
    const newSelected = new Set<string>();
    classes.forEach((cls) => {
      cls.students.forEach((student) => {
        if (student.email) {
          newSelected.add(`${cls.id}-${student.listIndex}`);
        }
      });
    });
    setSelectedStudents(newSelected);
  };

  const clearAllSelections = () => {
    setSelectedStudents(new Set());
  };

  const getSelectedStudentsData = () => {
    const selectedData: (StudentData & { grade: number; classId: string })[] =
      [];

    classes.forEach((cls) => {
      cls.students.forEach((student) => {
        const studentKey = `${cls.id}-${student.listIndex}`;
        if (selectedStudents.has(studentKey) && student.email) {
          selectedData.push({
            ...student,
            grade: cls.grade,
            classId: cls.id!,
          });
        }
      });
    });

    return selectedData;
  };

  const getEmailList = () => {
    const selectedData = getSelectedStudentsData();
    return selectedData
      .map((student) => student.email)
      .filter((email, index, array) => array.indexOf(email) === index) // Remove duplicates
      .join(", ");
  };

  const getTemplateVariables = () => {
    const variables: Record<string, string> = {
      vote_title: vote.title,
      vote_id: vote.id,
      start_time: vote.startTime
        ? new Date(vote.startTime.seconds * 1000).toLocaleString("de-DE")
        : "TBD",
      end_time: vote.endTime
        ? new Date(vote.endTime.seconds * 1000).toLocaleString("de-DE")
        : "TBD",
    };

    return variables;
  };

  const sendEmails = async () => {
    setStep("sending");
    setSending(true);
    setLogs([{ type: "info", message: "🚀 Starte Massenversand..." }]);
    setProgress(0);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Nicht angemeldet");
      const token = await user.getIdToken();

      const selectedData = getSelectedStudentsData();
      const totalMails = selectedData.length;

      if (totalMails === 0) {
        snackbar({ message: "Keine E-Mail-Adressen verfügbar" });
        setStep("select");
        setSending(false);
        return;
      }

      // Schleife mit Throttling
      for (let i = 0; i < totalMails; i++) {
        const student = selectedData[i];
        const email = student.email!;

        // Variablen zusammenbauen (deine bestehende Logik)
        let personalVariables: Record<string, string> = {
          ...getTemplateVariables(),
          student_name: student.name,
          student_name_encoded: encodeURIComponent(student.name),
          student_grade: student.grade.toString(),
          student_list_index: student.listIndex,
        };

        if (selectedTemplate === "results" && results) {
          const choice = choices.find(c => c.listIndex == student.listIndex && c.grade == student.grade);
          const studentResult = choice ? results.find(r => r.id == choice.id) : null;
          const assignedOption = studentResult ? options.find(o => o.id == studentResult.result) : null;

          personalVariables = {
            ...personalVariables,
            choice_id: choice?.id || "",
            assigned_option: assignedOption?.title || "Nicht zugewiesen",
            assigned_details: assignedOption ? `<p><strong>Lehrer:</strong> ${assignedOption.teacher || "N/A"}</p><p><strong>Beschreibung:</strong> ${assignedOption.description || "Keine Beschreibung verfügbar"}</p>` : "",
          };
        }

        if (vote.anonymous) {
          personalVariables.token = student.token || "";
          personalVariables.link = `${window.location.origin}/v/${vote.id}?t=${student.token}`;
        }

        // Einzelne E-Mail senden
        try {
          const response = await httpsCallable(functions, "send_email_func")({
            token,
            uid: user.uid,
            emails: [email],
            subject: customSubject,
            body: customBody,
            variables: personalVariables,
          });

          if ((response.data as any).error) {
            setLogs(prev => [...prev, { type: "error", message: `[${i + 1}/${totalMails}] ❌ Fehler bei ${email}: ${(response.data as any).error}` }]);
          } else {
            setLogs(prev => [...prev, { type: "success", message: `[${i + 1}/${totalMails}] ✅ Erfolgreich gesendet an: ${email}` }]);
          }
        } catch (err: any) {
          setLogs(prev => [...prev, { type: "error", message: `[${i + 1}/${totalMails}] 🚨 Kritischer Fehler bei ${email}: ${err.message}` }]);
        }

        // Fortschritt aktualisieren
        setProgress(i + 1);

        // THROTTLING: Warte 2 Sekunden (außer nach der allerletzten E-Mail)
        if (i < totalMails - 1) {
          await delay(2000); // 2000 Millisekunden = 2 Sekunden
        }
      }

      setLogs(prev => [...prev, { type: "info", message: "🎉 Alle E-Mails wurden abgearbeitet!" }]);
      snackbar({ message: `Versandlauf beendet!` });
      
    } catch (error) {
      console.error("Error sending emails:", error);
      setLogs(prev => [...prev, { type: "error", message: `Abbruch: ${error instanceof Error ? error.message : "Unbekannter Fehler"}` }]);
    } finally {
      setSending(false);
    }
  };


  const sendTestEmail = async () => {
    const testEmailAddress = await prompt({
      headline: "Test-E-Mail senden",
      description:
        "Geben Sie die E-Mail-Adresse ein, an die die Test-E-Mail gesendet werden soll:",
      icon: "email",
      textFieldOptions: {
        value: auth.currentUser?.email || "",
      },
    });

    if (!testEmailAddress || !testEmailAddress.trim()) {
      return; // User cancelled or entered empty email
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmailAddress.trim())) {
      snackbar({ message: "Ungültige E-Mail-Adresse" });
      return;
    }

    setSending(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Nicht angemeldet");
      }

      const token = await user.getIdToken();

      const selectedData = getSelectedStudentsData();
      let randomStudent = selectedData.length > 0 ? selectedData[0] : null;

      if (!randomStudent) {
        classes.forEach((cls) => {
          if (!randomStudent && cls.students.length > 0) {
            randomStudent = { ...cls.students[0], grade: cls.grade, classId: cls.id };
          }
        });
      }

      if (!randomStudent) throw new Error("Kein Schüler gefunden");

      let personalVariables: Record<string, string> = {
        ...getTemplateVariables(),
        student_name: randomStudent.name,
        student_name_encoded: encodeURIComponent(randomStudent.name),
        student_grade: randomStudent.grade.toString(),
        student_list_index: randomStudent.listIndex,
      };

      if (vote.anonymous) {
        personalVariables.token = randomStudent.token || "";
        personalVariables.link = `${window.location.origin}/v/${vote.id}?t=${randomStudent.token}`;
      }

      const response = await httpsCallable(
        functions,
        "send_email_func"
      )({
        token,
        uid: user.uid,
        emails: [testEmailAddress.trim()],
        subject: `[TEST] ${customSubject}`,
        body: customBody,
        variables: personalVariables,
      });

      if ((response.data as any).error) {
        snackbar({ message: `Fehler: ${(response.data as any).error}` });
      } else {
        snackbar({ message: "Test-E-Mail gesendet!" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mdui-prose">
        <h2>E-Mail-Verwaltung</h2>
        <mdui-linear-progress></mdui-linear-progress>
      </div>
    );
  }

  // Step 1: Student Selection
  if (step === "select") {
    const selectedCount = selectedStudents.size;
    const emailCount = getEmailList()
      .split(", ")
      .filter((email) => email.trim()).length;

    return (
      <div className="mdui-prose">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <h2>Empfänger auswählen</h2>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <mdui-button-icon
            variant="filled"
            icon="checklist"
            onClick={selectedCount === 0 ? selectAll : clearAllSelections}
          />
          <mdui-button
            variant="tonal"
            icon="how_to_vote"
            onClick={selectAllVoters}
          >
            Alle Wähler
          </mdui-button>
          <mdui-button
            variant="tonal"
            icon="person_off"
            onClick={selectAllNonVoters}
          >
            Alle Nicht-Wähler
          </mdui-button>
          <div style={{ flex: 1 }} />
          <span>
            {selectedCount} ausgewählt ({emailCount} E-Mails)
          </span>
          {selectedCount > 0 ? (
            <mdui-button
              variant="outlined"
              icon="arrow_forward"
              onClick={() => setStep("template")}
            >
              Fortfahren
            </mdui-button>
          ) : (
            <mdui-button variant="outlined" icon="arrow_forward" disabled>
              Fortfahren
            </mdui-button>
          )}
        </div>

        {vote.anonymous && !hasMapping && (
          <mdui-card
            variant="filled"
            style={{
              padding: "24px",
              marginBottom: "24px",
              backgroundColor: "var(--mdui-color-error-container)",
              color: "var(--mdui-color-on-error-container)"
            }}
          >
            <h3><mdui-icon name="warning" style={{ verticalAlign: "middle", marginRight: "8px" }}/> Anonyme Wahl</h3>
            <p>
              Da dies eine anonyme Wahl ist, können die IServ-Klassendaten nicht verwendet werden.
              Bitte laden Sie über das <b>Schlüssel-Symbol oben in der Navigationsleiste</b> eine Excel-Liste hoch,
              die die Klarnamen und E-Mail-Adressen enthält.
            </p>
          </mdui-card>
        )}

        <mdui-divider style={{ marginBottom: "16px" }} />

        <mdui-tabs value={activeTab}>
          {classes
            .sort((a, b) => a.grade - b.grade)
            .map((cls) => (
              <mdui-tab
                key={cls.id}
                value={`class-${cls.grade}`}
                onClick={() => setActiveTab(`class-${cls.grade}`)}
              >
                Klasse {cls.grade}
              </mdui-tab>
            ))}

          {classes.map((cls) => {
            const studentsWithEmail = (vote as any).anonymous
              ? decryptedStudents.filter((s) => s.grade === cls.grade).map(s => ({ ...s, listIndex: s.token }))
              : cls.students.filter((s) => s.email && s.email.trim().length > 0);

            const participantListIndexes = new Set(
              (vote as any).anonymous
                ? choices.map(c => c.id) // token is ID
                : choices.filter(c => c.grade == cls.grade).map(c => String(c.listIndex))
            );

            return (
            <mdui-tab-panel
              key={cls.id}
              slot="panel"
              value={`class-${cls.grade}`}
            >
              <div style={{ padding: "16px 0" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <h3>Klasse {cls.grade}</h3>
                  <div style={{ display: "flex", gap: "8px" }}>
                  </div>
                </div>

                <div style={{ marginTop: "16px" }}>
                  {studentsWithEmail.length === 0 ? (
                    <p
                      style={{
                        textAlign: "center",
                        color: "var(--mdui-color-on-surface-variant)",
                        margin: "32px 0",
                      }}
                    >
                      Keine SchülerInnen mit E-Mail-Adresse in dieser Klasse
                    </p>
                  ) : (
                    <mdui-list>
                      {studentsWithEmail.map((student) => {
                        const studentKey = `${cls.id}-${student.listIndex}`;
                        const isSelected = selectedStudents.has(studentKey);
                        const hasVoted = participantListIndexes.has(
                          String(student.listIndex)
                        );

                        return (
                          <mdui-list-item
                            key={studentKey}
                            rounded
                            onClick={() =>
                              toggleStudentSelection(cls.id!, student.listIndex)
                            }
                            icon={
                              isSelected ? "check" : "check_box_outline_blank"
                            }
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                width: "100%",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <strong>{student.name}</strong>
                                <br />
                                <small style={{ opacity: 0.7 }}>
                                  {student.email} • #{student.listIndex}
                                </small>
                              </div>
                              <div>
                                {hasVoted ? (
                                  <mdui-chip
                                    disabled
                                    style={{
                                      background:
                                        "var(--mdui-color-tertiary-container)",
                                    }}
                                  >
                                    <mdui-icon slot="icon" name="how_to_vote" />
                                    Hat gewählt
                                  </mdui-chip>
                                ) : (
                                  <mdui-chip
                                    disabled
                                    style={{
                                      background:
                                        "var(--mdui-color-surface-variant)",
                                    }}
                                  >
                                    <mdui-icon slot="icon" name="person_off" />
                                    Nicht gewählt
                                  </mdui-chip>
                                )}
                              </div>
                            </div>
                          </mdui-list-item>
                        );
                      })}
                    </mdui-list>
                  )}
                </div>
              </div>
            </mdui-tab-panel>
            );
          })}
        </mdui-tabs>
      </div>
    );
  }

  // Step 2: Template Selection
  if (step === "template") {
    const emailCount = getEmailList()
      .split(", ")
      .filter((email) => email.trim()).length;

    return (
      <div className="mdui-prose">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "24px",
            gap: "16px",
          }}
        >
          <mdui-button-icon
            icon="arrow_back"
            onClick={() => setStep("select")}
          />
          <h2 style={{ margin: 0 }}>Vorlage auswählen</h2>
        </div>

        <mdui-card
          variant="outlined"
          style={{ width: "100%", padding: "20px" }}
          clickable
          onClick={() => {
            setSelectedTemplate("announcement");
            setStep("send");
          }}
        >
          <div
            className="mdui-prose"
            style={{ width: "100%", userSelect: "none" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div style={{ gap: "10px", textWrap: "nowrap", display: "flex" }}>
                <h2>Ankündigung</h2>
                <mdui-icon name="announcement"></mdui-icon>
              </div>
            </div>
            Informiert SchülerInnen über eine neue verfügbare Wahl.
          </div>
        </mdui-card>

        <mdui-card
          variant="outlined"
          style={{ width: "100%", padding: "20px" }}
          clickable
          onClick={() => {
            setSelectedTemplate("reminder");
            setStep("send");
          }}
        >
          <div
            className="mdui-prose"
            style={{ width: "100%", userSelect: "none" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div style={{ gap: "10px", textWrap: "nowrap", display: "flex" }}>
                <h2>Erinnerung</h2>
                <mdui-icon name="notifications"></mdui-icon>
              </div>
            </div>
            Erinnert SchülerInnen daran, die Wahl noch nicht abgestimmt haben.
          </div>
        </mdui-card>

        <mdui-card
          variant="outlined"
          style={{ width: "100%", padding: "20px" }}
          clickable
          onClick={() => {
            if (results && results.length > 0) {
              setSelectedTemplate("results");
              setStep("send");
            }
          }}
          disabled={!results || results.length === 0}
        >
          <div
            className="mdui-prose"
            style={{ width: "100%", userSelect: "none" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div style={{ gap: "10px", textWrap: "nowrap", display: "flex" }}>
                <h2>Ergebnisse</h2>
                <mdui-icon name="bar_chart"></mdui-icon>
              </div>
            </div>
            Teilt jedem Schüler seine persönlichen Wahlergebnisse mit.
            {!results || results.length === 0 ? (
              <small style={{ color: "var(--mdui-color-error)" }}>
                Keine Ergebnisse verfügbar
              </small>
            ) : null}
          </div>
        </mdui-card>
      </div>
    );
  }

  // Step 3: Send Emails
  if (step === "send") {
    const emailList = getEmailList();

    return (
      <div className="mdui-prose">
        <title>E-Mail senden - {vote.title}</title>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "24px",
            gap: "16px",
          }}
        >
          <mdui-button-icon
            icon="arrow_back"
            onClick={() => setStep("template")}
            disabled={sending}
          />
          <h2 style={{ margin: 0 }}>E-Mail senden</h2>
        </div>
        <h3>E-Mail-Inhalt anpassen</h3>
        <mdui-text-field
          label="Betreff"
          value={customSubject}
          onInput={(e) =>
            setCustomSubject((e.target as HTMLInputElement).value)
          }
          style={{ width: "100%", marginBottom: "16px" }}
        />
        <mdui-text-field
          label="Nachricht (HTML unterstützt)"
          value={customBody}
          onInput={(e) =>
            setCustomBody((e.target as HTMLTextAreaElement).value)
          }
          rows={8}
          style={{ width: "100%" }}
        />{" "}
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "var(--mdui-color-surface-variant)",
            borderRadius: "8px",
          }}
        >
          <strong>Verfügbare Variablen:</strong>
          <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
            <li>
              <code>{"{{vote_title}}"}</code> - Titel der Wahl
            </li>
            <li>
              <code>{"{{vote_id}}"}</code> - ID der Wahl
            </li>
            <li>
              <code>{"{{start_time}}"}</code> - Startzeit
            </li>
            <li>
              <code>{"{{end_time}}"}</code> - Endzeit
            </li>{" "}
            <li>
              <code>{"{{student_name}}"}</code> - Name des Schülers
            </li>
            <li>
              <code>{"{{student_name_encoded}}"}</code> - URL-kodierter Name des
              Schülers
            </li>
            <li>
              <code>{"{{student_grade}}"}</code> - Klasse des Schülers
            </li>
            <li>
              <code>{"{{student_list_index}}"}</code> - Klassenlistennummer
            </li>
            {selectedTemplate === "results" && (
              <>
                <li>
                  <code>{"{{choice_id}}"}</code> - ID der Wahl-Teilnahme
                </li>
                <li>
                  <code>{"{{assigned_option}}"}</code> - Zugewiesene Option
                </li>
                <li>
                  <code>{"{{assigned_details}}"}</code> - Details der Option
                </li>
              </>
            )}
          </ul>
        </div>
        {/* Test Email Section */}
        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            backgroundColor: "var(--mdui-color-surface-variant)",
            borderRadius: "8px",
          }}
        >
          <h4 style={{ margin: "0 0 12px 0" }}>Test-E-Mail</h4>
          <p style={{ margin: "0 0 12px 0", fontSize: "14px" }}>
            Senden Sie eine Test-E-Mail mit zufälligen Schülerdaten an Ihre
            E-Mail-Adresse, um die Vorlage zu überprüfen.
          </p>
          <mdui-button
            variant="outlined"
            icon="mail"
            onClick={sendTestEmail}
            disabled={sending}
          >
            Test-E-Mail senden
          </mdui-button>
        </div>
        {/* Send Action */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <mdui-fab
            icon="send"
            style={{
              position: "fixed",
              right: "20px",
              bottom: "20px",
            }}
            extended
            onClick={sendEmails}
            disabled={sending}
          >
            Senden
          </mdui-fab>
        </div>
      </div>
    );
  }

  if (step === "sending" || (step === "send" && logs.length > 0)) { // Erlaubt Ansicht auch wenn fertig
    const totalMails = getSelectedStudentsData().length;
    
    return (
      <div className="mdui-prose">
        <h2>E-Mail Versand {sending ? "läuft..." : "abgeschlossen"}</h2>

        {sending && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px",
              backgroundColor: "var(--mdui-color-warning-container)",
              color: "var(--mdui-color-on-warning-container)",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <mdui-icon name="warning" style={{ fontSize: "24px" }}></mdui-icon>
            <div>
              <strong>Wichtiger Hinweis:</strong>
              <br />
              Schließen Sie diesen Tab nicht und navigieren Sie nicht weg, bis der Versand abgeschlossen ist.
            </div>
          </div>
        )}

        <div style={{ marginBottom: "24px" }}>
          <mdui-linear-progress value={progress} max={totalMails}></mdui-linear-progress>
          <p style={{ marginTop: "8px", fontWeight: "bold" }}>
            Fortschritt: {progress} von {totalMails} E-Mails verarbeitet
          </p>
        </div>

        {/* Live Log Terminal */}
        <div 
          style={{ 
            backgroundColor: "#1e1e1e", 
            color: "#d4d4d4", 
            padding: "16px", 
            borderRadius: "8px",
            height: "300px",
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}
        >
          {logs.map((log, index) => (
            <div key={index} style={{ 
              color: log.type === 'error' ? '#f48771' : log.type === 'success' ? '#89d185' : '#569cd6'
            }}>
              {log.message}
            </div>
          ))}
          {/* Ein unsichtbares Element am Ende, falls du später Auto-Scroll einbauen willst */}
          <div id="log-end" />
        </div>

        {!sending && (
          <mdui-button 
            style={{ marginTop: "24px" }} 
            onClick={() => {
              setStep("select");
              setLogs([]);
              setSelectedStudents(new Set());
            }}
          >
            Zurück zur Auswahl
          </mdui-button>
        )}
      </div>
    );
  }
}

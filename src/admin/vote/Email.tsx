import {
  collection,
  getDocs,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import React from "react";
import { useLoaderData, useParams } from "react-router-dom";
import { db, auth, appCheck } from "../../firebase";
import { Helmet } from "react-helmet";
import { snackbar } from "mdui";
import { getToken } from "firebase/app-check";

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

interface StudentData extends DocumentData {
  name: string;
  listIndex: string;
  email?: string;
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

interface SmtpConfig {
  server: string;
  port: number;
  username: string;
  from_address?: string;
  password: string;
}

const EMAIL_TEMPLATES = {
  announcement: {
    subject: "Neue Wahl verfügbar: {{vote_title}}",
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
            <a href="https://waldorfwahlen.web.app/v/{{vote_id}}?name={{student_name_encoded}}&grade={{student_grade}}&listIndex={{student_list_index}}" class="button">Zur Wahl</a>
        </p>
        <p><strong>Direktlink (mit vorausgefüllten Daten):</strong></p>
        <p class="link-box">https://waldorfwahlen.web.app/v/{{vote_id}}?name={{student_name_encoded}}&grade={{student_grade}}&listIndex={{student_list_index}}</p>
        <p class="footer">Mit freundlichen Grüßen!</p>
    </div>
</body>
</html>`,
  },
  reminder: {
    subject: "Erinnerung: {{vote_title}} - Bitte stimmen Sie ab",
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
            <a href="https://waldorfwahlen.web.app/v/{{vote_id}}?name={{student_name_encoded}}&grade={{student_grade}}&listIndex={{student_list_index}}" class="button">Jetzt abstimmen</a>
        </p>
        <p>Falls Sie diese E-Mail unerwartet erhalten haben, ignorieren Sie diese Nachricht einfach.</p>
        <p><strong>Direktlink (mit vorausgefüllten Daten):</strong></p>
        <p class="link-box">https://waldorfwahlen.web.app/v/{{vote_id}}?name={{student_name_encoded}}&grade={{student_grade}}&listIndex={{student_list_index}}</p>
        <p class="footer">Mit freundlichen Grüßen!</p>
    </div>
</body>
</html>`,
  },
  results: {
    subject: "Ergebnisse der Wahl: {{vote_title}}",
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
            <a href="https://waldorfwahlen.web.app/r/{{vote_id}}?id={{choice_id}}" class="button">Ergebnisse ansehen</a>
        </p>
        
        <p><strong>Direktlink (mit Identifikation):</strong></p>
        <p class="link-box">https://waldorfwahlen.web.app/r/{{vote_id}}?id={{choice_id}}</p>
        
        <p class="footer">Mit freundlichen Grüßen!</p>
    </div>
</body>
</html>`,
  },
};

export default function Email() {
  const { vote, choices, options, results } = useLoaderData() as LoaderData;
  const { id } = useParams<{ id: string }>();

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

  // Email sending state
  const [selectedTemplate, setSelectedTemplate] = React.useState<
    "announcement" | "reminder" | "results"
  >("announcement");
  const [customSubject, setCustomSubject] = React.useState<string>("");
  const [customBody, setCustomBody] = React.useState<string>("");
  const [smtpConfig, setSmtpConfig] = React.useState<SmtpConfig>(() => {
    const saved = localStorage.getItem("waldorfwahlen-smtp-config");
    return saved
      ? JSON.parse(saved)
      : {
          server: "smtp.gmail.com",
          port: 587,
          username: "",
          from_address: "",
          password: "",
        };
  });
  const [sending, setSending] = React.useState<boolean>(false);
  const [showSmtpSettings, setShowSmtpSettings] =
    React.useState<boolean>(false);

  React.useEffect(() => {
    async function loadClasses() {
      try {
        const classSnapshot = await getDocs(collection(db, "class"));
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

    loadClasses();
  }, []);

  React.useEffect(() => {
    // Save SMTP config to localStorage whenever it changes
    localStorage.setItem(
      "waldorfwahlen-smtp-config",
      JSON.stringify(smtpConfig)
    );
  }, [smtpConfig]);

  React.useEffect(() => {
    // Set first available class as active tab
    if (classes.length > 0 && activeTab === "class") {
      setActiveTab(`class-${classes[0].grade}`);
    }
  }, [classes, activeTab]);

  React.useEffect(() => {
    // Load template when selected
    const template = EMAIL_TEMPLATES[selectedTemplate];
    setCustomSubject(template.subject);
    setCustomBody(template.body);
  }, [selectedTemplate]);

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
    const participantListIndexes = new Set(
      choices.map((choice) => choice.listIndex)
    );
    const newSelected = new Set<string>();

    classes.forEach((cls) => {
      cls.students.forEach((student) => {
        if (student.email && participantListIndexes.has(student.listIndex)) {
          newSelected.add(`${cls.id}-${student.listIndex}`);
        }
      });
    });

    setSelectedStudents(newSelected);
  };

  const selectAllNonVoters = () => {
    const participantListIndexes = new Set(
      choices.map((choice) => choice.listIndex)
    );
    const newSelected = new Set<string>();

    classes.forEach((cls) => {
      cls.students.forEach((student) => {
        if (student.email && !participantListIndexes.has(student.listIndex)) {
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
    const emailList = getEmailList();

    if (!emailList.trim()) {
      snackbar({ message: "Keine E-Mail-Adressen verfügbar" });
      return;
    }

    if (!smtpConfig.username || !smtpConfig.password) {
      snackbar({ message: "SMTP-Konfiguration unvollständig" });
      return;
    }

    setSending(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Nicht angemeldet");
      }

      const token = await user.getIdToken();
      const emails = emailList.split(", ").filter((email) => email.trim());
      const selectedData = getSelectedStudentsData();

      // All emails are now personalized
      for (const email of emails) {
        const student = selectedData.find((s) => s.email === email);

        if (student) {
          let personalVariables: Record<string, string> = {
            ...getTemplateVariables(),
            student_name: student.name,
            student_name_encoded: encodeURIComponent(student.name),
            student_grade: student.grade.toString(),
            student_list_index: student.listIndex,
          };

          // Add result-specific variables for results emails
          if (selectedTemplate === "results" && results) {
            const choice = choices.find(
              (c) =>
                c.listIndex == student.listIndex && c.grade == student.grade
            );

            const studentResult = choice
              ? results.find((r) => r.id == choice.id)
              : null;
            const assignedOption = studentResult
              ? options.find((o) => o.id == studentResult.result)
              : null;

            // DEBUG
            console.log(
              `Processing result for student ${student.name} (${student.listIndex})`
            );
            console.log(choice, studentResult, assignedOption);

            personalVariables = {
              ...personalVariables,
              choice_id: choice?.id || "",
              assigned_option: assignedOption?.title || "Nicht zugewiesen",
              assigned_details: assignedOption
                ? `<p><strong>Lehrer:</strong> ${
                    assignedOption.teacher || "N/A"
                  }</p><p><strong>Beschreibung:</strong> ${
                    assignedOption.description || "Keine Beschreibung verfügbar"
                  }</p>`
                : "",
            };
          }

          console.log(
            `Sending email to ${email} with variables:`,
            personalVariables
          );

          const response = await fetch(
            `https://api.chatwithsteiner.de/waldorfwahlen/send`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Firebase-AppCheck": await getToken(appCheck).then(
                  (res) => res.token
                ),
              },
              body: JSON.stringify({
                token,
                uid: user.uid,
                emails: [email],
                subject: customSubject,
                body: customBody,
                variables: personalVariables,
                smtp_config: smtpConfig,
              }),
            }
          );

          setProgress((prev) => prev + 1);

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Email sending failed");
          }
        }
      }

      snackbar({
        message: `E-Mails erfolgreich an ${emails.length} Empfänger gesendet!`,
      });
      setProgress(0);
      setStep("select");
      setSelectedStudents(new Set());
    } catch (error) {
      console.error("Error sending emails:", error);
      snackbar({
        message: `Fehler beim Senden: ${
          error instanceof Error ? error.message : "Unbekannter Fehler"
        }`,
      });
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

  if (showSmtpSettings) {
    return (
      <mdui-dialog open fullscreen>
        <h1>SMTP-Einstellungen </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <mdui-icon name="warning" style={{ marginBottom: "0" }}></mdui-icon>
          <h2 style={{ marginBottom: "0", marginTop: "0" }}>
            Wichtiger Hinweis
          </h2>
        </div>
        <ul>
          <li>Verwenden Sie keinen privaten E-Mail-Account</li>
          <li>Zugangsdaten werden lokal im Browser gespeichert</li>
          <li>Und sind dadurch möglicherweise für Dritte einsehbar</li>
          <li>Für Massen-E-Mails geeigneten SMTP-Server nutzen</li>
        </ul>
        <p>
          Für einen vorkonfigurierten SMTP-Server nutzen Sie den Account
          "waldorfwahlen@praktikum.click". Die Zugangsdaten finden Sie in der{" "}
          <a href="/admin/help">Hilfe</a> unter dem Abschnitt "E-Mails".
        </p>

        <mdui-text-field
          label="SMTP-Server"
          placeholder="z.B. smtp.gmail.com"
          value={smtpConfig.server}
          onInput={(e) =>
            setSmtpConfig({
              ...smtpConfig,
              server: (e.target as HTMLInputElement).value,
            })
          }
          required
        ></mdui-text-field>

        <p />

        <mdui-text-field
          label="Port"
          placeholder="Standard: 587 (TLS) oder 465 (SSL)"
          type="number"
          value={smtpConfig.port?.toString() || "587"}
          onInput={(e) =>
            setSmtpConfig({
              ...smtpConfig,
              port: parseInt((e.target as HTMLInputElement).value, 10),
            })
          }
          required
        ></mdui-text-field>

        <p />

        <mdui-text-field
          label="Benutzername"
          placeholder="E-Mail-Adresse oder SMTP-Benutzername"
          value={smtpConfig.username}
          onInput={(e) =>
            setSmtpConfig({
              ...smtpConfig,
              username: (e.target as HTMLInputElement).value,
            })
          }
          required
        ></mdui-text-field>

        <p />

        <mdui-text-field
          label="Absender-E-Mail"
          placeholder="E-Mail-Adresse des Absenders"
          value={smtpConfig.from_address || ""}
          onInput={(e) =>
            setSmtpConfig({
              ...smtpConfig,
              from_address: (e.target as HTMLInputElement).value,
            })
          }
          required
        ></mdui-text-field>

        <p />

        <mdui-text-field
          label="Passwort"
          placeholder="SMTP-Passwort"
          type="password"
          value={smtpConfig.password}
          onInput={(e) =>
            setSmtpConfig({
              ...smtpConfig,
              password: (e.target as HTMLInputElement).value,
            })
          }
          required
        ></mdui-text-field>

        <p />
        <br />

        <mdui-button
          variant="filled"
          onClick={() => setShowSmtpSettings(false)}
          slot="action"
        >
          Schließen
        </mdui-button>
      </mdui-dialog>
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
          <mdui-button
            variant="filled"
            icon="settings"
            onClick={() => setShowSmtpSettings(true)}
          >
            SMTP-Einstellungen
          </mdui-button>
        </div>

        {/* Selection Actions */}
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

        <mdui-divider style={{ marginBottom: "16px" }} />

        {/* Class Tabs */}
        <mdui-tabs value={activeTab}>
          {classes
            .sort((a, b) => a.grade - b.grade)
            .map((cls) => {
              const studentsWithEmail = cls.students.filter((s) => s.email);
              const selectedInClass = cls.students.filter((s) =>
                selectedStudents.has(`${cls.id}-${s.listIndex}`)
              ).length;
              const participantCount = cls.students.filter((s) =>
                choices.some((c) => c.listIndex === s.listIndex)
              ).length;

              return (
                <mdui-tab
                  key={cls.id}
                  value={`class-${cls.grade}`}
                  onClick={() => setActiveTab(`class-${cls.grade}`)}
                >
                  Klasse {cls.grade}
                  {selectedInClass > 0 && ` (${selectedInClass})`}
                </mdui-tab>
              );
            })}

          {/* Class Content */}
          {classes.map((cls) => {
            const studentsWithEmail = cls.students.filter((s) => s.email);
            const participantListIndexes = new Set(
              choices.map((c) => c.listIndex)
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
                      <mdui-button
                        variant="outlined"
                        onClick={() => selectAllInClass(cls.id!)}
                      >
                        Alle auswählen
                      </mdui-button>
                      <mdui-button
                        variant="outlined"
                        onClick={() => deselectAllInClass(cls.id!)}
                      >
                        Alle abwählen
                      </mdui-button>
                    </div>
                  </div>

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
                          student.listIndex
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
        <Helmet>
          <title>E-Mail senden - {vote.title}</title>
        </Helmet>
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
        {/* Send Action */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {!smtpConfig.username || !smtpConfig.password ? (
            <mdui-fab
              icon="settings"
              style={{
                position: "fixed",
                right: "20px",
                bottom: "20px",
              }}
              extended
              onClick={() => setShowSmtpSettings(true)}
            >
              SMTP-Einstellungen
            </mdui-fab>
          ) : (
            <mdui-fab
              icon="send"
              style={{
                position: "fixed",
                right: "20px",
                bottom: "20px",
              }}
              extended
              onClick={sendEmails}
              disabled={
                sending ||
                !smtpConfig.username ||
                !smtpConfig.password ||
                !emailList
              }
            >
              Senden
            </mdui-fab>
          )}
        </div>
      </div>
    );
  }

  if (step === "sending") {
    const emailCount = getEmailList()
      .split(", ")
      .filter((email) => email.trim()).length;
    return (
      <div className="mdui-prose">
        <h2>E-Mails werden gesendet...</h2>
        <mdui-linear-progress
          value={progress}
          max={emailCount}
        ></mdui-linear-progress>
        <p>
          Bitte warten Sie, während die E-Mails gesendet werden. ({progress} /{" "}
          {emailCount})
        </p>
      </div>
    );
  }
}

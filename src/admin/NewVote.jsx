import { addDoc, collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { alert, confirm, prompt, snackbar } from "mdui";
import moment from "moment-timezone";
import React from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { generateRandomHash } from "./utils";
import { Helmet } from "react-helmet";
import * as XLSX from "xlsx";

// Component to handle individual propose field with proper switch ref handling
function ProposeFieldCard({
  field,
  index,
  editProposeField,
  removeProposeField,
}) {
  const switchRef = React.useRef(null);

  React.useEffect(() => {
    if (switchRef.current) {
      // Set initial checked state
      switchRef.current.checked = field.required;

      const handleToggle = () => {
        editProposeField(index, { required: switchRef.current.checked });
      };

      switchRef.current.addEventListener("change", handleToggle);

      // Cleanup
      return () => {
        if (switchRef.current) {
          switchRef.current.removeEventListener("change", handleToggle);
        }
      };
    }
  }, [field.required, index, editProposeField]);

  return (
    <div
      style={{
        border: "1px solid var(--mdui-color-outline)",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
      }}
    >
      <div className="fields-row">
        <mdui-text-field
          label="Feld-Label"
          value={field.label}
          onInput={(e) => editProposeField(index, { label: e.target.value })}
          placeholder="z.B. Telefonnummer"
        />
        <mdui-select
          label="Feldtyp"
          value={field.type}
          onChange={(e) => editProposeField(index, { type: e.target.value })}
        >
          <mdui-menu-item value="text">Text (kurz)</mdui-menu-item>
          <mdui-menu-item value="textarea">Text (lang)</mdui-menu-item>
          <mdui-menu-item value="number">Zahl</mdui-menu-item>
          <mdui-menu-item value="email">E-Mail</mdui-menu-item>
          <mdui-menu-item value="tel">Telefon</mdui-menu-item>
        </mdui-select>
      </div>

      <div className="fields-row">
        <mdui-text-field
          label="Platzhalter"
          value={field.placeholder}
          onInput={(e) =>
            editProposeField(index, { placeholder: e.target.value })
          }
          placeholder={
            field.type === "email"
              ? "beispiel@mail.com"
              : field.type === "tel"
              ? "+49 123 456789"
              : field.type === "number"
              ? "42"
              : field.type === "textarea"
              ? "Längerer Text..."
              : "Kurzer Text"
          }
        />
        <mdui-text-field
          label="Max. Länge"
          type="number"
          value={field.maxLength}
          onInput={(e) =>
            editProposeField(index, {
              maxLength:
                parseInt(e.target.value) ||
                (field.type === "textarea" ? 500 : 50),
            })
          }
          min={1}
          max={field.type === "textarea" ? 2000 : 500}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <mdui-switch ref={switchRef} checked={field.required}></mdui-switch>
          <span>Pflichtfeld</span>
        </div>
        <mdui-button-icon
          icon="delete"
          onClick={() => removeProposeField(index)}
          style={{ color: "var(--mdui-color-error)" }}
        />
      </div>
    </div>
  );
}

export default function NewVote() {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectCount, setSelectCount] = React.useState(3);
  const [startTime, setStartTime] = React.useState();
  const [endTime, setEndTime] = React.useState();

  const [extraFields, setExtraFields] = React.useState([]);

  const [options, setOptions] = React.useState([]);

  const [proposals, setProposals] = React.useState(false);

  const [id, setId] = React.useState(generateRandomHash());

  // Form fields for new option
  const [name, setName] = React.useState("");
  const [max, setMax] = React.useState("");
  const [teacher, setTeacher] = React.useState("");
  const [optionDescription, setOptionDescription] = React.useState("");

  // Custom proposal fields
  const [proposeFields, setProposeFields] = React.useState([]);

  // Custom dialog texts for proposal page
  const [proposeTexts, setProposeTexts] = React.useState({
    welcomeHeadline: "Vorschlag einreichen",
    welcomeDescription:
      "Sie sind dabei, einen Vorschlag für ein Projekt einzureichen. Vielen Dank! Das erleichtert den Administratoren die Übersicht über die Daten und stellt sicher, dass alles so ist, wie es sein soll. Bitte stellen Sie sicher, dass Sie die Felder so ausfüllen, wie sie am Ende aussehen sollen. Unten sehen Sie eine Vorschau Ihres Projekts. Die Zeichenlimits sind layoutbedingt und können nicht überschritten werden.",
    hintHeadline: "Hinweis",
    hintDescription:
      "Der Titel sollte kurz und prägnant sein. Die Beschreibung sollte das Projekt gut umreißen und eventuelle Beschränkungen erwähnen. Tragen Sie die maximale Anzahl an SchülerInnen so ein, wie es bei der Anmeldung abgesprochen wurde. Alle Vorschläge werden manuell von den Administratoren geprüft und freigeschaltet.",
  });

  const navigate = useNavigate();

  // Excel import functionality
  function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });

          // Parse vote configuration from "Config" sheet
          let voteConfig = {};
          let optionsData = [];
          let proposeFieldsData = [];
          let proposeTextsData = {};

          // Parse Config sheet
          if (workbook.SheetNames.includes("Config")) {
            const configSheet = workbook.Sheets["Config"];
            const configData = XLSX.utils.sheet_to_json(configSheet, {
              header: 1,
            });

            configData.forEach((row) => {
              if (row[0] && row[1] !== undefined) {
                const key = row[0].toString().toLowerCase();
                const value = row[1];

                switch (key) {
                  case "title":
                  case "titel":
                    voteConfig.title = value;
                    break;
                  case "description":
                  case "beschreibung":
                    voteConfig.description = value;
                    break;
                  case "selectcount":
                  case "anzahl wahlen":
                    voteConfig.selectCount = parseInt(value) || 3;
                    break;
                  case "starttime":
                  case "startzeit":
                    voteConfig.startTime = value;
                    break;
                  case "endtime":
                  case "endzeit":
                    voteConfig.endTime = value;
                    break;
                  case "proposals":
                  case "vorschläge":
                    voteConfig.proposals =
                      value === true ||
                      value === "true" ||
                      value === 1 ||
                      value === "1";
                    break;
                }
              }
            });
          }

          // Parse Options sheet (for manual options)
          if (
            workbook.SheetNames.includes("Options") ||
            workbook.SheetNames.includes("Optionen")
          ) {
            const optionsSheetName = workbook.SheetNames.includes("Options")
              ? "Options"
              : "Optionen";
            const optionsSheet = workbook.Sheets[optionsSheetName];
            const optionsRaw = XLSX.utils.sheet_to_json(optionsSheet);

            optionsData = optionsRaw
              .map((row) => ({
                title: row.Title || row.Titel || row.title || "",
                teacher: row.Teacher || row.Lehrer || row.teacher || "",
                description:
                  row.Description || row.Beschreibung || row.description || "",
                max:
                  parseInt(
                    row.Max ||
                      row.max ||
                      row["Max Students"] ||
                      row["Max SchülerInnen"]
                  ) || 1,
              }))
              .filter((option) => option.title);
          }

          // Parse ProposeFields sheet (for proposal fields configuration)
          if (
            workbook.SheetNames.includes("ProposeFields") ||
            workbook.SheetNames.includes("Vorschlagsfelder")
          ) {
            const fieldsSheetName = workbook.SheetNames.includes(
              "ProposeFields"
            )
              ? "ProposeFields"
              : "Vorschlagsfelder";
            const fieldsSheet = workbook.Sheets[fieldsSheetName];
            const fieldsRaw = XLSX.utils.sheet_to_json(fieldsSheet);

            proposeFieldsData = fieldsRaw
              .map((row) => ({
                id: generateRandomHash(10),
                label: row.Label || row.label || "",
                type: row.Type || row.Typ || row.type || "text",
                required:
                  row.Required === true ||
                  row.Required === "true" ||
                  row.Required === 1 ||
                  row.Pflicht === true ||
                  row.Pflicht === "true" ||
                  row.Pflicht === 1 ||
                  false,
                maxLength:
                  parseInt(
                    row.MaxLength ||
                      row["Max Length"] ||
                      row.MaxLänge ||
                      row["Max Länge"]
                  ) ||
                  (row.Type === "textarea" || row.Typ === "textarea"
                    ? 500
                    : 50),
                placeholder: row.Placeholder || row.placeholder || "",
              }))
              .filter((field) => field.label);
          }

          // Parse ProposeTexts sheet (for proposal dialog texts)
          if (
            workbook.SheetNames.includes("ProposeTexts") ||
            workbook.SheetNames.includes("Vorschlagstexte")
          ) {
            const textsSheetName = workbook.SheetNames.includes("ProposeTexts")
              ? "ProposeTexts"
              : "Vorschlagstexte";
            const textsSheet = workbook.Sheets[textsSheetName];
            const textsData = XLSX.utils.sheet_to_json(textsSheet, {
              header: 1,
            });

            textsData.forEach((row) => {
              if (row[0] && row[1] !== undefined) {
                const key = row[0].toString().toLowerCase();
                const value = row[1];

                switch (key) {
                  case "welcomeheadline":
                  case "willkommen überschrift":
                  case "willkommen-überschrift":
                    proposeTextsData.welcomeHeadline = value;
                    break;
                  case "welcomedescription":
                  case "willkommen beschreibung":
                  case "willkommen-beschreibung":
                    proposeTextsData.welcomeDescription = value;
                    break;
                  case "hintheadline":
                  case "hinweis überschrift":
                  case "hinweis-überschrift":
                    proposeTextsData.hintHeadline = value;
                    break;
                  case "hintdescription":
                  case "hinweis beschreibung":
                  case "hinweis-beschreibung":
                    proposeTextsData.hintDescription = value;
                    break;
                }
              }
            });
          }

          resolve({
            config: voteConfig,
            options: optionsData,
            proposeFields: proposeFieldsData,
            proposeTexts: proposeTextsData,
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const importedData = await parseExcelFile(file);

      // Show confirmation dialog with import preview
      const previewText = `
Titel: ${importedData.config.title || "Nicht angegeben"}
Beschreibung: ${importedData.config.description || "Nicht angegeben"}
Anzahl Wahlen: ${importedData.config.selectCount || 3}
Optionen: ${importedData.options.length}
Vorschlagsfelder: ${importedData.proposeFields.length}
Vorschlagstexte: ${
        Object.keys(importedData.proposeTexts).length > 0
          ? "Angepasst"
          : "Standard"
      }
Vorschläge aktiviert: ${importedData.config.proposals ? "Ja" : "Nein"}
      `.trim();

      confirm({
        icon: "upload_file",
        headline: "Excel-Import bestätigen",
        description: `Folgende Daten wurden aus der Excel-Datei gelesen:\n\n${previewText}\n\nMöchten Sie diese Daten importieren? Bestehende Eingaben werden überschrieben.`,
        confirmText: "Importieren",
        cancelText: "Abbrechen",
        onConfirm: () => {
          // Apply imported data
          if (importedData.config.title) setTitle(importedData.config.title);
          if (importedData.config.description)
            setDescription(importedData.config.description);
          if (importedData.config.selectCount)
            setSelectCount(importedData.config.selectCount);
          if (importedData.config.startTime) {
            const startMoment = moment(importedData.config.startTime);
            if (startMoment.isValid()) {
              setStartTime(
                startMoment.tz("Europe/Berlin").format("YYYY-MM-DDTHH:mm")
              );
            }
          }
          if (importedData.config.endTime) {
            const endMoment = moment(importedData.config.endTime);
            if (endMoment.isValid()) {
              setEndTime(
                endMoment.tz("Europe/Berlin").format("YYYY-MM-DDTHH:mm")
              );
            }
          }
          if (importedData.config.proposals !== undefined) {
            setProposals(importedData.config.proposals);
          }

          // Set options for manual mode
          if (importedData.options.length > 0) {
            setOptions(importedData.options);
          }

          // Set propose fields for proposal mode
          if (importedData.proposeFields.length > 0) {
            setProposeFields(importedData.proposeFields);
          }

          // Set propose texts if provided
          if (Object.keys(importedData.proposeTexts).length > 0) {
            setProposeTexts({ ...proposeTexts, ...importedData.proposeTexts });
          }

          snackbar({
            message: "Excel-Daten erfolgreich importiert.",
            timeout: 5000,
          });
        },
      });
    } catch (error) {
      console.error("Excel import error:", error);
      alert({
        icon: "error",
        headline: "Import-Fehler",
        description:
          "Fehler beim Importieren der Excel-Datei. Bitte überprüfen Sie das Format der Datei.",
        confirmText: "OK",
      });
    }

    // Reset file input
    event.target.value = "";
  }

  function downloadCurrentConfiguration() {
    const wb = XLSX.utils.book_new();

    // Instructions sheet
    const instructionsData = [
      ["WaldorfWahlen - Konfiguration"],
      [""],
      ["Dies ist eine Konfigurationsdatei für Ihre aktuelle Wahl."],
      ["Sie können diese Datei bearbeiten und wieder importieren."],
      [""],
      ["WICHTIGE HINWEISE:"],
      ["- Bearbeiten Sie nur die Werte in der 'Wert'-Spalte"],
      ["- Löschen Sie keine Zeilen oder Spalten"],
      ["- Verwenden Sie für Datum/Zeit das Format: YYYY-MM-DDTHH:mm"],
      ["- Für Ja/Nein-Werte verwenden Sie: true/false"],
      [""],
      ["ARBEITSBLÄTTER:"],
      ["- Config: Grundeinstellungen der Wahl"],
      ["- Optionen: Verfügbare Projekte (nur bei manuellem Modus)"],
      ["- Vorschlagsfelder: Zusätzliche Felder für Vorschläge"],
      ["- Vorschlagstexte: Angepasste Texte für Dialoge"],
      [""],
      [
        "Nach dem Bearbeiten können Sie die Datei über 'Excel importieren' wieder einlesen.",
      ],
    ];
    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, instructionsWs, "Anleitung");

    // Config sheet with current values
    const configData = [
      ["Eigenschaft", "Wert", "Beschreibung"],
      ["Titel", title || "", "Titel der Wahl"],
      ["Beschreibung", description || "", "Optionale Beschreibung"],
      ["Anzahl Wahlen", selectCount || 3, "Anzahl der Wahlmöglichkeiten"],
      ["Startzeit", startTime || "", "Startzeit im Format YYYY-MM-DDTHH:mm"],
      ["Endzeit", endTime || "", "Endzeit im Format YYYY-MM-DDTHH:mm"],
      [
        "Vorschläge",
        proposals,
        "true für Vorschlagsmodus, false für manuelle Optionen",
      ],
    ];
    const configWs = XLSX.utils.aoa_to_sheet(configData);
    XLSX.utils.book_append_sheet(wb, configWs, "Config");

    // Options sheet with current options
    if (!proposals && options.length > 0) {
      const optionsData = [
        ["Titel", "Lehrer", "Beschreibung", "Max SchülerInnen"],
        ...options.map((option) => [
          option.title || "",
          option.teacher || "",
          option.description || "",
          option.max || 1,
        ]),
      ];
      const optionsWs = XLSX.utils.aoa_to_sheet(optionsData);
      XLSX.utils.book_append_sheet(wb, optionsWs, "Optionen");
    }

    // ProposeFields sheet with current fields
    if (proposals && proposeFields.length > 0) {
      const fieldsData = [
        ["Label", "Typ", "Pflicht", "Max Länge", "Placeholder"],
        ...proposeFields.map((field) => [
          field.label || "",
          field.type || "text",
          field.required || false,
          field.maxLength || 50,
          field.placeholder || "",
        ]),
      ];
      const fieldsWs = XLSX.utils.aoa_to_sheet(fieldsData);
      XLSX.utils.book_append_sheet(wb, fieldsWs, "Vorschlagsfelder");
    }

    // ProposeTexts sheet with current texts
    if (proposals) {
      const textsData = [
        ["Eigenschaft", "Wert", "Beschreibung"],
        [
          "Willkommen Überschrift",
          proposeTexts.welcomeHeadline || "",
          "Überschrift des Willkommen-Dialogs",
        ],
        [
          "Willkommen Beschreibung",
          proposeTexts.welcomeDescription || "",
          "Beschreibung des Willkommen-Dialogs",
        ],
        [
          "Hinweis Überschrift",
          proposeTexts.hintHeadline || "",
          "Überschrift des Hinweis-Dialogs",
        ],
        [
          "Hinweis Beschreibung",
          proposeTexts.hintDescription || "",
          "Beschreibung des Hinweis-Dialogs",
        ],
      ];
      const textsWs = XLSX.utils.aoa_to_sheet(textsData);
      XLSX.utils.book_append_sheet(wb, textsWs, "Vorschlagstexte");
    }

    // Save current configuration
    const filename = title
      ? `WaldorfWahlen_${title.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`
      : `WaldorfWahlen_Konfiguration.xlsx`;
    XLSX.writeFile(wb, filename);

    snackbar({
      message: "Aktuelle Konfiguration heruntergeladen.",
      timeout: 5000,
    });
  }

  function generateExcelTemplate() {
    const wb = XLSX.utils.book_new();

    // Instructions sheet as first sheet
    const instructionsData = [
      ["WaldorfWahlen - Excel-Import Vorlage"],
      [""],
      ["WILLKOMMEN! Diese Vorlage hilft Ihnen beim Erstellen einer Wahl."],
      [""],
      ["WIE FUNKTIONIERT ES?"],
      ["1. Füllen Sie die Arbeitsblätter (Tabs unten) mit Ihren Daten aus"],
      ["2. Speichern Sie die Datei"],
      ["3. Gehen Sie zu WaldorfWahlen > Neue Wahl > Excel importieren"],
      ["4. Wählen Sie diese Datei aus"],
      [""],
      ["ARBEITSBLÄTTER ERKLÄRT:"],
      [""],
      ["📋 CONFIG (PFLICHT)"],
      ["Grundeinstellungen Ihrer Wahl wie Titel, Zeitraum, etc."],
      [""],
      ["📚 OPTIONEN (für manuellen Modus)"],
      [
        "Tragen Sie hier Ihre Projekte ein, wenn Sie sie manuell verwalten möchten.",
      ],
      ["Lassen Sie das Blatt leer, wenn Sie den Vorschlagsmodus verwenden."],
      [""],
      ["📝 VORSCHLAGSFELDER (für Vorschlagsmodus)"],
      [
        "Zusätzliche Felder, die beim Einreichen von Vorschlägen ausgefüllt werden.",
      ],
      ["Nur relevant, wenn Sie 'Vorschläge' in Config auf 'true' setzen."],
      [""],
      ["💬 VORSCHLAGSTEXTE (für Vorschlagsmodus)"],
      ["Anpassung der Texte in den Dialogen der Vorschlagsseite."],
      ["Optional - kann leer bleiben für Standardtexte."],
      [""],
      ["WICHTIGE TIPPS:"],
      ["• Datum/Zeit Format: YYYY-MM-DDTHH:mm (z.B. 2024-07-01T08:00)"],
      ["• Ja/Nein-Werte: true oder false schreiben"],
      ["• Pflichtfelder in Config: Titel, Anzahl Wahlen, Start-/Endzeit"],
      ["• Bei Problemen: Laden Sie eine neue Vorlage herunter"],
      [""],
      ["Viel Erfolg mit Ihrer Wahl! 🎯"],
    ];
    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, instructionsWs, "📖 Anleitung");

    // Config sheet
    const configData = [
      ["Eigenschaft", "Wert", "Beschreibung"],
      ["Titel", "Schülerprojektwoche 2024", "Titel der Wahl"],
      [
        "Beschreibung",
        "Beschreibung der Projektwoche...",
        "Optionale Beschreibung",
      ],
      [
        "Anzahl Wahlen",
        3,
        "Anzahl der Wahlmöglichkeiten (1. Wahl, 2. Wahl, etc.)",
      ],
      ["Startzeit", "2024-07-01T08:00", "Startzeit im Format YYYY-MM-DDTHH:mm"],
      ["Endzeit", "2024-07-15T18:00", "Endzeit im Format YYYY-MM-DDTHH:mm"],
      [
        "Vorschläge",
        false,
        "true für Vorschlagsmodus, false für manuelle Optionen",
      ],
    ];
    const configWs = XLSX.utils.aoa_to_sheet(configData);
    XLSX.utils.book_append_sheet(wb, configWs, "Config");

    // Options sheet (for manual options)
    const optionsData = [
      ["Titel", "Lehrer", "Beschreibung", "Max SchülerInnen"],
      [
        "Programmieren: KI",
        "Hr. Mustermann",
        "Was ist Programmieren? Was ist KI?",
        15,
      ],
      [
        "Kunst & Kreativität",
        "Fr. Schmidt",
        "Kreative Projekte mit verschiedenen Materialien",
        12,
      ],
      [
        "Sport & Bewegung",
        "Hr. Weber",
        "Verschiedene Sportarten ausprobieren",
        20,
      ],
    ];
    const optionsWs = XLSX.utils.aoa_to_sheet(optionsData);
    XLSX.utils.book_append_sheet(wb, optionsWs, "Optionen");

    // ProposeFields sheet (for proposal fields)
    const fieldsData = [
      ["Label", "Typ", "Pflicht", "Max Länge", "Placeholder"],
      ["Telefonnummer", "tel", true, 20, "+49 123 456789"],
      ["E-Mail", "email", true, 50, "beispiel@mail.com"],
      [
        "Besondere Hinweise",
        "textarea",
        false,
        200,
        "Weitere Informationen...",
      ],
    ];
    const fieldsWs = XLSX.utils.aoa_to_sheet(fieldsData);
    XLSX.utils.book_append_sheet(wb, fieldsWs, "Vorschlagsfelder");

    // ProposeTexts sheet (for proposal dialog texts)
    const textsData = [
      ["Eigenschaft", "Wert", "Beschreibung"],
      [
        "Willkommen Überschrift",
        "Vorschlag einreichen",
        "Überschrift des Willkommen-Dialogs",
      ],
      [
        "Willkommen Beschreibung",
        "Sie sind dabei, einen Vorschlag für ein Projekt einzureichen...",
        "Beschreibung des Willkommen-Dialogs",
      ],
      ["Hinweis Überschrift", "Hinweis", "Überschrift des Hinweis-Dialogs"],
      [
        "Hinweis Beschreibung",
        "Der Titel sollte kurz und prägnant sein...",
        "Beschreibung des Hinweis-Dialogs",
      ],
    ];
    const textsWs = XLSX.utils.aoa_to_sheet(textsData);
    XLSX.utils.book_append_sheet(wb, textsWs, "Vorschlagstexte");

    // Save template
    XLSX.writeFile(wb, "WaldorfWahlen_Template.xlsx");

    snackbar({
      message: "Excel-Vorlage heruntergeladen.",
      timeout: 5000,
    });
  }

  function addOption() {
    setOptions((options) => [
      ...options,
      {
        title: name,
        max: max,
        teacher: teacher,
        description: optionDescription,
      },
    ]);
    setName("");
    setTeacher("");
    setOptionDescription("");
    setMax("");
  }

  function editOption(index) {
    setName(options[index].title);
    setTeacher(options[index].teacher);
    setOptionDescription(options[index].description);
    setMax(options[index].max);
    setOptions((options) => options.filter((_, i) => i !== index));
  }

  async function publish() {
    const berlinStartTime = moment.tz(startTime, "Europe/Berlin").toDate();
    const berlinEndTime = moment.tz(endTime, "Europe/Berlin").toDate();

    try {
      await setDoc(doc(db, "/votes", id), {
        title: title,
        description: description,
        selectCount: selectCount,
        startTime: Timestamp.fromDate(berlinStartTime),
        endTime: Timestamp.fromDate(berlinEndTime),
        active: true,
        version: 3,
        extraFields: extraFields,
        proposals: proposals,
        proposeFields: proposals ? proposeFields : [],
        proposeTexts: proposals ? proposeTexts : {},
      });

      if (proposals) {
        confirm({
          headline: "Hinzufügen der Vorschläge",
          description:
            "Projektanbietende können unter dem Link Vorschläge eintragen: " +
            `https://waldorfwahlen.web.app/p/${id}`,
          confirmText: "Link kopieren",
          cancelText: "Zur Wahl",
          onConfirm: (e) => {
            navigator.clipboard.writeText(
              `https://waldorfwahlen.web.app/p/${id}`
            );
            snackbar({
              message: "Link in die Zwischenablage kopiert.",
              timeout: 5000,
            });
            navigate(`/admin/${id}`);
          },
        });
      }
      if (!proposals) {
        const option = options.map(async (e) => {
          return addDoc(collection(db, `/votes/${id}/options`), {
            title: e.title,
            max: e.max,
            teacher: e.teacher,
            description: e.description,
          });
        });

        await Promise.all(option);

        snackbar({
          message: "Wahl erfolgreich erstellt.",
          timeout: 5000,
        });

        navigate(`/admin/${id}`);
      }
    } catch (e) {
      console.error(e);
      snackbar({
        message: "Fehler beim Erstellen der Wahl.",
        timeout: 5000,
      });
    }
  }

  const submitDisabled = () => {
    if (
      !title ||
      !selectCount ||
      !startTime ||
      !endTime ||
      (options.length === 0 && !proposals)
    ) {
      return true;
    }

    return false;
  };

  const isChanged = () => {
    if (
      title ||
      description ||
      selectCount !== 3 ||
      startTime ||
      endTime ||
      extraFields.length > 0 ||
      options.length > 0 ||
      proposals ||
      proposeFields.length > 0
    ) {
      return true;
    }
    return false;
  };

  function addOptionDisabled() {
    return !name || !max;
  }

  function editExtraField(index, value) {
    const newValues = [...extraFields];
    newValues[index] = value;
    setExtraFields(newValues);
  }

  function removeExtraField(index) {
    setExtraFields((extraFields) => extraFields.filter((_, i) => i !== index));
  }

  function addProposeField() {
    setProposeFields([
      ...proposeFields,
      {
        id: generateRandomHash(10),
        label: "",
        type: "text",
        required: false,
        maxLength: 50,
        placeholder: "",
      },
    ]);
  }

  function editProposeField(index, field) {
    const newFields = [...proposeFields];
    const updatedField = { ...newFields[index], ...field };

    // Auto-adjust maxLength when type changes
    if (field.type && field.type !== newFields[index].type) {
      if (field.type === "textarea" && updatedField.maxLength <= 100) {
        updatedField.maxLength = 500;
      } else if (field.type !== "textarea" && updatedField.maxLength > 500) {
        updatedField.maxLength = 50;
      }
    }

    newFields[index] = updatedField;
    setProposeFields(newFields);
  }

  function removeProposeField(index) {
    setProposeFields(proposeFields.filter((_, i) => i !== index));
  }

  return (
    <div className="mdui-prose">
      <Helmet>
        <title>Neue Wahl - WaldorfWahlen</title>
      </Helmet>
      <h2>Neue Wahl</h2>
      <p />
      <mdui-card
        style={{
          position: "sticky",
          top: "0px",
          zIndex: "1000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "5px",
          borderRadius: "0px",
        }}
      >
        <div>
          Wahl {title ? `"${title}"` : "erstellen"} ({id}){" "}
        </div>
        <div>
          {isChanged() ? (
            <mdui-button-icon
              icon="replay"
              onClick={() => {
                confirm({
                  icon: "replay",
                  headline: "Änderungen verwerfen?",
                  description: "Möchten Sie die Änderungen verwerfen?",
                  confirmText: "Verwerfen",
                  cancelText: "Abbrechen",
                  onConfirm: () => {
                    setTitle("");
                    setDescription("");
                    setSelectCount(3);
                    setStartTime("");
                    setEndTime("");
                    setExtraFields([]);
                    setOptions([]);
                    setProposals(false);
                    setProposeFields([]);
                    setProposeTexts({
                      welcomeHeadline: "Vorschlag einreichen",
                      welcomeDescription:
                        "Sie sind dabei, einen Vorschlag für ein Projekt einzureichen. Vielen Dank! Das erleichtert den Administratoren die Übersicht über die Daten und stellt sicher, dass alles so ist, wie es sein soll. Bitte stellen Sie sicher, dass Sie die Felder so ausfüllen, wie sie am Ende aussehen sollen. Unten sehen Sie eine Vorschau Ihres Projekts. Die Zeichenlimits sind layoutbedingt und können nicht überschritten werden.",
                      hintHeadline: "Hinweis",
                      hintDescription:
                        "Der Titel sollte kurz und prägnant sein. Die Beschreibung sollte das Projekt gut umreißen und eventuelle Beschränkungen erwähnen. Tragen Sie die maximale Anzahl an SchülerInnen so ein, wie es bei der Anmeldung abgesprochen wurde. Alle Vorschläge werden manuell von den Administratoren geprüft und freigeschaltet.",
                    });
                    setName("");
                    setTeacher("");
                    setOptionDescription("");
                    setMax("");
                    setId(generateRandomHash());
                  },
                });
              }}
            ></mdui-button-icon>
          ) : (
            <mdui-button-icon disabled icon="replay"></mdui-button-icon>
          )}
          {isChanged() ? (
            <mdui-tooltip
              variant="rich"
              headline="Aktuelle Konfiguration herunterladen"
              content="Laden Sie die aktuelle Konfiguration als Excel-Datei herunter, um sie später zu bearbeiten oder als Backup zu verwenden."
            >
              <mdui-button-icon
                icon="download"
                onClick={downloadCurrentConfiguration}
              ></mdui-button-icon>
            </mdui-tooltip>
          ) : (
            <mdui-button-icon disabled icon="download"></mdui-button-icon>
          )}
          {submitDisabled() ? (
            <mdui-button disabled end-icon="send">
              Erstellen
            </mdui-button>
          ) : (
            <mdui-button onClick={publish} end-icon="send">
              Erstellen
            </mdui-button>
          )}
        </div>
      </mdui-card>

      <p />
      <mdui-text-field
        label="Titel"
        placeholder="Schülerprojektwoche 2024"
        required
        maxlength={25}
        counter
        value={title}
        onInput={(e) => setTitle(e.target.value)}
      />
      <mdui-text-field
        label="Beschreibung (optional)"
        placeholder="In der Schülerprojektwoche vom 12. bis 16. Juli 2024 werden von SchülerInnen organisierte Projekte angeboten. Die Projekte finden täglich von 10:00 bis 15:00 in den angegebenen Räumen statt."
        rows={3}
        maxlength={200}
        counter
        value={description}
        onInput={(e) => setDescription(e.target.value)}
      ></mdui-text-field>
      <div className="fields-row">
        <mdui-tooltip
          variant="rich"
          headline="Anzahl der Wahlen"
          content="Wählen Sie die Anzahl der Wahlen, die Ihre Schüler treffen müssen (1. Wahl, 2. Wahl etc.). Achtung: Die Automatische Zuordnung funktioniert nur mit 3 Wahlen."
        >
          <mdui-text-field
            class="number-input"
            label="Anzahl der Wahlen"
            type="number"
            placeholder="3"
            min={1}
            max={10}
            value={selectCount}
            onInput={(e) => setSelectCount(e.target.value)}
          ></mdui-text-field>
        </mdui-tooltip>

        <div className="fields-row">
          <mdui-text-field
            label="Startzeitpunkt"
            type="datetime-local"
            value={startTime}
            onInput={(e) =>
              setStartTime(
                moment
                  .tz(e.target.value, "Europe/Berlin")
                  .format("YYYY-MM-DDTHH:mm")
              )
            }
          ></mdui-text-field>

          <mdui-text-field
            label="Endzeitpunkt"
            type="datetime-local"
            value={endTime}
            onInput={(e) =>
              setEndTime(
                moment
                  .tz(e.target.value, "Europe/Berlin")
                  .format("YYYY-MM-DDTHH:mm")
              )
            }
          ></mdui-text-field>
        </div>
      </div>
      <p />
      {extraFields.map((e, i) => (
        <>
          <div className="fields-row">
            <mdui-text-field
              label={"Extrafeld #" + (i + 1)}
              placeholder={"Musikinstrument"}
              value={e}
              onInput={(e) => editExtraField(i, e.target.value)}
            >
              <mdui-button-icon
                slot="end-icon"
                icon="delete"
                onClick={() => removeExtraField(i)}
              />
            </mdui-text-field>
          </div>
          <p />
        </>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <mdui-tooltip
          variant="rich"
          headline="Extrafeld hinzufügen"
          content="Fügen Sie zusätzliche Felder hinzu, um weitere Informationen von Ihren Schülern zu erhalten."
        >
          <mdui-button
            icon="add"
            onClick={() => setExtraFields([...extraFields, ""])}
            variant="text"
          >
            Extrafeld hinzufügen
          </mdui-button>
        </mdui-tooltip>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelImport}
            style={{ display: "none" }}
            id="excel-import-input"
          />
          <mdui-tooltip
            variant="rich"
            headline="Excel-Import"
            content="Importieren Sie Wahldaten aus einer Excel-Datei. Laden Sie zuerst die Vorlage herunter."
          >
            <mdui-button
              icon="upload_file"
              variant="text"
              onClick={() =>
                document.getElementById("excel-import-input").click()
              }
            >
              Excel importieren
            </mdui-button>
          </mdui-tooltip>
          <mdui-tooltip
            variant="rich"
            headline="Excel-Vorlage herunterladen"
            content="Laden Sie eine Excel-Vorlage herunter, um das korrekte Format für den Import zu sehen."
          >
            <mdui-button
              icon="download"
              variant="text"
              onClick={generateExcelTemplate}
            >
              Vorlage
            </mdui-button>
          </mdui-tooltip>
          <mdui-button
            icon="settings"
            variant="text"
            end-icon="expand_more"
            onClick={() => {
              prompt({
                icon: "settings",
                headline: "ID der Wahl",
                description:
                  "Ändern Sie die ID der Wahl. Diese erscheint in der URL (waldorfwahlen.web.app/[ID]). Achten Sie darauf, dass die ID eindeutig ist und keine Sonderzeichen enthält.",
                inputType: "text",
                confirmText: "Schließen",
                cancelText: "",
                textFieldOptions: {
                  value: id,
                  onInput: (e) => setId(e.target.value),
                  placeholder: "spw24",
                  label: "ID",
                },
              });
            }}
          >
            Erweitert
          </mdui-button>
        </div>
      </div>

      <p />
      <mdui-divider></mdui-divider>
      <p />

      <div className="flex-gap">
        <mdui-card
          variant={proposals ? "outlined" : "filled"}
          style={{ width: "100%", padding: "20px" }}
          clickable
          onClick={() => setProposals(false)}
        >
          <div
            className="mdui-prose"
            style={{ width: "100%", userSelect: "none" }}
          >
            <div
              style={{
                display: "flex",
                textWrap: "nowrap",
                gap: "10px",
              }}
            >
              <h2>Optionen anlegen</h2>
              <mdui-icon name="add"></mdui-icon>
            </div>
            Legen Sie die Optionen manuell an.
          </div>
        </mdui-card>
        <mdui-card
          variant={proposals ? "filled" : "outlined"}
          style={{ width: "100%", padding: "20px" }}
          clickable
          onClick={() => setProposals(true)}
        >
          <div
            className="mdui-prose"
            style={{ width: "100%", userSelect: "none" }}
          >
            <div
              style={{
                display: "flex",
                textWrap: "nowrap",
                gap: "10px",
              }}
            >
              <h2>Link teilen</h2>
              <mdui-icon name="share"></mdui-icon>
            </div>
            Lassen Sie die Projektanbietenden ihre Vorschläge eintragen.
          </div>
        </mdui-card>
      </div>

      <p />
      {!proposals && (
        <div className="options-container">
          <div className="options-list">
            {options.length === 0 && (
              <mdui-card class="option-preview" disabled>
                <b>Keine Optionen</b>
                <div className="description">
                  Fügen Sie rechts eine neue Option hinzu.
                </div>
              </mdui-card>
            )}
            {options.map((e, i) => (
              <mdui-card
                key={i}
                class="option-preview"
                clickable
                style={{
                  cursor: "pointer",
                }}
                variant={"outlined"}
                onClick={() => {
                  editOption(i);
                }}
              >
                <b>{e.title}</b>
                <div className="teacher">{e.teacher}</div>
                <div className="description">{e.description}</div>
                <div className="max">max. {e.max} SchülerInnen</div>
              </mdui-card>
            ))}
          </div>
          <div className="new-option">
            <mdui-text-field
              label="Titel"
              placeholder="Programmieren: KI"
              maxlength={25}
              counter
              value={name}
              onInput={(e) => setName(e.target.value)}
            ></mdui-text-field>
            <mdui-text-field
              label="max. SchülerInnen"
              type="number"
              placeholder="15"
              min={1}
              value={max}
              onInput={(e) => setMax(e.target.value)}
            ></mdui-text-field>
            <p />
            <br />
            <mdui-text-field
              label="Lehrer (optional)"
              placeholder="Hr. Mustermann"
              maxlength={25}
              counter
              value={teacher}
              onInput={(e) => setTeacher(e.target.value)}
            ></mdui-text-field>
            <mdui-text-field
              label="Beschreibung (optional)"
              placeholder="Was ist Programmieren? Was ist KI? Diesen Themen wollen wir uns in dieser Projektwoche nähern."
              rows={3}
              maxlength={100}
              counter
              value={optionDescription}
              onInput={(e) => setOptionDescription(e.target.value)}
            ></mdui-text-field>
            {addOptionDisabled() ? (
              <mdui-button
                variant="tonal"
                icon="add"
                style={{ width: "100%" }}
                onClick={addOption}
                disabled
              >
                Hinzufügen
              </mdui-button>
            ) : (
              <mdui-button
                variant="tonal"
                icon="add"
                style={{ width: "100%" }}
                onClick={addOption}
              >
                Hinzufügen
              </mdui-button>
            )}
          </div>
        </div>
      )}

      {proposals && (
        <div>
          <mdui-card
            variant="filled"
            style={{ width: "100%", padding: "20px", marginBottom: "20px" }}
          >
            <div className="mdui-prose">
              <h3>Dialog-Texte anpassen</h3>
              <p>
                Passen Sie die Texte in den Dialogen auf der Vorschlagsseite an.
              </p>

              <mdui-text-field
                label="Willkommen-Überschrift"
                value={proposeTexts.welcomeHeadline}
                onInput={(e) =>
                  setProposeTexts({
                    ...proposeTexts,
                    welcomeHeadline: e.target.value,
                  })
                }
                maxlength={50}
                counter
              />
              <mdui-text-field
                label="Willkommen-Beschreibung"
                rows={3}
                value={proposeTexts.welcomeDescription}
                onInput={(e) =>
                  setProposeTexts({
                    ...proposeTexts,
                    welcomeDescription: e.target.value,
                  })
                }
                maxlength={500}
                counter
              />
              <mdui-text-field
                label="Hinweis-Überschrift"
                value={proposeTexts.hintHeadline}
                onInput={(e) =>
                  setProposeTexts({
                    ...proposeTexts,
                    hintHeadline: e.target.value,
                  })
                }
                maxlength={50}
                counter
              />
              <mdui-text-field
                label="Hinweis-Beschreibung"
                rows={3}
                value={proposeTexts.hintDescription}
                onInput={(e) =>
                  setProposeTexts({
                    ...proposeTexts,
                    hintDescription: e.target.value,
                  })
                }
                maxlength={500}
                counter
              />
            </div>
          </mdui-card>

          <mdui-card
            variant="filled"
            style={{ width: "100%", padding: "20px" }}
          >
            <div className="mdui-prose">
              <h3>Zusätzliche Felder für Vorschläge</h3>
              <p>
                Fügen Sie zusätzliche Felder hinzu, die beim Einreichen von
                Vorschlägen ausgefüllt werden sollen.
              </p>

              {proposeFields.map((field, index) => (
                <ProposeFieldCard
                  key={field.id}
                  field={field}
                  index={index}
                  editProposeField={editProposeField}
                  removeProposeField={removeProposeField}
                />
              ))}

              <mdui-button
                icon="add"
                variant="outlined"
                onClick={addProposeField}
                style={{ width: "100%" }}
              >
                Neues Feld hinzufügen
              </mdui-button>
            </div>
          </mdui-card>
        </div>
      )}
    </div>
  );
}

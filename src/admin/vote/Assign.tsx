import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { confirm, snackbar } from "mdui";
import React from "react";
import {
  LoaderFunctionArgs,
  useBlocker,
  useLoaderData,
  useNavigate,
} from "react-router-dom";
import { auth, db, functions } from "../../firebase";
import { httpsCallable } from "firebase/functions";
import { calculatePoints, type Rule } from "../../utils/assign";
import { VoteData, ChoiceData, OptionData, ResultData, LoaderData } from "./assign/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import Setup from "./assign/Setup";
import RulesDialog from "./assign/RulesDialog";
import Overview from "./assign/Overview";
import ProjectView from "./assign/ProjectView";
import StudentSearch from "./assign/StudentSearch";

function CheckboxWrapper({ checked, onChange, label }: { checked: boolean, onChange: (checked: boolean) => void, label: string }) {
  const ref = React.useRef<any>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: any) => {
      onChange(e.target.checked);
    };
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onChange]);

  return checked ? (
    <mdui-checkbox ref={ref} checked>{label}</mdui-checkbox>
  ) : (
    <mdui-checkbox ref={ref}>{label}</mdui-checkbox>
  );
}

export default function Assign() {
  const {
    vote,
    choices,
    options,
    results: cloudResults,
    classes,
  } = useLoaderData() as LoaderData;

  const [localChoices, setLocalChoices] = React.useState<ChoiceData[]>(choices);
  const [newChoices, setNewChoices] = React.useState<ChoiceData[]>([]);

  const [results, setResults] = React.useState<Record<string, string> | null>(
    null
  );
  const [stats, setStats] = React.useState<any>(null);
  const [projectMins, setProjectMins] = React.useState<Record<string, number>>({});
  const [projectOverbooks, setProjectOverbooks] = React.useState<Record<string, number>>({});
  const [showCancelledDialog, setShowCancelledDialog] = React.useState<boolean>(false);
  const [cancelledProjects, setCancelledProjects] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [mode, setMode] = React.useState<string>("overview");
  const [choicePoints, setChoicePoints] = React.useState<
    Record<string, number[]>
  >({});

  const [search, setSearch] = React.useState<string>("");

  const [rules, setRules] = React.useState<Rule[]>([
    {
      apply: "*",
      scores: [1, 2, 4],
    },
  ]);
  const [editRules, setEditRules] = React.useState<boolean>(false);

  function distributeLeadersAutomatically() {
    const displacedLeaders: {grade: number, listIndex: number, name: string}[] = [];
    cancelledProjects.forEach(pid => {
      const opt = options.find(o => o.id === pid);
      if (opt?.leaders) {
        opt.leaders.forEach(lId => {
          const [g, l] = lId.split("-");
          const cls = classes.find(c => c.grade == Number(g));
          const stu = cls?.students?.find((s: any) => String(s.listIndex) == l);
          if (stu) {
            displacedLeaders.push({ grade: Number(g), listIndex: Number(l), name: stu.name });
          }
        });
      }
    });

    const currentResults = { ...results };
    const addedChoices: ChoiceData[] = [];
    const nonCancelledOptions = options.filter(o => !cancelledProjects.includes(o.id));

    displacedLeaders.forEach(leader => {
      let minFillRatio = Infinity;
      let candidateProjects: string[] = [];

      nonCancelledOptions.forEach(option => {
        const assignedCount = Object.values(currentResults).filter(v => v === option.id).length;
        const fillRatio = option.max > 0 ? assignedCount / option.max : assignedCount;
        
        if (fillRatio < minFillRatio) {
          minFillRatio = fillRatio;
          candidateProjects = [option.id];
        } else if (fillRatio === minFillRatio) {
          candidateProjects.push(option.id);
        }
      });

      const assignedProjectId = candidateProjects[Math.floor(Math.random() * candidateProjects.length)];
      const randomId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      
      const newChoice: ChoiceData = {
        id: randomId,
        name: leader.name + " [Leiter-Zuweisung]",
        grade: leader.grade,
        listIndex: leader.listIndex,
        selected: [assignedProjectId]
      };

      addedChoices.push(newChoice);
      currentResults[randomId] = assignedProjectId;
    });

    setLocalChoices([...localChoices, ...addedChoices]);
    setNewChoices([...newChoices, ...addedChoices]);
    setResults(currentResults);
    
    snackbar({ message: `${displacedLeaders.length} Leitende wurden automatisch verteilt.` });
    setShowCancelledDialog(false);
  }

  const [showMissingDialog, setShowMissingDialog] = React.useState(false);
  const [missingStudentsList, setMissingStudentsList] = React.useState<any[]>([]);
  const [selectedMissing, setSelectedMissing] = React.useState<string[]>([]);

  function setCloudResults() {
    let newResults: Record<string, string> = {};

    cloudResults.forEach((result) => {
      newResults[result.id] = result.result;
    });

    // assign other results to first choice
    localChoices.forEach((choice) => {
      if (!newResults[choice.id]) {
        newResults[choice.id] = choice.selected[0];
      }
    });
    setResults(newResults);
  }

  function assignToFirstChoice() {
    const newResults: Record<string, string> = {};
    localChoices.forEach((choice) => {
      newResults[choice.id] = (choice.selected || [])[0];
    });
    setResults(newResults);
    setMode("projects"); // Automatically switch to projects view
  }

  async function fetchOptimization() {
    setLoading(true);
    try {
      if (!auth.currentUser) {
        snackbar({ message: "Benutzer nicht angemeldet." });
        setLoading(false);
        return;
      }
      const authToken = await auth.currentUser.getIdToken();

      const projects: Record<string, { title: string; max: number; min: number; overbookPenalty: number }> = {};
      for (const option of options) {
        projects[option.id] = {
          title: option.title,
          max: option.max,
          min: projectMins[option.id] ?? 4,
          overbookPenalty: projectOverbooks[option.id] ?? 8,
        };
      }

      const preferences: Record<
        string,
        { selected: string[]; points: number[] }
      > = {};
      const calculatedPoints: Record<string, number[]> = {};

      for (const choice of localChoices) {
        const points = calculatePoints(choice, rules);

        let selectedToSend = choice.selected || [];
        
        // If a non-voter was manually assigned locally, tell the solver to lock them into that project
        if (selectedToSend.length === 0 && results[choice.id]) {
          selectedToSend = [results[choice.id]];
        }

        preferences[choice.id] = {
          selected: selectedToSend,
          points: points,
        };
        calculatedPoints[choice.id] = points;
      }

      const requestObject = {
        token: authToken,
        uid: auth.currentUser.uid,
        projects: projects,
        preferences: preferences,
        selectCount: vote.selectCount,
      };

      const response = await httpsCallable(functions, "assign")(requestObject);

      if (!response.data) {
        throw new Error("No data in response");
      }
      
      const responseData = response.data as { solution?: Record<string, string>; stats?: any };
      const data = responseData.solution || (response.data as Record<string, string>);
      const returnedStats = responseData.stats || null;

      setResults(data);
      setStats(returnedStats);
      setChoicePoints(calculatedPoints);
      
      if (returnedStats?.cancelledProjects && returnedStats.cancelledProjects.length > 0) {
        setCancelledProjects(returnedStats.cancelledProjects);
        setShowCancelledDialog(true);
      }
      if (window.location.hostname === "localhost") {
        // skip throttling on localhost
        setLoading(false);
        return;
      }
      setTimeout(() => setLoading(false), 5000);
    } catch (error) {
      console.error("Error fetching optimization:", error);
      snackbar({ message: "Fehler beim Laden der Optimierung." });
      setLoading(false);
    }
  }

  function prepareDistributeMissingStudents() {
    const missingStudents: any[] = [];
    classes.forEach((c: any) => {
      if (!c.students) return;
      c.students.forEach((s: any) => {
        // Check if student is a leader in any option
        const isLeader = options.some((opt) => opt.leaders?.includes(`${c.grade}-${s.listIndex}`));
        if (isLeader) return;

        const hasVoted = localChoices.some(
          (choice) => choice.grade == c.grade && choice.listIndex == s.listIndex
        );
        if (!hasVoted) {
          missingStudents.push({ ...s, grade: c.grade });
        }
      });
    });

    if (missingStudents.length === 0) {
      snackbar({ message: "Alle Schüler haben bereits gewählt!" });
      return;
    }

    missingStudents.sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.name.localeCompare(b.name);
    });

    setMissingStudentsList(missingStudents);
    setSelectedMissing(missingStudents.map(s => `${s.grade}-${s.listIndex}`));
    setShowMissingDialog(true);
  }

  function confirmDistribute() {
    const missingStudents = missingStudentsList.filter(s => selectedMissing.includes(`${s.grade}-${s.listIndex}`));
    if (missingStudents.length === 0) {
      setShowMissingDialog(false);
      return;
    }

    const currentResults = { ...results };
    const addedChoices: ChoiceData[] = [];

    // Shuffle the students so we don't just dump the lowest grades into the emptiest projects first
    const shuffledStudents = [...missingStudents].sort(() => Math.random() - 0.5);

    shuffledStudents.forEach((student) => {
      let minFillRatio = Infinity;
      let candidateProjects: string[] = [];

      options.forEach(option => {
        const assignedCount = Object.values(currentResults).filter(v => v === option.id).length;
        const fillRatio = option.max > 0 ? assignedCount / option.max : assignedCount;
        
        if (fillRatio < minFillRatio) {
          minFillRatio = fillRatio;
          candidateProjects = [option.id];
        } else if (fillRatio === minFillRatio) {
          candidateProjects.push(option.id);
        }
      });

      const assignedProjectId = candidateProjects[Math.floor(Math.random() * candidateProjects.length)];
      const randomId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      
      const newChoice: ChoiceData = {
        id: randomId,
        name: student.name + " [*]",
        grade: student.grade,
        listIndex: student.listIndex,
        selected: [assignedProjectId]
      };

      addedChoices.push(newChoice);
      currentResults[randomId] = assignedProjectId;
    });

    setLocalChoices([...localChoices, ...addedChoices]);
    setNewChoices([...newChoices, ...addedChoices]);
    setResults(currentResults);
    
    snackbar({ message: `${missingStudents.length} fehlende Schüler wurden zufällig verteilt.` });
    setShowMissingDialog(false);
  }

  function quickExport() {
    if (!results) {
      snackbar({ message: "Bitte zuerst eine Zuteilung generieren." });
      return;
    }
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [297, 210] });
    
    doc.setFontSize(16);
    doc.text(`Quickexport - ${vote.title}`, 14, 15);
    
    let finalY = 25;

    const getSoftColor = (wishIndex: number | undefined, maxWishes: number): [number, number, number] => {
      if (wishIndex === undefined || wishIndex < 0) return [255, 240, 240];
      const ratio = maxWishes <= 1 ? 0 : wishIndex / (maxWishes - 1);
      if (ratio <= 0.5) {
        const localRatio = ratio * 2;
        return [
          Math.round(240 + 15 * localRatio),
          Math.round(252 + 1 * localRatio),
          Math.round(240 - 5 * localRatio)
        ];
      } else {
        const localRatio = (ratio - 0.5) * 2;
        return [
          255,
          Math.round(253 - 13 * localRatio),
          Math.round(235 + 5 * localRatio)
        ];
      }
    };

    const tableBody: any[][] = [];
    
    // Sort projects by title
    const sortedProjects = options.slice().sort((a, b) => a.title.localeCompare(b.title));
    
    sortedProjects.forEach(project => {
      const assigned = Object.keys(results).filter(id => results[id] === project.id);
      if (assigned.length === 0) return;
      
      const students = assigned.map(id => localChoices.find(c => c.id === id)).filter(Boolean) as ChoiceData[];
      
      // Sort students by class then listIndex
      students.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return a.listIndex - b.listIndex;
      });

      // Add project header row
      tableBody.push([{ content: project.title, colSpan: 4 + vote.selectCount, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
      
      students.forEach(student => {
        const choicesNames = Array.from({length: vote.selectCount}).map((_, i) => {
          const optId = student.selected?.[i];
          if (!optId) return "-";
          const isAssignedToThisChoice = optId === project.id;
          const title = options.find(o => o.id === optId)?.title || "-";
          return isAssignedToThisChoice ? `[ ${title} ]` : title;
        });
        
        let assignedText = "Manuell";
        const wishIndex = student.selected?.indexOf(project.id);
        if (wishIndex !== undefined && wishIndex >= 0) {
          assignedText = `${wishIndex + 1}. Wunsch`;
        }

        const color = getSoftColor(wishIndex, vote.selectCount);

        tableBody.push([
          { content: student.name, styles: { fillColor: color } },
          { content: student.grade.toString(), styles: { fillColor: color } },
          { content: student.listIndex.toString(), styles: { fillColor: color } },
          ...choicesNames.map(c => ({ content: c, styles: { fillColor: color } })),
          { content: assignedText, styles: { fillColor: color } }
        ]);
      });
    });

    // Handle unassigned students
    const unassignedStudents: {name: string, grade: number, listIndex: number, info: string, choices: string[]}[] = [];

    // 1. Unassigned voters (in localChoices but no valid result)
    const unassignedVoters = localChoices.filter(c => !results[c.id] || !options.some(o => o.id === results[c.id]));
    unassignedVoters.forEach(student => {
      const choicesNames = Array.from({length: vote.selectCount}).map((_, i) => {
        const optId = student.selected?.[i];
        return optId ? options.find(o => o.id === optId)?.title || "-" : "-";
      });
      unassignedStudents.push({
        name: student.name,
        grade: student.grade,
        listIndex: student.listIndex,
        info: "Wähler",
        choices: choicesNames
      });
    });

    // 2. Missing students (Nicht-Wähler) and Displaced Leaders
    classes.forEach((c: any) => {
      if (!c.students) return;
      c.students.forEach((s: any) => {
        const hasVoted = localChoices.some(choice => choice.grade == c.grade && choice.listIndex == s.listIndex);
        if (hasVoted) return;

        let isLeaderActive = false;
        let isLeaderCancelled = false;

        options.forEach((opt) => {
          if (opt.leaders?.includes(`${c.grade}-${s.listIndex}`)) {
            if (cancelledProjects.includes(opt.id)) {
              isLeaderCancelled = true;
            } else {
              isLeaderActive = true;
            }
          }
        });

        if (isLeaderActive) return; // Active leaders are okay, they don't vote

        const info = isLeaderCancelled ? "Leiter (abgesagt)" : "Nicht-Wähler";
        
        unassignedStudents.push({
          name: s.name,
          grade: c.grade,
          listIndex: s.listIndex,
          info: info,
          choices: Array(vote.selectCount).fill("-")
        });
      });
    });

    if (unassignedStudents.length > 0) {
      unassignedStudents.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return a.listIndex - b.listIndex;
      });

      tableBody.push([{ content: "Ohne Zuteilung", colSpan: 4 + vote.selectCount, styles: { fillColor: [255, 200, 200], fontStyle: 'bold', textColor: [200, 0, 0] } }]);
      
      unassignedStudents.forEach(student => {
        tableBody.push([
          student.name,
          student.grade.toString(),
          student.listIndex.toString(),
          ...student.choices,
          student.info
        ]);
      });
    }

    const head = [["Name", "Kl.", "Nr.", ...Array.from({length: vote.selectCount}).map((_, i) => `${i+1}. Wahl`), "Zugewiesen / Status"]];

    autoTable(doc, {
      startY: finalY,
      head: head,
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243] },
    });

    const pdfBlob = doc.output('blob');
    const dumpData = {
      waldorfWahlenDump: "v2",
      results,
      localChoices,
      newChoices,
      stats,
      projectMins,
      projectOverbooks,
      cancelledProjects,
      rules
    };
    const dumpString = "\n===WALDORFWAHLEN_DUMP===\n" + JSON.stringify(dumpData) + "\n===END_DUMP===\n";
    const dumpBlob = new Blob([dumpString], { type: "text/plain" });
    const finalBlob = new Blob([pdfBlob, dumpBlob], { type: "application/pdf" });
    const url = URL.createObjectURL(finalBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Quickexport_${vote.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    snackbar({ message: "Quickexport generiert!" });
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const match = text.match(/===WALDORFWAHLEN_DUMP===\n([\s\S]*?)\n===END_DUMP===/);
      if (match) {
        try {
          const dump = JSON.parse(match[1]);
          if (dump.waldorfWahlenDump === "v1" || dump.waldorfWahlenDump === "v2") {
            setResults(dump.results);
            setLocalChoices(dump.localChoices);
            setNewChoices(dump.newChoices);
            
            if (dump.stats !== undefined) setStats(dump.stats);
            if (dump.projectMins) setProjectMins(dump.projectMins);
            if (dump.projectOverbooks) setProjectOverbooks(dump.projectOverbooks);
            if (dump.cancelledProjects) setCancelledProjects(dump.cancelledProjects);
            if (dump.rules) setRules(dump.rules);

            // Recalculate choice points just in case
            const calculatedPoints: Record<string, number[]> = {};
            dump.localChoices.forEach((choice: ChoiceData) => {
              calculatedPoints[choice.id] = calculatePoints(choice, rules);
            });
            setChoicePoints(calculatedPoints);

            snackbar({ message: "Stand erfolgreich aus PDF importiert!" });
          } else {
            snackbar({ message: "Unbekannte Dump-Version." });
          }
        } catch (err) {
          snackbar({ message: "Fehler beim Lesen des Dumps." });
        }
      } else {
        snackbar({ message: "Kein Quickexport-Dump in dieser Datei gefunden." });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const switchRef = React.useRef<HTMLInputElement>(null);

  let blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname && results !== null
  );
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleToggle = () => {
      // if there are rules with grade=12, remove them, if not, add them

      const grade12RuleIndex = rules.findIndex(
        (rule) => rule.apply === "grade=12"
      );
      if (grade12RuleIndex !== -1) {
        const newRules = [...rules];
        newRules.splice(grade12RuleIndex, 1);
        setRules(newRules);

        snackbar({
          message: "12. Klässler werden nicht bevorzugt",
          action: "Regeln ansehen",
          onActionClick: () => {
            setEditRules(true);
          },
        });
      } else {
        setRules([...rules, { apply: "grade=12", scores: [1, 5, 10] }]);
        snackbar({
          message: "12. Klässler werden bevorzugt",
          action: "Regeln ansehen",
          onActionClick: () => {
            setEditRules(true);
          },
        });
      }
    };

    if (switchRef.current) {
      switchRef.current.addEventListener("change", handleToggle);
    }

    return () => {
      if (switchRef.current) {
        switchRef.current.removeEventListener("change", handleToggle);
      }
    };
  }, [rules]);  if (loading || !results) {
    return (
      <div className="mdui-prose">
        <RulesDialog
          open={editRules}
          onClose={() => setEditRules(false)}
          rules={rules}
          setRules={setRules}
          options={options}
          projectMins={projectMins}
          setProjectMins={setProjectMins}
          projectOverbooks={projectOverbooks}
          setProjectOverbooks={setProjectOverbooks}
        />
        <Setup
          vote={vote}
          cloudResults={cloudResults}
          setCloudResults={setCloudResults}
          fetchOptimization={fetchOptimization}
          assignToFirstChoice={assignToFirstChoice}
          loading={loading}
          rules={rules}
          switchRef={switchRef}
          setEditRules={setEditRules}
          handleImport={handleImport}
        />
      </div>
    );
  }

  function saveResults() {
    Object.entries(results!).forEach(([key, value]) => {
      setDoc(
        doc(db, `/schools/SCHOOLID/votes/${vote.id}/results/${key}`),
        {
          result: value,
        },
        {
          merge: true,
        }
      );
    });
    
    newChoices.forEach((choice) => {
      setDoc(
        doc(db, `/schools/SCHOOLID/votes/${vote.id}/choices/${choice.id}`),
        { ...choice, timestamp: serverTimestamp() }
      );
    });

    confirm({
      headline: "Ergebnisse gespeichert",
      description:
        "Die Ergebnisse wurden erfolgreich gespeichert. Sie können diese URL mit anderen Lehrern teilen.",
      icon: "done",
      cancelText: "URL kopieren",
      onCancel: (e: any) => {
        navigator.clipboard.writeText(window.location.href);
        snackbar({ message: "URL kopiert." });

        return false;
      },
      confirmText: "Weiter",
      onConfirm: () => {
        setResults(null);
        navigate(`/admin/${vote.id}/results`);
      },
    });
  }

  return (
    <div className="mdui-prose">
      <mdui-dialog
        open={blocker.state === "blocked"}
        headline={"Änderungen verwerfen?"}
        icon="warning"
      >
        <div className="mdui-prose">
          <p>
            Sie haben Änderungen vorgenommen. Wenn Sie fortfahren, gehen diese
            verloren.
          </p>
        </div>
        <p />
        <div className="button-container">
          <mdui-button onClick={() => blocker.reset?.()} variant="text">
            Abbrechen
          </mdui-button>
          <mdui-button onClick={() => blocker.proceed?.()}>
            Verwerfen
          </mdui-button>
        </div>
      </mdui-dialog>

      <mdui-dialog
        open={showMissingDialog}
        headline="Fehlende Schüler verteilen"
        closeOnEsc
        closeOnOverlayClick
        onClosed={() => setShowMissingDialog(false)}
      >
        <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "8px", overflowX: "hidden" }}>
          <p>Wählen Sie aus, welche Schüler automatisch auf die Projekte mit der geringsten Auslastung verteilt werden sollen:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
            {missingStudentsList.map((s, i) => {
              const key = `${s.grade}-${s.listIndex}`;
              const checked = selectedMissing.includes(key);
              return (
                <CheckboxWrapper
                  key={key}
                  checked={checked}
                  onChange={(isChecked) => {
                    if (isChecked) {
                      setSelectedMissing((prev) => [...prev, key]);
                    } else {
                      setSelectedMissing((prev) => prev.filter((k) => k !== key));
                    }
                  }}
                  label={`${s.name} (Klasse ${s.grade})`}
                />
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
          <mdui-button variant="text" onClick={() => setShowMissingDialog(false)}>
            Abbrechen
          </mdui-button>
          <mdui-button onClick={confirmDistribute} disabled={selectedMissing.length === 0}>
            {selectedMissing.length} Schüler verteilen
          </mdui-button>
        </div>
      </mdui-dialog>

      <RulesDialog
        open={editRules}
        onClose={() => setEditRules(false)}
        rules={rules}
        setRules={setRules}
        options={options}
        projectMins={projectMins}
        setProjectMins={setProjectMins}
        projectOverbooks={projectOverbooks}
        setProjectOverbooks={setProjectOverbooks}
      />

      <mdui-dialog open={showCancelledDialog} onOpenChange={(e: any) => setShowCancelledDialog(e.target.open)} headline="Projekte wurden abgesagt!">
        <div style={{ color: "var(--mdui-color-on-surface-variant)", marginBottom: "16px" }}>
          Der Algorithmus hat <b>{cancelledProjects.length} Projekt(e)</b> aufgrund ungenügender Teilnehmerzahl abgesagt:
          <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
            {cancelledProjects.map(id => {
              const opt = options.find(o => o.id === id);
              return <li key={id}>{opt?.title || id}</li>;
            })}
          </ul>
          Die dortigen Leitenden müssen nun in andere Projekte verschoben werden.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
          <mdui-button variant="text" onClick={distributeLeadersAutomatically}>
            Leitende automatisch verteilen
          </mdui-button>
          <mdui-button variant="filled" onClick={() => setShowCancelledDialog(false)}>
            Später manuell zuweisen
          </mdui-button>

        </div>
      </mdui-dialog>

      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px"
        }}
      >
        <h2 style={{ margin: 0 }}>Zuteilung</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <mdui-tooltip content="Quickexport (PDF)">
            <mdui-button-icon icon="download" onClick={quickExport}></mdui-button-icon>
          </mdui-tooltip>
          <mdui-tooltip content="Zurücksetzen" variant="rich">
            <mdui-button-icon
              icon="history"
              onClick={() => {
                confirm({
                  icon: "history",
                  headline: "Zurücksetzen?",
                  description:
                    "Dadurch werden die Ergebnisse zurückgesetzt und müssen erneut berechnet werden.",
                  confirmText: "Zurücksetzen",
                  cancelText: "Abbrechen",
                  onConfirm: () => {
                    setResults(null);                  },
                });
              }}
            ></mdui-button-icon>
          </mdui-tooltip>
          <mdui-button onClick={saveResults}>Speichern</mdui-button>
        </div>
      </div>

      <mdui-tabs value={mode}>
        <mdui-tab value="overview" onClick={() => setMode("overview")}>Übersicht & Probleme</mdui-tab>
        <mdui-tab value="projects" onClick={() => setMode("projects")}>Projekte</mdui-tab>
        <mdui-tab value="power-search" onClick={() => setMode("power-search")}>Schülersuche</mdui-tab>
      </mdui-tabs>

      {mode === "overview" && (
        <Overview
          results={results}
          vote={vote}
          choices={localChoices}
          options={options}
          classes={classes}
          stats={stats}
          onSearchRequest={(query) => {
            setSearch(query);
            setMode("power-search");
          }}
          onDistributeMissingStudents={prepareDistributeMissingStudents}
        />
      )}

      {mode === "projects" && (
        <ProjectView
          results={results}
          setResults={setResults}
          vote={vote}
          choices={localChoices}
          options={options}
          choicePoints={choicePoints}
          cancelledProjects={cancelledProjects}
          classes={classes}
          onAddChoice={(c) => {
            setLocalChoices((prev) => [...prev, c]);
            setNewChoices((prev) => [...prev, c]);
          }}
        />
      )}

      {mode === "power-search" && (
        <StudentSearch
          searchQuery={search}
          setSearchQuery={setSearch}
          results={results}
          setResults={setResults}
          vote={vote}
          choices={localChoices}
          options={options}
          choicePoints={choicePoints}
          classes={classes}
          cancelledProjects={cancelledProjects}
          onAddChoice={(c) => {
            setLocalChoices((prev) => [...prev, c]);
            setNewChoices((prev) => [...prev, c]);
          }}
        />
      )}
    </div>
  );
}

Assign.loader = async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params as { id: string };

  const vote = await getDoc(doc(db, `schools/SCHOOLID/votes/${id}`));
  const voteData = { id: vote.id, ...vote.data() } as VoteData;

  const choices = await getDocs(
    collection(db, `schools/SCHOOLID/votes/${id}/choices`)
  );
  const choiceData = choices.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChoiceData[];

  const options = await getDocs(
    collection(db, `schools/SCHOOLID/votes/${id}/options`)
  );
  const optionData = options.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OptionData[];

  const results = await getDocs(
    collection(db, `schools/SCHOOLID/votes/${id}/results`)
  );
  const resultsData = results.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ResultData[];

  const classes = await getDocs(collection(db, `schools/SCHOOLID/class`));
  const classData = classes.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })).filter((c: any) => !voteData.allowedGrades || voteData.allowedGrades.length === 0 || voteData.allowedGrades.includes(Number(c.grade)));

  return {
    vote: voteData,
    choices: choiceData,
    options: optionData,
    results: resultsData,
    classes: classData,
  };
};

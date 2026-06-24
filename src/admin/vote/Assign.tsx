import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
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

import Setup from "./assign/Setup";
import RulesDialog from "./assign/RulesDialog";
import Overview from "./assign/Overview";
import ProjectView from "./assign/ProjectView";
import StudentSearch from "./assign/StudentSearch";



export default function Assign() {
  const {
    vote,
    choices,
    options,
    results: cloudResults,
  } = useLoaderData() as LoaderData;

  const [results, setResults] = React.useState<Record<string, string> | null>(
    null
  );
  const [loading, setLoading] = React.useState<boolean>(false);
  const [mode, setMode] = React.useState<string>("by-option");
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

  function setCloudResults() {
    let newResults: Record<string, string> = {};

    cloudResults.forEach((result) => {
      newResults[result.id] = result.result;
    });

    // assign other results to first choice
    choices.forEach((choice) => {
      if (!newResults[choice.id]) {
        newResults[choice.id] = choice.selected[0];
      }
    });
    setResults(newResults);
  }

  function assignToFirstChoice() {
    const newResults: Record<string, string> = {};
    choices.forEach((choice) => {
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

      const projects: Record<string, { title: string; max: number }> = {};
      for (const option of options) {
        projects[option.id] = {
          title: option.title,
          max: option.max,
        };
      }

      const preferences: Record<
        string,
        { selected: string[]; points: number[] }
      > = {};
      const calculatedPoints: Record<string, number[]> = {};

      for (const choice of choices) {
        const points = calculatePoints(choice, rules);

        preferences[choice.id] = {
          selected: choice.selected,
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
      const data = response.data as Record<string, string>;

      setResults(data);
      setChoicePoints(calculatedPoints);
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

      <RulesDialog
        open={editRules}
        onClose={() => setEditRules(false)}
        rules={rules}
        setRules={setRules}
      />

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
          choices={choices}
          options={options}
          onSearchRequest={(query) => {
            setSearch(query);
            setMode("power-search");
          }}
        />
      )}

      {mode === "projects" && (
        <ProjectView
          results={results}
          setResults={setResults}
          vote={vote}
          choices={choices}
          options={options}
          choicePoints={choicePoints}
        />
      )}

      {mode === "power-search" && (
        <StudentSearch
          searchQuery={search}
          setSearchQuery={setSearch}
          results={results}
          setResults={setResults}
          vote={vote}
          choices={choices}
          options={options}
          choicePoints={choicePoints}
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

  return {
    vote: voteData,
    choices: choiceData,
    options: optionData,
    results: resultsData,
  };
};

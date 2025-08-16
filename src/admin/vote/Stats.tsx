import React, { useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Pie, Line, Doughnut } from "react-chartjs-2";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import { LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import { db } from "../../firebase";
import html2canvas from "html2canvas";
import { snackbar } from "mdui";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface VoteData extends DocumentData {
  id: string;
  title: string;
  selectCount: number;
}

interface OptionData extends DocumentData {
  id: string;
  title: string;
  teacher: string;
}

interface ChoiceData extends DocumentData {
  id: string;
  name: string;
  grade: number;
  selected: string[];
  timestamp: Timestamp;
}

interface ResultData extends DocumentData {
  id: string; // This is the choice ID
  result: string; // This is the assigned project ID
}

interface FeedbackData extends DocumentData {
  id: string;
  satisfaction: number;
  excitement: number;
  easeOfProcess: number;
  timestamp: Timestamp;
}

interface LoaderData {
  vote: VoteData;
  options: OptionData[];
  choices: ChoiceData[];
  results: ResultData[];
  feedback: FeedbackData[];
}

export default function Stats() {
  const { vote, options, choices, results, feedback } = useLoaderData() as LoaderData;
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  // Refs for downloading charts
  const gradeDistributionRef = useRef<HTMLDivElement>(null);
  const projectPopularityRef = useRef<HTMLDivElement>(null);
  const assignmentStatsRef = useRef<HTMLDivElement>(null);
  const submissionsTimelineRef = useRef<HTMLDivElement>(null);

  // Get unique grades for filtering
  const getUniqueGrades = () => {
    const grades = new Set(choices.map(c => c.grade.toString()));
    return Array.from(grades).sort();
  };

  // Filter data based on current filters
  const getFilteredChoices = () => {
    let filtered = choices;
    
    if (selectedGrade !== "all") {
      filtered = filtered.filter(choice => choice.grade.toString() === selectedGrade);
    }
    
    if (dateRange !== "all") {
      const now = new Date();
      let cutoff: Date;
      
      switch (dateRange) {
        case "24h":
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          return filtered;
      }
      
      filtered = filtered.filter(choice => 
        new Date(choice.timestamp.seconds * 1000) >= cutoff
      );
    }
    
    return filtered;
  };

  // Get filtered results based on filtered choices
  const getFilteredResults = () => {
    const filteredChoiceIds = new Set(getFilteredChoices().map(c => c.id));
    return results.filter(result => filteredChoiceIds.has(result.id));
  };

  // Download chart as PNG
  const downloadChart = async (
    ref: React.RefObject<HTMLDivElement>,
    filename: string
  ) => {
    if (!ref.current) return;

    try {
      const canvas = await html2canvas(ref.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const link = document.createElement("a");
      link.download = `${filename}-${vote.title.replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL();
      link.click();

      snackbar({
        message: `Diagramm ${filename} erfolgreich heruntergeladen`,
        closeable: true,
      });
    } catch (error) {
      snackbar({
        message: `Fehler beim Herunterladen: ${error}`,
        closeable: true,
      });
    }
  };

  // Submissions over time data (simplified)
  const getSubmissionsTimelineData = () => {
    const filteredChoices = getFilteredChoices();
    if (filteredChoices.length === 0) return { labels: [], datasets: [] };

    const dayGroups = new Map<string, number>();

    filteredChoices.forEach((choice) => {
      const date = new Date(choice.timestamp.seconds * 1000);
      const key = date.toISOString().slice(0, 10);
      dayGroups.set(key, (dayGroups.get(key) || 0) + 1);
    });

    const sortedEntries = Array.from(dayGroups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    return {
      labels: sortedEntries.map(([key]) => 
        new Date(key).toLocaleDateString("de-DE")
      ),
      datasets: [
        {
          label: "Abgaben",
          data: sortedEntries.map(([, count]) => count),
          backgroundColor: "rgba(25, 118, 210, 0.1)",
          borderColor: "rgb(25, 118, 210)",
          borderWidth: 2,
          fill: true,
        },
      ],
    };
  };

  // Grade distribution
  const getGradeDistributionData = () => {
    const filteredChoices = getFilteredChoices();
    const gradeCounts = new Map<number, number>();

    filteredChoices.forEach((choice) => {
      const grade = Number(choice.grade);
      gradeCounts.set(grade, (gradeCounts.get(grade) || 0) + 1);
    });

    const sortedGrades = Array.from(gradeCounts.entries()).sort(
      (a, b) => a[0] - b[0]
    );

    return {
      labels: sortedGrades.map(([grade]) => `Klasse ${grade}`),
      datasets: [
        {
          label: "Anzahl Schüler",
          data: sortedGrades.map(([, count]) => count),
          backgroundColor: "rgb(25, 118, 210)",
          borderColor: "rgb(25, 118, 210)",
          borderWidth: 1,
        },
      ],
    };
  };

  // Project popularity (simplified)
  const getProjectPopularityData = () => {
    const filteredChoices = getFilteredChoices();
    const projectCounts = new Map<string, number>();

    filteredChoices.forEach((choice) => {
      choice.selected.forEach((optionId) => {
        projectCounts.set(optionId, (projectCounts.get(optionId) || 0) + 1);
      });
    });

    const sortedProjects = Array.from(projectCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 projects

    const labels = sortedProjects.map(([optionId]) => {
      const option = options.find((o) => o.id === optionId);
      return option ? option.title : optionId;
    });

    return {
      labels,
      datasets: [
        {
          label: "Anzahl Wahlen",
          data: sortedProjects.map(([, count]) => count),
          backgroundColor: "rgb(76, 175, 80)",
          borderColor: "rgb(76, 175, 80)",
          borderWidth: 1,
        },
      ],
    };
  };

  // Assignment stats (simplified)
  const getAssignmentStatsData = () => {
    const filteredResults = getFilteredResults();
    const filteredChoices = getFilteredChoices();
    
    const assignmentCounts = new Array(vote.selectCount + 1).fill(0);

    filteredResults.forEach((result) => {
      const choice = filteredChoices.find((c) => c.id === result.id);
      if (choice && result.result) {
        const choiceIndex = choice.selected.findIndex(
          (selected) => selected === result.result
        );
        if (choiceIndex !== -1 && choiceIndex < vote.selectCount) {
          assignmentCounts[choiceIndex]++;
        } else {
          assignmentCounts[assignmentCounts.length - 1]++;
        }
      } else {
        assignmentCounts[assignmentCounts.length - 1]++;
      }
    });

    const labels = [
      ...Array.from({ length: vote.selectCount }, (_, i) => `${i + 1}. Wahl`),
      "Andere",
    ];

    return {
      labels,
      datasets: [
        {
          data: assignmentCounts,
          backgroundColor: [
            "rgb(76, 175, 80)",   // Green
            "rgb(255, 152, 0)",   // Orange  
            "rgb(244, 67, 54)",   // Red
            "rgb(156, 39, 176)",  // Purple
            "rgb(33, 150, 243)",  // Blue
            "rgb(96, 125, 139)",  // Blue Grey
          ],
        },
      ],
    };
  };

  // Get basic stats
  const getBasicStats = () => {
    const filteredChoices = getFilteredChoices();
    const filteredResults = getFilteredResults();
    
    const firstChoiceSuccess = filteredResults.length > 0
      ? Math.round(
          (filteredResults.filter((r) => {
            const choice = filteredChoices.find((c) => c.id === r.id);
            return (
              choice &&
              choice.selected.length > 0 &&
              choice.selected[0] === r.result
            );
          }).length /
            filteredResults.length) *
            100
        )
      : 0;

    const avgFeedback = feedback.length > 0 
      ? (feedback.reduce((sum, f) => sum + f.satisfaction + f.excitement + f.easeOfProcess, 0) / (feedback.length * 3)).toFixed(1)
      : null;

    return {
      totalParticipants: filteredChoices.length,
      totalProjects: options.length,
      totalAssigned: filteredResults.length,
      firstChoiceSuccess,
      avgFeedback,
      feedbackCount: feedback.length,
    };
  };

  // Simple chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  return (
    <div className="mdui-prose">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Statistiken</h2>
        <p style={{ color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>{vote.title}</p>
      </div>

      {/* Filters */}
      <mdui-card variant="outlined" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <mdui-select 
            label="Klasse" 
            value={selectedGrade}
            style={{ minWidth: "120px" }}
            onInput={(e: any) => setSelectedGrade(e.target.value)}
          >
            <mdui-menu-item value="all">Alle Klassen</mdui-menu-item>
            {getUniqueGrades().map(grade => (
              <mdui-menu-item key={grade} value={grade}>Klasse {grade}</mdui-menu-item>
            ))}
          </mdui-select>

          <mdui-select 
            label="Zeitraum" 
            value={dateRange}
            style={{ minWidth: "130px" }}
            onInput={(e: any) => setDateRange(e.target.value)}
          >
            <mdui-menu-item value="all">Gesamter Zeitraum</mdui-menu-item>
            <mdui-menu-item value="24h">Letzte 24h</mdui-menu-item>
            <mdui-menu-item value="7d">Letzte 7 Tage</mdui-menu-item>
            <mdui-menu-item value="30d">Letzte 30 Tage</mdui-menu-item>
          </mdui-select>

          {(selectedGrade !== "all" || dateRange !== "all") && (
            <mdui-button 
              variant="outlined" 
              icon="clear"
              onClick={() => {
                setSelectedGrade("all");
                setDateRange("all");
              }}
            >
              Filter zurücksetzen
            </mdui-button>
          )}
        </div>
      </mdui-card>

      {/* Key Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
        marginBottom: "30px",
      }}>
        {(() => {
          const stats = getBasicStats();
          
          return [
            {
              icon: "how_to_vote",
              label: "Teilnehmer",
              value: stats.totalParticipants,
            },
            {
              icon: "assignment",
              label: "Projekte",
              value: stats.totalProjects,
            },
            {
              icon: "assignment_turned_in",
              label: "Zugeteilte",
              value: stats.totalAssigned,
            },
            {
              icon: "thumb_up",
              label: "Erstwunsch-Rate",
              value: `${stats.firstChoiceSuccess}%`,
            },
            ...(stats.avgFeedback ? [{
              icon: "star",
              label: "Durchschnittsbewertung",
              value: `${stats.avgFeedback}/5`,
            }] : []),
          ].map((stat, index) => (
            <mdui-card key={index} variant="outlined" style={{ padding: "20px", textAlign: "center" }}>
              <mdui-icon name={stat.icon} style={{ fontSize: "2rem", marginBottom: "8px" }}></mdui-icon>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1.5rem" }}>{stat.value}</h3>
              <p style={{ margin: 0, color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>{stat.label}</p>
            </mdui-card>
          ));
        })()}
      </div>

      {/* Charts */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "20px",
        marginBottom: "30px",
      }}>
        {/* Grade Distribution */}
        <mdui-card variant="outlined" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0 }}>Klassenverteilung</h3>
            <mdui-button-icon 
              icon="download"
              onClick={() => downloadChart(gradeDistributionRef, "klassenverteilung")}
            />
          </div>
          <div ref={gradeDistributionRef} style={{ height: "300px" }}>
            <Bar data={getGradeDistributionData()} options={chartOptions} />
          </div>
        </mdui-card>

        {/* Submissions Timeline */}
        <mdui-card variant="outlined" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0 }}>Abgaben über Zeit</h3>
            <mdui-button-icon 
              icon="download"
              onClick={() => downloadChart(submissionsTimelineRef, "abgaben-verlauf")}
            />
          </div>
          <div ref={submissionsTimelineRef} style={{ height: "300px" }}>
            <Line data={getSubmissionsTimelineData()} options={chartOptions} />
          </div>
        </mdui-card>

        {/* Project Popularity */}
        <mdui-card variant="outlined" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0 }}>Beliebteste Projekte</h3>
            <mdui-button-icon 
              icon="download"
              onClick={() => downloadChart(projectPopularityRef, "projektbeliebtheit")}
            />
          </div>
          <div ref={projectPopularityRef} style={{ height: "300px" }}>
            <Bar data={getProjectPopularityData()} options={chartOptions} />
          </div>
        </mdui-card>

        {/* Assignment Results */}
        {getFilteredResults().length > 0 && (
          <mdui-card variant="outlined" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Zuteilungsergebnis</h3>
              <mdui-button-icon 
                icon="download"
                onClick={() => downloadChart(assignmentStatsRef, "zuteilungsergebnis")}
              />
            </div>
            <div ref={assignmentStatsRef} style={{ height: "300px" }}>
              <Doughnut data={getAssignmentStatsData()} options={pieChartOptions} />
            </div>
          </mdui-card>
        )}
      </div>

      {/* Detailed Data Tables */}
      {getFilteredChoices().length > 0 && (
        <mdui-card variant="outlined" style={{ padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ marginTop: 0 }}>Detaillierte Übersicht</h3>
          <div className="mdui-table">
            <table>
              <thead>
                <tr>
                  <th>Klasse</th>
                  <th>Anzahl Teilnehmer</th>
                  <th>Abgaben (%)</th>
                  {feedback.length > 0 && <th>Feedback (%)</th>}
                </tr>
              </thead>
              <tbody>
                {getUniqueGrades().map(grade => {
                  const gradeChoices = getFilteredChoices().filter(c => c.grade.toString() === grade);
                  const gradeResults = getFilteredResults().filter(r => 
                    gradeChoices.some(c => c.id === r.id)
                  );
                  const gradeFeedback = feedback.filter(f => 
                    gradeChoices.some(c => 
                      Math.abs(c.timestamp.seconds - f.timestamp.seconds) < 300
                    )
                  );
                  
                  return (
                    <tr key={grade}>
                      <td>Klasse {grade}</td>
                      <td>{gradeChoices.length}</td>
                      <td>{gradeChoices.length > 0 ? Math.round((gradeResults.length / gradeChoices.length) * 100) : 0}%</td>
                      {feedback.length > 0 && (
                        <td>{gradeChoices.length > 0 ? Math.round((gradeFeedback.length / gradeChoices.length) * 100) : 0}%</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </mdui-card>
      )}

      {/* Feedback Section */}
      {feedback.length > 0 && (
        <mdui-card variant="outlined" style={{ padding: "20px" }}>
          <h3 style={{ marginTop: 0 }}>Feedback-Übersicht</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}>
            {[
              { key: "satisfaction", label: "Zufriedenheit", value: (feedback.reduce((s, f) => s + f.satisfaction, 0) / feedback.length).toFixed(1) },
              { key: "excitement", label: "Vorfreude", value: (feedback.reduce((s, f) => s + f.excitement, 0) / feedback.length).toFixed(1) },
              { key: "easeOfProcess", label: "Einfachheit", value: (feedback.reduce((s, f) => s + f.easeOfProcess, 0) / feedback.length).toFixed(1) },
            ].map(metric => (
              <div key={metric.key} style={{ textAlign: "center", padding: "16px", backgroundColor: "rgba(var(--mdui-color-surface-variant), 0.1)", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 8px 0" }}>{metric.label}</h4>
                <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: "500" }}>{metric.value}/5</p>
              </div>
            ))}
          </div>
          <p style={{ color: "rgba(var(--mdui-color-on-surface), 0.6)", margin: 0 }}>
            Basierend auf {feedback.length} Antworten ({Math.round((feedback.length / getFilteredChoices().length) * 100)}% Rücklaufquote)
          </p>
        </mdui-card>
      )}

      {/* Empty State */}
      {getFilteredChoices().length === 0 && (
        <mdui-card variant="outlined" style={{ padding: "40px", textAlign: "center" }}>
          <mdui-icon name="bar_chart" style={{ fontSize: "3rem", color: "rgba(var(--mdui-color-on-surface), 0.3)", marginBottom: "16px" }}></mdui-icon>
          <h3 style={{ color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>Keine Daten verfügbar</h3>
          <p style={{ color: "rgba(var(--mdui-color-on-surface), 0.4)", margin: 0 }}>
            Es sind noch keine Wahlen eingegangen oder die Filter zeigen keine Ergebnisse.
          </p>
        </mdui-card>
      )}
    </div>
  );
}

Stats.loader = async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params as { id: string };

  // Load vote data
  const vote = await getDoc(doc(db, `/votes/${id}`));
  if (!vote.exists()) {
    throw new Response("Vote not found", { status: 404 });
  }
  const voteData = { id: vote.id, ...vote.data() } as VoteData;

  // Load options
  const options = await getDocs(collection(db, `/votes/${id}/options`));
  const optionData = options.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OptionData[];

  // Load choices
  const choices = await getDocs(collection(db, `/votes/${id}/choices`));
  const choiceData = choices.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChoiceData[];

  // Load results
  const results = await getDocs(collection(db, `/votes/${id}/results`));
  const resultData = results.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ResultData[];

  // Load feedback
  const feedback = await getDocs(collection(db, `/votes/${id}/feedback`));
  const feedbackData = feedback.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FeedbackData[];

  return {
    vote: voteData,
    options: optionData,
    choices: choiceData,
    results: resultData,
    feedback: feedbackData,
  };
};

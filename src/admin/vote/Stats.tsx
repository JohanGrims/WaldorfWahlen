import React, { useRef } from "react";
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
import { Bar, Pie, Line } from "react-chartjs-2";
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

  // Refs for downloading charts
  const gradeDistributionRef = useRef<HTMLDivElement>(null);
  const projectPopularityRef = useRef<HTMLDivElement>(null);
  const choiceAssignmentRef = useRef<HTMLDivElement>(null);
  const assignmentStatsRef = useRef<HTMLDivElement>(null);
  const submissionsTimelineRef = useRef<HTMLDivElement>(null);
  const feedbackDistributionRef = useRef<HTMLDivElement>(null);
  const feedbackComparisonRef = useRef<HTMLDivElement>(null);

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

  // Get unique grades for table
  const getUniqueGrades = () => {
    const grades = new Set(choices.map(c => c.grade.toString()));
    return Array.from(grades).sort();
  };

  // Submissions over time data
  const getSubmissionsTimelineData = () => {
    if (choices.length === 0) return { labels: [], datasets: [] };

    const dayGroups = new Map<string, number>();

    choices.forEach((choice) => {
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
          label: "Teilnahmen pro Tag",
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
    const gradeCounts = new Map<number, number>();

    choices.forEach((choice) => {
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
          label: "Anzahl Teilnehmer",
          data: sortedGrades.map(([, count]) => count),
          backgroundColor: "rgb(25, 118, 210)",
          borderColor: "rgb(25, 118, 210)",
          borderWidth: 1,
        },
      ],
    };
  };

  // Project popularity
  const getProjectPopularityData = () => {
    const projectCounts = new Map<string, number>();

    choices.forEach((choice) => {
      choice.selected.forEach((optionId) => {
        projectCounts.set(optionId, (projectCounts.get(optionId) || 0) + 1);
      });
    });

    const sortedProjects = Array.from(projectCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const labels = sortedProjects.map(([optionId]) => {
      const option = options.find((o) => o.id === optionId);
      return option ? option.title : optionId;
    });

    return {
      labels,
      datasets: [
        {
          label: "Anzahl Wahlen (alle Prioritäten)",
          data: sortedProjects.map(([, count]) => count),
          backgroundColor: "rgb(76, 175, 80)",
          borderColor: "rgb(76, 175, 80)",
          borderWidth: 1,
        },
      ],
    };
  };

  // Choice assignments per option (stacked bar chart showing 1st, 2nd, 3rd choice assignments)
  const getChoiceAssignmentPerOptionData = () => {
    const optionChoiceStats = new Map<string, number[]>();

    options.forEach((option) => {
      optionChoiceStats.set(option.id, new Array(vote.selectCount).fill(0));
    });

    results.forEach((result) => {
      const choice = choices.find((c) => c.id === result.id);
      if (choice && result.result) {
        const choiceIndex = choice.selected.findIndex(
          (selected) => selected === result.result
        );
        if (choiceIndex !== -1 && choiceIndex < vote.selectCount) {
          const stats = optionChoiceStats.get(result.result);
          if (stats) {
            stats[choiceIndex]++;
          }
        }
      }
    });

    const optionsWithAssignments = Array.from(optionChoiceStats.entries())
      .filter(([, stats]) => stats.some((count) => count > 0))
      .sort((a, b) => {
        const sumA = a[1].reduce((sum, count) => sum + count, 0);
        const sumB = b[1].reduce((sum, count) => sum + count, 0);
        return sumB - sumA;
      });

    const labels = optionsWithAssignments.map(([optionId]) => {
      const option = options.find((o) => o.id === optionId);
      return option ? option.title : optionId;
    });

    const datasets = [];
    const colors = [
      "rgb(76, 175, 80)",   // Green for 1st choice
      "rgb(255, 152, 0)",   // Orange for 2nd choice
      "rgb(244, 67, 54)",   // Red for 3rd choice
      "rgb(156, 39, 176)",  // Purple for 4th choice
      "rgb(33, 150, 243)",  // Blue for 5th choice
      "rgb(96, 125, 139)",  // Blue Grey for 6th choice
    ];

    for (let i = 0; i < vote.selectCount; i++) {
      datasets.push({
        label: `${i + 1}. Priorität`,
        data: optionsWithAssignments.map(([, stats]) => stats[i]),
        backgroundColor: colors[i] || "rgb(158, 158, 158)",
        borderColor: colors[i] || "rgb(158, 158, 158)",
        borderWidth: 1,
      });
    }

    return { labels, datasets };
  };

  // Assignment distribution pie chart
  const getAssignmentStatsData = () => {
    const assignmentCounts = new Array(vote.selectCount + 1).fill(0);

    results.forEach((result) => {
      const choice = choices.find((c) => c.id === result.id);
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
      ...Array.from({ length: vote.selectCount }, (_, i) => `${i + 1}. Priorität`),
      "Nicht zugewiesen",
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
          borderWidth: 1,
        },
      ],
    };
  };

  // Calculate basic statistics
  const getBasicStats = () => {
    const firstChoiceSuccess = results.length > 0
      ? Math.round(
          (results.filter((r) => {
            const choice = choices.find((c) => c.id === r.id);
            return (
              choice &&
              choice.selected.length > 0 &&
              choice.selected[0] === r.result
            );
          }).length /
            results.length) *
            100
        )
      : 0;

    const avgFeedback = feedback.length > 0 
      ? (feedback.reduce((sum, f) => sum + f.satisfaction + f.excitement + f.easeOfProcess, 0) / (feedback.length * 3)).toFixed(1)
      : null;

    // Calculate additional insightful stats
    const unassigned = choices.length - results.length;
    
    // Calculate most popular project
    const projectCounts = new Map<string, number>();
    choices.forEach((choice) => {
      choice.selected.forEach((optionId) => {
        projectCounts.set(optionId, (projectCounts.get(optionId) || 0) + 1);
      });
    });
    const mostPopularProject = Array.from(projectCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    const mostPopularProjectName = mostPopularProject 
      ? options.find(o => o.id === mostPopularProject[0])?.title || "Unbekannt"
      : "Keine Daten";
    
    return {
      totalParticipants: choices.length,
      totalProjects: options.length,
      totalAssigned: results.length,
      unassigned,
      firstChoiceSuccess,
      avgFeedback,
      feedbackCount: feedback.length,
      participationRate: choices.length > 0 ? Math.round((results.length / choices.length) * 100) : 0,
      mostPopularProjectName,
      mostPopularProjectVotes: mostPopularProject ? mostPopularProject[1] : 0,
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const stackedBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
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

  const stats = getBasicStats();

  // Get feedback distribution data for charts
  const getFeedbackDistributionData = () => {
    if (feedback.length === 0) return { labels: [], datasets: [] };

    const ratings = ["1", "2", "3", "4", "5"];
    const metrics = ["satisfaction", "excitement", "easeOfProcess"];
    const metricLabels = ["Zufriedenheit", "Vorfreude", "Einfachheit"];
    const colors = ["rgb(76, 175, 80)", "rgb(255, 152, 0)", "rgb(33, 150, 243)"];

    const datasets = metrics.map((metric, index) => {
      const distribution = ratings.map(rating => {
        return feedback.filter(f => f[metric as keyof FeedbackData] === parseInt(rating)).length;
      });

      return {
        label: metricLabels[index],
        data: distribution,
        backgroundColor: colors[index],
        borderColor: colors[index],
        borderWidth: 1,
      };
    });

    return {
      labels: ratings.map(r => `${r} Stern${r !== "1" ? "e" : ""}`),
      datasets,
    };
  };

  // Get average feedback comparison data
  const getFeedbackComparisonData = () => {
    if (feedback.length === 0) return { labels: [], datasets: [] };

    const averages = [
      feedback.reduce((s, f) => s + f.satisfaction, 0) / feedback.length,
      feedback.reduce((s, f) => s + f.excitement, 0) / feedback.length,
      feedback.reduce((s, f) => s + f.easeOfProcess, 0) / feedback.length,
    ];

    return {
      labels: ["Zufriedenheit", "Vorfreude", "Einfachheit"],
      datasets: [
        {
          label: "Durchschnittsbewertung",
          data: averages,
          backgroundColor: ["rgb(76, 175, 80)", "rgb(255, 152, 0)", "rgb(33, 150, 243)"],
          borderColor: ["rgb(76, 175, 80)", "rgb(255, 152, 0)", "rgb(33, 150, 243)"],
          borderWidth: 1,
        },
      ],
    };
  };

  return (
    <div className="mdui-prose">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Statistiken und Auswertung</h2>
        <p style={{ color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>{vote.title}</p>
      </div>

      {/* Key Statistics */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "30px",
      }}>
        {[
          {
            icon: "how_to_vote",
            label: "Teilnehmer",
            value: `${stats.totalParticipants} von ${stats.totalProjects} Projekten`,
            description: "Eingegangene Wahlen"
          },
          {
            icon: "assignment_turned_in",
            label: "Zuteilungsrate",
            value: `${stats.participationRate}%`,
            description: `${stats.totalAssigned} zugewiesen, ${stats.unassigned} offen`
          },
          {
            icon: "thumb_up",
            label: "Erstwunsch-Erfolg",
            value: `${stats.firstChoiceSuccess}%`,
            description: "Erhielten ihr erstes Wahlziel"
          },
          ...(stats.avgFeedback ? [{
            icon: "star",
            label: "Feedback",
            value: `${stats.avgFeedback}/5`,
            description: `${stats.feedbackCount} Antworten (${Math.round((stats.feedbackCount / stats.totalParticipants) * 100)}%)`
          }] : []),
        ].map((stat, index) => (
          <mdui-card key={index} variant="outlined" style={{ padding: "16px", textAlign: "center", minHeight: "120px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <mdui-icon name={stat.icon} style={{ fontSize: "2rem", marginBottom: "8px", color: "rgba(var(--mdui-color-primary), 1)" }}></mdui-icon>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "1.5rem", lineHeight: "1.2" }}>{stat.value}</h3>
            <p style={{ margin: "0 0 4px 0", fontWeight: "500", fontSize: "0.9rem" }}>{stat.label}</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>{stat.description}</p>
          </mdui-card>
        ))}
      </div>

      {/* Main Charts - Consolidated */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
        gap: "16px",
        marginBottom: "30px",
      }}>
        {/* Comprehensive Assignment Analysis */}
        {results.length > 0 && (
          <mdui-card variant="outlined" style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>Zuteilungs-Analyse</h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>
                  Prioritätsverteilung der Zuteilungen
                </p>
              </div>
              <mdui-button-icon 
                icon="download"
                onClick={() => downloadChart(assignmentStatsRef, "zuteilungsanalyse")}
              />
            </div>
            <div ref={assignmentStatsRef} style={{ height: "300px" }}>
              <Pie data={getAssignmentStatsData()} options={pieChartOptions} />
            </div>
          </mdui-card>
        )}

        {/* Project Popularity & Grade Distribution Combined */}
        <mdui-card variant="outlined" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>Klassenstufen-Verteilung</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>
                Teilnehmer nach Jahrgangsstufen
              </p>
            </div>
            <mdui-button-icon 
              icon="download"
              onClick={() => downloadChart(gradeDistributionRef, "teilnahme-uebersicht")}
            />
          </div>
          
          {/* Grade Distribution Chart */}
          <div ref={gradeDistributionRef} style={{ height: "200px", marginBottom: "16px" }}>
            <Bar data={getGradeDistributionData()} options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                legend: { display: false }
              }
            }} />
          </div>

          {/* Most Popular Project Info */}
          {stats.mostPopularProjectVotes > 0 && (
            <div style={{ 
              padding: "12px", 
              backgroundColor: "rgba(var(--mdui-color-primary), 0.05)", 
              borderRadius: "8px",
              border: "1px solid rgba(var(--mdui-color-primary), 0.1)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <mdui-icon name="trending_up" style={{ color: "rgba(var(--mdui-color-primary), 1)", fontSize: "1.2rem" }}></mdui-icon>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "500", fontSize: "0.9rem" }}>Beliebtestes Projekt</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(var(--mdui-color-on-surface), 0.7)" }}>
                    "{stats.mostPopularProjectName}" mit {stats.mostPopularProjectVotes} Wahlen
                  </div>
                </div>
              </div>
            </div>
          )}
        </mdui-card>
      </div>

      {/* Detailed Project Assignment Analysis (Optional) */}
      {results.length > 0 && (
        <mdui-card variant="outlined" style={{ padding: "16px", marginBottom: "20px" }}>
          <mdui-collapse>
            <mdui-collapse-item>
              <mdui-button slot="header" variant="text" icon="analytics" full-width>
                Erweiterte Projekt-Analyse anzeigen
              </mdui-button>
              <div style={{ padding: "16px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>Zuteilungen nach Priorität pro Projekt</h4>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>
                      Zeigt für jedes Projekt, wie viele Schüler es als 1., 2., 3. etc. Priorität erhalten haben
                    </p>
                  </div>
                  <mdui-button-icon 
                    icon="download"
                    onClick={() => downloadChart(choiceAssignmentRef, "projekt-prioritaeten")}
                  />
                </div>
                <div ref={choiceAssignmentRef} style={{ height: "400px" }}>
                  <Bar data={getChoiceAssignmentPerOptionData()} options={stackedBarOptions} />
                </div>
              </div>
            </mdui-collapse-item>
          </mdui-collapse>
        </mdui-card>
      )}

      {/* Detailed Data Table - Standalone */}
      {choices.length > 0 && (
        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Detailübersicht nach Klassenstufen</h3>
          <div className="mdui-table w-100">
            <table>
              <thead>
                <tr>
                  <th>Klasse</th>
                  <th>Teilnehmer</th>
                  <th>Zugeteilt</th>
                  <th>Rate</th>
                  <th>Erstwunsch</th>
                </tr>
              </thead>
              <tbody>
                {getUniqueGrades().map(grade => {
                  const gradeChoices = choices.filter(c => c.grade.toString() === grade);
                  const gradeResults = results.filter(r => 
                    gradeChoices.some(c => c.id === r.id)
                  );
                  const gradeFirstChoiceSuccess = gradeResults.filter(r => {
                    const choice = gradeChoices.find(c => c.id === r.id);
                    return choice && choice.selected.length > 0 && choice.selected[0] === r.result;
                  }).length;
                  
                  return (
                    <tr key={grade}>
                      <td><strong>Klasse {grade}</strong></td>
                      <td>{gradeChoices.length}</td>
                      <td>{gradeResults.length}</td>
                      <td>{gradeChoices.length > 0 ? Math.round((gradeResults.length / gradeChoices.length) * 100) : 0}%</td>
                      <td>{gradeResults.length > 0 ? Math.round((gradeFirstChoiceSuccess / gradeResults.length) * 100) : 0}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feedback Analysis */}
      {feedback.length > 0 && (
        <mdui-card variant="outlined" style={{ padding: "16px", marginBottom: "20px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "4px" }}>Feedback-Auswertung</h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "0.9rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>
            {feedback.length} Antworten von {choices.length} Teilnehmern ({Math.round((feedback.length / choices.length) * 100)}% Rücklaufquote)
          </p>
          
          {/* Combined Feedback Charts */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "16px",
          }}>
            {/* Feedback Comparison Chart */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "1rem" }}>Durchschnittswerte</h4>
                <mdui-button-icon 
                  icon="download"
                  onClick={() => downloadChart(feedbackComparisonRef, "feedback-vergleich")}
                />
              </div>
              <div ref={feedbackComparisonRef} style={{ height: "200px" }}>
                <Bar 
                  data={getFeedbackComparisonData()} 
                  options={{
                    ...chartOptions,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: { stepSize: 1 },
                      },
                    },
                  }} 
                />
              </div>
            </div>

            {/* Feedback Distribution Chart */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "1rem" }}>Bewertungsverteilung</h4>
                <mdui-button-icon 
                  icon="download"
                  onClick={() => downloadChart(feedbackDistributionRef, "feedback-verteilung")}
                />
              </div>
              <div ref={feedbackDistributionRef} style={{ height: "200px" }}>
                <Bar data={getFeedbackDistributionData()} options={{
                  ...chartOptions,
                  plugins: { legend: { display: true, position: 'bottom' as const } }
                }} />
              </div>
            </div>
          </div>
        </mdui-card>
      )}

      {/* Empty State */}
      {choices.length === 0 && (
        <mdui-card variant="outlined" style={{ padding: "40px", textAlign: "center" }}>
          <mdui-icon name="analytics" style={{ fontSize: "4rem", color: "rgba(var(--mdui-color-on-surface), 0.3)", marginBottom: "16px" }}></mdui-icon>
          <h3 style={{ color: "rgba(var(--mdui-color-on-surface), 0.6)", marginBottom: "8px" }}>Noch keine Daten verfügbar</h3>
          <p style={{ color: "rgba(var(--mdui-color-on-surface), 0.4)", margin: 0 }}>
            Es sind noch keine Wahlen eingegangen. Sobald Schüler ihre Wahlen abgeben, werden hier umfassende Statistiken und Auswertungen angezeigt.
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

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
    
    // Calculate average choices per participant
    const avgChoicesPerParticipant = choices.length > 0 
      ? (choices.reduce((sum, c) => sum + c.selected.filter(s => s !== "null").length, 0) / choices.length).toFixed(1)
      : "0";

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
      avgChoicesPerParticipant,
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

  return (
    <div className="mdui-prose">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Statistiken und Auswertung</h2>
        <p style={{ color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>{vote.title}</p>
      </div>

      {/* Key Statistics */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "16px",
        marginBottom: "30px",
      }}>
        {[
          {
            icon: "how_to_vote",
            label: "Gesamte Teilnehmer",
            value: stats.totalParticipants,
            description: "Anzahl eingegangener Wahlen"
          },
          {
            icon: "assignment",
            label: "Verfügbare Projekte",
            value: stats.totalProjects,
            description: "Zur Auswahl stehende Projekte"
          },
          {
            icon: "assignment_turned_in",
            label: "Zugewiesene Schüler",
            value: stats.totalAssigned,
            description: "Bereits einem Projekt zugewiesen"
          },
          {
            icon: "trending_up",
            label: "Zuteilungsrate",
            value: `${stats.participationRate}%`,
            description: "Anteil der zugewiesenen Teilnehmer"
          },
          {
            icon: "thumb_up",
            label: "Erstwunsch-Erfolg",
            value: `${stats.firstChoiceSuccess}%`,
            description: "Erhielten ihr erstes Wahlziel"
          },
          ...(stats.unassigned > 0 ? [{
            icon: "pending",
            label: "Nicht zugeteilt",
            value: stats.unassigned,
            description: "Noch ohne Projekt-Zuteilung"
          }] : []),
          ...(stats.mostPopularProjectVotes > 0 ? [{
            icon: "trending_up",
            label: "Beliebtestes Projekt",
            value: stats.mostPopularProjectVotes,
            description: `${stats.mostPopularProjectName.length > 20 ? stats.mostPopularProjectName.substring(0, 20) + "..." : stats.mostPopularProjectName}`
          }] : []),
          ...(stats.totalParticipants > 0 ? [{
            icon: "list",
            label: "⌀ Wahlen pro Person",
            value: stats.avgChoicesPerParticipant,
            description: "Durchschnittlich gewählte Projekte"
          }] : []),
          ...(stats.avgFeedback ? [{
            icon: "star",
            label: "Durchschnittsbewertung",
            value: `${stats.avgFeedback}/5`,
            description: `Basierend auf ${stats.feedbackCount} Antworten`
          }] : []),
        ].map((stat, index) => (
          <mdui-card key={index} variant="outlined" style={{ padding: "16px", textAlign: "center", minHeight: "140px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <mdui-icon name={stat.icon} style={{ fontSize: "2rem", marginBottom: "8px", color: "rgba(var(--mdui-color-primary), 1)" }}></mdui-icon>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "1.5rem", lineHeight: "1.2" }}>{stat.value}</h3>
            <p style={{ margin: "0 0 4px 0", fontWeight: "500", fontSize: "0.9rem" }}>{stat.label}</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>{stat.description}</p>
          </mdui-card>
        ))}
      </div>

      {/* Main Charts */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "16px",
        marginBottom: "30px",
      }}>
        {/* Choice Assignment Breakdown (Stacked Bar) */}
        {results.length > 0 && (
          <mdui-card variant="outlined" style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>Zuteilungen nach Priorität</h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>
                  Zeigt für jedes Projekt, wie viele Schüler es als 1., 2., 3. etc. Priorität erhalten haben
                </p>
              </div>
              <mdui-button-icon 
                icon="download"
                onClick={() => downloadChart(choiceAssignmentRef, "zuteilungen-nach-prioritaet")}
              />
            </div>
            <div ref={choiceAssignmentRef} style={{ height: "350px" }}>
              <Bar data={getChoiceAssignmentPerOptionData()} options={stackedBarOptions} />
            </div>
          </mdui-card>
        )}

        {/* Assignment Distribution Pie */}
        {results.length > 0 && (
          <mdui-card variant="outlined" style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>Gesamtverteilung der Zuteilungen</h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>
                  Übersicht über alle Prioritäts-Zuteilungen
                </p>
              </div>
              <mdui-button-icon 
                icon="download"
                onClick={() => downloadChart(assignmentStatsRef, "zuteilungsverteilung")}
              />
            </div>
            <div ref={assignmentStatsRef} style={{ height: "350px" }}>
              <Pie data={getAssignmentStatsData()} options={pieChartOptions} />
            </div>
          </mdui-card>
        )}
      </div>

      {/* Secondary Charts */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "16px",
        marginBottom: "30px",
      }}>
        {/* Grade Distribution */}
        <mdui-card variant="outlined" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>Teilnahme nach Klassenstufen</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>
                Verteilung der Teilnehmer auf Klassenstufen
              </p>
            </div>
            <mdui-button-icon 
              icon="download"
              onClick={() => downloadChart(gradeDistributionRef, "klassenverteilung")}
            />
          </div>
          <div ref={gradeDistributionRef} style={{ height: "280px" }}>
            <Bar data={getGradeDistributionData()} options={chartOptions} />
          </div>
        </mdui-card>

        {/* Project Popularity */}
        <mdui-card variant="outlined" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>Beliebteste Projekte</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>
                Top 10 Projekte nach Gesamtzahl der Wahlen
              </p>
            </div>
            <mdui-button-icon 
              icon="download"
              onClick={() => downloadChart(projectPopularityRef, "projektbeliebtheit")}
            />
          </div>
          <div ref={projectPopularityRef} style={{ height: "280px" }}>
            <Bar data={getProjectPopularityData()} options={chartOptions} />
          </div>
        </mdui-card>

        {/* Submissions Timeline */}
        <mdui-card variant="outlined" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>Teilnahme-Verlauf</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>
                Zeitlicher Verlauf der eingegangenen Wahlen
              </p>
            </div>
            <mdui-button-icon 
              icon="download"
              onClick={() => downloadChart(submissionsTimelineRef, "teilnahme-verlauf")}
            />
          </div>
          <div ref={submissionsTimelineRef} style={{ height: "280px" }}>
            <Line data={getSubmissionsTimelineData()} options={chartOptions} />
          </div>
        </mdui-card>
      </div>

      {/* Detailed Data Table */}
      {choices.length > 0 && (
        <mdui-card variant="outlined" style={{ padding: "16px", marginBottom: "20px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Detailübersicht nach Klassenstufen</h3>
          <div style={{ 
            overflowX: "auto", 
            maxWidth: "100%",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin"
          }}>
            <table className="mdui-table" style={{ minWidth: "600px", width: "100%" }}>
              <thead>
                <tr>
                  <th>Klassenstufe</th>
                  <th>Anzahl Teilnehmer</th>
                  <th>Zugeteilte Schüler</th>
                  <th>Zuteilungsrate</th>
                  <th>Erstwunsch-Erfolg</th>
                  {feedback.length > 0 && <th>Weitere Daten</th>}
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
                  const gradeFeedback = feedback; // Use all feedback since we no longer correlate by timestamp
                  
                  return (
                    <tr key={grade}>
                      <td><strong>Klasse {grade}</strong></td>
                      <td>{gradeChoices.length}</td>
                      <td>{gradeResults.length}</td>
                      <td>{gradeChoices.length > 0 ? Math.round((gradeResults.length / gradeChoices.length) * 100) : 0}%</td>
                      <td>{gradeResults.length > 0 ? Math.round((gradeFirstChoiceSuccess / gradeResults.length) * 100) : 0}%</td>
                      {feedback.length > 0 && (
                        <td>-</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </mdui-card>
      )}

      {/* Feedback Analysis */}
      {feedback.length > 0 && (
        <mdui-card variant="outlined" style={{ padding: "16px", marginBottom: "20px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Feedback-Auswertung</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}>
            {[
              { 
                key: "satisfaction", 
                label: "Zufriedenheit mit den Optionen", 
                value: (feedback.reduce((s, f) => s + f.satisfaction, 0) / feedback.length).toFixed(1),
                icon: "sentiment_satisfied"
              },
              { 
                key: "excitement", 
                label: "Vorfreude auf die Projekte", 
                value: (feedback.reduce((s, f) => s + f.excitement, 0) / feedback.length).toFixed(1),
                icon: "celebration"
              },
              { 
                key: "easeOfProcess", 
                label: "Einfachheit des Wahlprozesses", 
                value: (feedback.reduce((s, f) => s + f.easeOfProcess, 0) / feedback.length).toFixed(1),
                icon: "thumb_up"
              },
            ].map(metric => (
              <div key={metric.key} style={{ 
                textAlign: "center", 
                padding: "20px", 
                backgroundColor: "rgba(var(--mdui-color-surface-variant), 0.1)", 
                borderRadius: "8px",
                border: "1px solid rgba(var(--mdui-color-outline), 0.2)"
              }}>
                <mdui-icon name={metric.icon} style={{ fontSize: "2rem", marginBottom: "8px", color: "rgba(var(--mdui-color-primary), 1)" }}></mdui-icon>
                <h4 style={{ margin: "0 0 8px 0" }}>{metric.label}</h4>
                <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "500" }}>{metric.value}/5</p>
              </div>
            ))}
          </div>
          <p style={{ color: "rgba(var(--mdui-color-on-surface), 0.6)", margin: 0, textAlign: "center" }}>
            Basierend auf {feedback.length} Feedback-Antworten 
            ({Math.round((feedback.length / choices.length) * 100)}% Rücklaufquote der Teilnehmer)
          </p>
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

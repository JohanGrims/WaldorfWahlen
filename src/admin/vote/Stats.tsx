import React, { useRef, useState, useEffect } from "react";
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
  TimeScale,
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
import "chartjs-adapter-date-fns";

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
  LineElement,
  TimeScale
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
  const [timeGrouping, setTimeGrouping] = useState<"hour" | "day" | "week">(
    "day"
  );

  // Refs for downloading charts
  const submissionsTimelineRef = useRef<HTMLDivElement>(null);
  const gradeDistributionRef = useRef<HTMLDivElement>(null);
  const projectPopularityRef = useRef<HTMLDivElement>(null);
  const assignmentStatsRef = useRef<HTMLDivElement>(null);
  const firstChoiceSuccessRef = useRef<HTMLDivElement>(null);
  const choiceAssignmentPerOptionRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

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

  // Handle time grouping change with individual button clicks
  const handleTimeGroupingChange = (newValue: "hour" | "day" | "week") => {
    setTimeGrouping(newValue);
  };

  // Submissions over time data
  const getSubmissionsTimelineData = () => {
    if (choices.length === 0) return { labels: [], datasets: [] };

    let filteredChoices = choices;

    // Filter choices based on time grouping
    if (timeGrouping === "hour") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      filteredChoices = choices.filter(
        (choice) => new Date(choice.timestamp.seconds * 1000) >= oneHourAgo
      );
    }

    const timeGroups = new Map<string, number>();

    filteredChoices.forEach((choice) => {
      const date = new Date(choice.timestamp.seconds * 1000);
      let key: string;

      switch (timeGrouping) {
        case "hour":
          // Group by 5-minute intervals for the last hour
          const minutes = Math.floor(date.getMinutes() / 5) * 5;
          const roundedDate = new Date(date);
          roundedDate.setMinutes(minutes, 0, 0);
          key = roundedDate.toISOString();
          break;
        case "day":
          key = date.toISOString().slice(0, 10);
          break;
        case "week":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
      }

      timeGroups.set(key, (timeGroups.get(key) || 0) + 1);
    });

    const sortedEntries = Array.from(timeGroups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    return {
      labels: sortedEntries.map(([key]) => {
        const date = new Date(key);
        switch (timeGrouping) {
          case "hour":
            return date.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            });
          case "day":
            return date.toLocaleDateString("de-DE");
          case "week":
            return `Woche vom ${date.toLocaleDateString("de-DE")}`;
        }
      }),
      datasets: [
        {
          label: "Abgaben",
          data: sortedEntries.map(([, count]) => count),
          backgroundColor: "#f89e24",
          borderColor: "#f89e24",
          borderWidth: 2,
          fill: false,
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
          label: "Anzahl Schüler",
          data: sortedGrades.map(([, count]) => count),
          backgroundColor: "#4ecdc4",
          borderColor: "#4ecdc4",
          borderWidth: 1,
        },
      ],
    };
  };

  // Project popularity (how often each project was selected by choice priority)
  const getProjectPopularityData = () => {
    // Initialize data structure for each option
    const projectChoiceStats = new Map<string, number[]>();

    options.forEach((option) => {
      projectChoiceStats.set(option.id, new Array(vote.selectCount).fill(0));
    });

    // Count how often each project was selected at each choice level
    choices.forEach((choice) => {
      choice.selected.forEach((optionId, index) => {
        if (index < vote.selectCount) {
          const stats = projectChoiceStats.get(optionId);
          if (stats) {
            stats[index]++;
          }
        }
      });
    });

    // Filter out options with no selections and sort by total popularity
    const optionsWithSelections = Array.from(projectChoiceStats.entries())
      .filter(([, stats]) => stats.some((count) => count > 0))
      .sort((a, b) => {
        const sumA = a[1].reduce((sum, count) => sum + count, 0);
        const sumB = b[1].reduce((sum, count) => sum + count, 0);
        return sumB - sumA;
      });

    const labels = optionsWithSelections.map(([optionId]) => {
      const option = options.find((o) => o.id === optionId);
      return option ? option.title : optionId;
    });

    const datasets = [];
    const colors = [
      "#2ecc71",
      "#f39c12",
      "#e74c3c",
      "#9b59b6",
      "#1abc9c",
      "#34495e",
      "#95a5a6",
      "#e67e22",
    ];

    for (let i = 0; i < vote.selectCount; i++) {
      datasets.push({
        label: `${i + 1}. Wahl`,
        data: optionsWithSelections.map(([, stats]) => stats[i]),
        backgroundColor: colors[i % colors.length],
        borderColor: colors[i % colors.length],
        borderWidth: 1,
      });
    }

    return {
      labels,
      datasets,
    };
  };

  // Assignment stats (how many got their 1st, 2nd, etc. choice)
  const getAssignmentStatsData = () => {
    const assignmentCounts = new Array(vote.selectCount + 1).fill(0);

    results.forEach((result) => {
      // Find the corresponding choice using the result ID
      const choice = choices.find((c) => c.id === result.id);
      if (choice && result.result) {
        const choiceIndex = choice.selected.findIndex(
          (selected) => selected === result.result
        );
        if (choiceIndex !== -1 && choiceIndex < vote.selectCount) {
          assignmentCounts[choiceIndex]++;
        } else {
          assignmentCounts[assignmentCounts.length - 1]++; // Not in their choices
        }
      } else {
        assignmentCounts[assignmentCounts.length - 1]++; // Not assigned
      }
    });

    const labels = [
      ...Array.from({ length: vote.selectCount }, (_, i) => `${i + 1}. Wahl`),
      "Nicht zugeteilt/Andere",
    ];

    return {
      labels,
      datasets: [
        {
          data: assignmentCounts,
          backgroundColor: [
            "#2ecc71",
            "#f39c12",
            "#e74c3c",
            "#9b59b6",
            "#1abc9c",
            "#34495e",
            "#95a5a6",
            "#e67e22",
          ],
        },
      ],
    };
  };

  // Choice assignments per option (how many 1st, 2nd, ... choices are assigned per option)
  const getChoiceAssignmentPerOptionData = () => {
    // Initialize data structure for each option
    const optionChoiceStats = new Map<string, number[]>();

    options.forEach((option) => {
      optionChoiceStats.set(option.id, new Array(vote.selectCount).fill(0));
    });

    // Count assignments for each choice level
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

    // Filter out options with no assignments
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
      "#2ecc71",
      "#f39c12",
      "#e74c3c",
      "#9b59b6",
      "#1abc9c",
      "#34495e",
      "#95a5a6",
      "#e67e22",
    ];

    for (let i = 0; i < vote.selectCount; i++) {
      datasets.push({
        label: `${i + 1}. Wahl`,
        data: optionsWithAssignments.map(([, stats]) => stats[i]),
        backgroundColor: colors[i % colors.length],
        borderColor: colors[i % colors.length],
        borderWidth: 1,
      });
    }

    return {
      labels,
      datasets,
    };
  };

  // First choice success rate by grade
  const getFirstChoiceSuccessData = () => {
    const grades = new Set(choices.map((c) => Number(c.grade)));
    const gradeStats = new Map<
      number,
      { total: number; firstChoice: number }
    >();

    // Initialize grade stats
    grades.forEach((grade) => {
      gradeStats.set(grade, { total: 0, firstChoice: 0 });
    });

    // Count assignments
    results.forEach((result) => {
      const choice = choices.find((c) => c.id === result.id);
      if (choice) {
        const grade = Number(choice.grade);
        const stats = gradeStats.get(grade);
        if (stats) {
          stats.total++;

          if (
            choice.selected.length > 0 &&
            choice.selected[0] === result.result
          ) {
            stats.firstChoice++;
          }
        }
      }
    });

    const sortedGrades = Array.from(gradeStats.entries()).sort(
      (a, b) => a[0] - b[0]
    );

    return {
      labels: sortedGrades.map(([grade]) => `Klasse ${grade}`),
      datasets: [
        {
          label: "Erstwunsch-Erfolgsrate (%)",
          data: sortedGrades.map(([, stats]) =>
            stats.total > 0
              ? Math.round((stats.firstChoice / stats.total) * 100)
              : 0
          ),
          backgroundColor: "#2ecc71",
          borderColor: "#2ecc71",
          borderWidth: 1,
        },
      ],
    };
  };

  // Chart options
  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
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
    elements: {
      line: {
        tension: 0.4, // Makes the curve smoother
      },
      point: {
        radius: 4,
        hoverRadius: 6,
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
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

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "right" as const,
      },
      title: {
        display: false,
      },
    },
  };

  const horizontalBarOptions = {
    responsive: true,
    indexAxis: "y" as const,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const stackedBarOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
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

  // Feedback statistics
  const getFeedbackStatsData = () => {
    if (feedback.length === 0) return null;

    const avgSatisfaction = feedback.reduce((sum, f) => sum + f.satisfaction, 0) / feedback.length;
    const avgExcitement = feedback.reduce((sum, f) => sum + f.excitement, 0) / feedback.length;
    const avgEaseOfProcess = feedback.reduce((sum, f) => sum + f.easeOfProcess, 0) / feedback.length;

    return {
      averages: {
        satisfaction: Number(avgSatisfaction.toFixed(1)),
        excitement: Number(avgExcitement.toFixed(1)),
        easeOfProcess: Number(avgEaseOfProcess.toFixed(1)),
      },
      counts: {
        total: feedback.length,
        satisfaction: [1, 2, 3, 4, 5].map(rating => 
          feedback.filter(f => f.satisfaction === rating).length
        ),
        excitement: [1, 2, 3, 4, 5].map(rating => 
          feedback.filter(f => f.excitement === rating).length
        ),
        easeOfProcess: [1, 2, 3, 4, 5].map(rating => 
          feedback.filter(f => f.easeOfProcess === rating).length
        ),
      }
    };
  };

  const getFeedbackChartData = (type: 'satisfaction' | 'excitement' | 'easeOfProcess') => {
    const stats = getFeedbackStatsData();
    if (!stats) return { labels: [], datasets: [] };

    return {
      labels: ['1⭐', '2⭐', '3⭐', '4⭐', '5⭐'],
      datasets: [
        {
          label: 'Anzahl Bewertungen',
          data: stats.counts[type],
          backgroundColor: [
            'rgba(244, 67, 54, 0.8)',   // Red for 1
            'rgba(255, 152, 0, 0.8)',   // Orange for 2  
            'rgba(255, 235, 59, 0.8)',  // Yellow for 3
            'rgba(139, 195, 74, 0.8)',  // Light Green for 4
            'rgba(76, 175, 80, 0.8)',   // Green for 5
          ],
          borderColor: [
            'rgba(244, 67, 54, 1)',
            'rgba(255, 152, 0, 1)',
            'rgba(255, 235, 59, 1)',
            'rgba(139, 195, 74, 1)',
            'rgba(76, 175, 80, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  return (
    <div className="mdui-prose" style={{ maxWidth: "none" }}>
      <h2>Statistiken</h2>

      <div
        style={{
          display: "grid",
          gap: "2rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
        }}
      >
        {/* Submissions Timeline */}
        <div
          ref={submissionsTimelineRef}
          style={{
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ margin: 0 }}>Abgaben über Zeit</h3>
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.25rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <mdui-button
                  variant={timeGrouping === "hour" ? "filled" : "text"}
                  onClick={() => handleTimeGroupingChange("hour")}
                  style={{ borderRadius: "0" }}
                >
                  Stunde
                </mdui-button>
                <mdui-button
                  variant={timeGrouping === "day" ? "filled" : "text"}
                  onClick={() => handleTimeGroupingChange("day")}
                  style={{ borderRadius: "0" }}
                >
                  Tag
                </mdui-button>
                <mdui-button
                  variant={timeGrouping === "week" ? "filled" : "text"}
                  onClick={() => handleTimeGroupingChange("week")}
                  style={{ borderRadius: "0" }}
                >
                  Woche
                </mdui-button>
              </div>
              <mdui-button
                variant="outlined"
                icon="download"
                onClick={() =>
                  downloadChart(submissionsTimelineRef, "abgaben-timeline")
                }
              >
                Download
              </mdui-button>
            </div>
          </div>
          <Line
            data={getSubmissionsTimelineData()}
            options={lineChartOptions}
          />
        </div>

        {/* Grade Distribution */}
        <div
          ref={gradeDistributionRef}
          style={{
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ margin: 0 }}>Verteilung nach Klassen</h3>
            <mdui-button
              variant="outlined"
              icon="download"
              onClick={() =>
                downloadChart(gradeDistributionRef, "klassen-verteilung")
              }
            >
              Download
            </mdui-button>
          </div>
          <Bar data={getGradeDistributionData()} options={barChartOptions} />
        </div>

        {/* Project Popularity */}
        <div
          ref={projectPopularityRef}
          style={{
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ margin: 0 }}>Projektbeliebtheit</h3>
            <mdui-button
              variant="outlined"
              icon="download"
              onClick={() =>
                downloadChart(projectPopularityRef, "projekt-beliebtheit")
              }
            >
              Download
            </mdui-button>
          </div>
          <Bar data={getProjectPopularityData()} options={stackedBarOptions} />
        </div>

        {/* Assignment Stats */}
        {results.length > 0 && (
          <div
            ref={assignmentStatsRef}
            style={{
              padding: "1rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ margin: 0 }}>Zuteilungsergebnisse</h3>
              <mdui-button
                variant="outlined"
                icon="download"
                onClick={() =>
                  downloadChart(assignmentStatsRef, "zuteilungsergebnisse")
                }
              >
                Download
              </mdui-button>
            </div>
            <Pie data={getAssignmentStatsData()} options={pieChartOptions} />
          </div>
        )}

        {/* First Choice Success Rate by Grade */}
        {results.length > 0 && (
          <div
            ref={firstChoiceSuccessRef}
            style={{
              padding: "1rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ margin: 0 }}>Erstwunsch nach Klasse</h3>
              <mdui-button
                variant="outlined"
                icon="download"
                onClick={() =>
                  downloadChart(firstChoiceSuccessRef, "erstwunsch-erfolg")
                }
              >
                Download
              </mdui-button>
            </div>
            <Bar data={getFirstChoiceSuccessData()} options={barChartOptions} />
          </div>
        )}

        {/* Choice Assignment Per Option */}
        {results.length > 0 && (
          <div
            ref={choiceAssignmentPerOptionRef}
            style={{
              padding: "1rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ margin: 0 }}>Zufriedenheit nach Projekt</h3>
              <mdui-button
                variant="outlined"
                icon="download"
                onClick={() =>
                  downloadChart(
                    choiceAssignmentPerOptionRef,
                    "wahlprioritat-pro-projekt"
                  )
                }
              >
                Download
              </mdui-button>
            </div>
            <Bar
              data={getChoiceAssignmentPerOptionData()}
              options={stackedBarOptions}
            />
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <h3>Zusammenfassung</h3>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <mdui-card
            variant="filled"
            style={{ padding: "1rem", textAlign: "center" }}
          >
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#f89e24" }}>
              {choices.length}
            </h4>
            <p style={{ margin: 0 }}>Gesamte Abgaben</p>
          </mdui-card>

          <mdui-card
            variant="filled"
            style={{ padding: "1rem", textAlign: "center" }}
          >
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#f89e24" }}>
              {options.length}
            </h4>
            <p style={{ margin: 0 }}>Gesamte Projekte</p>
          </mdui-card>

          <mdui-card
            variant="filled"
            style={{ padding: "1rem", textAlign: "center" }}
          >
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#f89e24" }}>
              {results.length}
            </h4>
            <p style={{ margin: 0 }}>Zugeteilte Schüler</p>
          </mdui-card>

          <mdui-card
            variant="filled"
            style={{ padding: "1rem", textAlign: "center" }}
          >
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#f89e24" }}>
              {results.length > 0
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
                : 0}
              %
            </h4>
            <p style={{ margin: 0 }}>Erstwunsch erhalten</p>
          </mdui-card>
        </div>
      </div>

      {/* Feedback Statistics */}
      {feedback.length > 0 && (
        <>
          <h2 style={{ marginTop: "3rem" }}>Schüler-Feedback</h2>
          <div
            style={{
              display: "grid",
              gap: "2rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              marginBottom: "2rem",
            }}
          >
            {/* Satisfaction */}
            <div
              ref={feedbackRef}
              style={{
                padding: "1rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h3 style={{ margin: 0 }}>Zufriedenheit mit Optionen</h3>
                <mdui-button
                  variant="outlined"
                  icon="download"
                  onClick={() =>
                    downloadChart(feedbackRef, "feedback-zufriedenheit")
                  }
                >
                  Download
                </mdui-button>
              </div>
              <p style={{ textAlign: "center", fontSize: "1.2em", margin: "0.5rem 0" }}>
                ⭐ Durchschnitt: <strong>{getFeedbackStatsData()?.averages.satisfaction || 0}/5</strong>
              </p>
              <Bar
                data={getFeedbackChartData('satisfaction')}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    title: {
                      display: false,
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
                }}
              />
            </div>

            {/* Excitement */}
            <div
              style={{
                padding: "1rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <h3 style={{ margin: "0 0 1rem 0" }}>Vorfreude auf Projekte</h3>
              <p style={{ textAlign: "center", fontSize: "1.2em", margin: "0.5rem 0" }}>
                🎉 Durchschnitt: <strong>{getFeedbackStatsData()?.averages.excitement || 0}/5</strong>
              </p>
              <Bar
                data={getFeedbackChartData('excitement')}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    title: {
                      display: false,
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
                }}
              />
            </div>

            {/* Ease of Process */}
            <div
              style={{
                padding: "1rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <h3 style={{ margin: "0 0 1rem 0" }}>Einfachheit des Wahlprozesses</h3>
              <p style={{ textAlign: "center", fontSize: "1.2em", margin: "0.5rem 0" }}>
                👍 Durchschnitt: <strong>{getFeedbackStatsData()?.averages.easeOfProcess || 0}/5</strong>
              </p>
              <Bar
                data={getFeedbackChartData('easeOfProcess')}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    title: {
                      display: false,
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
                }}
              />
            </div>
          </div>

          {/* Feedback Summary */}
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              marginBottom: "2rem",
            }}
          >
            <mdui-card
              variant="outlined"
              style={{ padding: "1rem", textAlign: "center" }}
            >
              <h4 style={{ margin: 0, color: "var(--mdui-color-primary)" }}>
                {feedback.length}
              </h4>
              <p style={{ margin: 0 }}>Feedback-Antworten</p>
            </mdui-card>
            <mdui-card
              variant="outlined"
              style={{ padding: "1rem", textAlign: "center" }}
            >
              <h4 style={{ margin: 0, color: "var(--mdui-color-primary)" }}>
                {Math.round((feedback.length / choices.length) * 100)}%
              </h4>
              <p style={{ margin: 0 }}>Rücklaufquote</p>
            </mdui-card>
          </div>
        </>
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

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
  RadialLinearScale,
} from "chart.js";
import { Bar, Pie, Line, Doughnut, Radar } from "react-chartjs-2";
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
  TimeScale,
  RadialLinearScale
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
  const [selectedMetric, setSelectedMetric] = useState<"overview" | "detailed" | "feedback">("overview");

  // Refs for downloading charts
  const overviewRef = useRef<HTMLDivElement>(null);
  const submissionsTimelineRef = useRef<HTMLDivElement>(null);
  const gradeDistributionRef = useRef<HTMLDivElement>(null);
  const projectPopularityRef = useRef<HTMLDivElement>(null);
  const assignmentStatsRef = useRef<HTMLDivElement>(null);
  const firstChoiceSuccessRef = useRef<HTMLDivElement>(null);
  const choiceAssignmentPerOptionRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const satisfactionTrendRef = useRef<HTMLDivElement>(null);

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



  // Enhanced feedback statistics with trends
  const getEnhancedFeedbackStats = () => {
    if (feedback.length === 0) return null;

    const avgSatisfaction = feedback.reduce((sum, f) => sum + f.satisfaction, 0) / feedback.length;
    const avgExcitement = feedback.reduce((sum, f) => sum + f.excitement, 0) / feedback.length;
    const avgEaseOfProcess = feedback.reduce((sum, f) => sum + f.easeOfProcess, 0) / feedback.length;

    // Calculate response rate by grade
    const gradeResponseRates = new Map<number, { responses: number; total: number }>();
    choices.forEach((choice) => {
      const grade = Number(choice.grade);
      if (!gradeResponseRates.has(grade)) {
        gradeResponseRates.set(grade, { responses: 0, total: 0 });
      }
      gradeResponseRates.get(grade)!.total++;
    });

    feedback.forEach((fb) => {
      // Find the choice corresponding to this feedback based on timestamp correlation
      const matchingChoice = choices.find(choice => 
        Math.abs(choice.timestamp.seconds - fb.timestamp.seconds) < 300 // 5 minutes tolerance
      );
      if (matchingChoice) {
        const grade = Number(matchingChoice.grade);
        if (gradeResponseRates.has(grade)) {
          gradeResponseRates.get(grade)!.responses++;
        }
      }
    });

    return {
      averages: {
        satisfaction: Number(avgSatisfaction.toFixed(1)),
        excitement: Number(avgExcitement.toFixed(1)),
        easeOfProcess: Number(avgEaseOfProcess.toFixed(1)),
        overall: Number(((avgSatisfaction + avgExcitement + avgEaseOfProcess) / 3).toFixed(1)),
      },
      responseRate: Math.round((feedback.length / choices.length) * 100),
      gradeResponseRates: Array.from(gradeResponseRates.entries()).map(([grade, data]) => ({
        grade,
        rate: data.total > 0 ? Math.round((data.responses / data.total) * 100) : 0,
        responses: data.responses,
        total: data.total,
      })),
      distribution: {
        satisfaction: [1, 2, 3, 4, 5].map(rating => 
          feedback.filter(f => f.satisfaction === rating).length
        ),
        excitement: [1, 2, 3, 4, 5].map(rating => 
          feedback.filter(f => f.excitement === rating).length
        ),
        easeOfProcess: [1, 2, 3, 4, 5].map(rating => 
          feedback.filter(f => f.easeOfProcess === rating).length
        ),
      },
      totalResponses: feedback.length,
    };
  };

  // Calculate engagement metrics
  const getEngagementMetrics = () => {
    const totalStudents = choices.length;
    const submissionTimespan = choices.length > 0 ? 
      Math.max(...choices.map(c => c.timestamp.seconds)) - Math.min(...choices.map(c => c.timestamp.seconds)) : 0;
    
    const averageSelections = choices.reduce((sum, choice) => sum + choice.selected.length, 0) / choices.length;
    const maxSelectionsUsed = Math.max(...choices.map(choice => choice.selected.length));
    
    const gradeParticipation = new Map<number, number>();
    choices.forEach(choice => {
      const grade = Number(choice.grade);
      gradeParticipation.set(grade, (gradeParticipation.get(grade) || 0) + 1);
    });

    return {
      totalParticipants: totalStudents,
      submissionTimespan: Math.round(submissionTimespan / 3600), // Convert to hours
      averageSelections: Number(averageSelections.toFixed(1)),
      maxSelectionsUsed,
      selectionUtilization: Math.round((averageSelections / vote.selectCount) * 100),
      gradeParticipation: Array.from(gradeParticipation.entries()).map(([grade, count]) => ({
        grade,
        count,
        percentage: Math.round((count / totalStudents) * 100)
      })).sort((a, b) => a.grade - b.grade),
    };
  };

  // Enhanced project insights
  const getProjectInsights = () => {
    const projectStats = new Map<string, {
      title: string;
      teacher: string;
      totalSelections: number;
      assignments: number;
      choiceBreakdown: number[];
      satisfactionIndex: number;
    }>();

    // Initialize project stats
    options.forEach(option => {
      projectStats.set(option.id, {
        title: option.title,
        teacher: option.teacher,
        totalSelections: 0,
        assignments: 0,
        choiceBreakdown: new Array(vote.selectCount).fill(0),
        satisfactionIndex: 0,
      });
    });

    // Count selections by choice priority
    choices.forEach(choice => {
      choice.selected.forEach((optionId, index) => {
        const stats = projectStats.get(optionId);
        if (stats && index < vote.selectCount) {
          stats.totalSelections++;
          stats.choiceBreakdown[index]++;
        }
      });
    });

    // Count actual assignments
    results.forEach(result => {
      if (result.result) {
        const stats = projectStats.get(result.result);
        if (stats) {
          stats.assignments++;
        }
      }
    });

    // Calculate satisfaction index (weighted by choice priority)
    projectStats.forEach((stats, projectId) => {
      let weightedScore = 0;
      let totalWeight = 0;
      stats.choiceBreakdown.forEach((count, index) => {
        const weight = vote.selectCount - index; // First choice gets highest weight
        weightedScore += count * weight;
        totalWeight += weight * count;
      });
      stats.satisfactionIndex = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 20) : 0; // Scale to 0-100
    });

    return Array.from(projectStats.entries())
      .map(([id, stats]) => ({ id, ...stats }))
      .filter(project => project.totalSelections > 0)
      .sort((a, b) => b.satisfactionIndex - a.satisfactionIndex);
  };

  const getFeedbackChartData = (type: 'satisfaction' | 'excitement' | 'easeOfProcess') => {
    const stats = getEnhancedFeedbackStats();
    if (!stats) return { labels: [], datasets: [] };

    return {
      labels: ['1', '2', '3', '4', '5'],
      datasets: [
        {
          label: 'Anzahl Bewertungen',
          data: stats.distribution[type],
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
          borderWidth: 2,
        },
      ],
    };
  };

  // Get feedback radar chart data
  const getFeedbackRadarData = () => {
    const stats = getEnhancedFeedbackStats();
    if (!stats) return { labels: [], datasets: [] };

    return {
      labels: ['Zufriedenheit', 'Vorfreude', 'Einfachheit'],
      datasets: [
        {
          label: 'Durchschnittsbewertung',
          data: [stats.averages.satisfaction, stats.averages.excitement, stats.averages.easeOfProcess],
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(76, 175, 80, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(76, 175, 80, 1)',
        },
      ],
    };
  };

  // Enhanced chart options
  const modernChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        cornerRadius: 8,
        titleColor: '#fff',
        bodyColor: '#fff',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: '#666',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        ticks: {
          color: '#666',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1,
          color: '#666',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return (
    <div className="stats-dashboard" style={{ 
      fontFamily: 'Roboto, Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      padding: '1rem'
    }}>
      {/* Header Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: '600',
              color: '#1976d2',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <mdui-icon name="analytics"></mdui-icon>
              Wahl-Statistiken
            </h1>
            <p style={{
              margin: '0.5rem 0 0 0',
              color: '#666',
              fontSize: '1.1rem',
            }}>
              {vote.title}
            </p>
          </div>
          
          {/* Navigation Tabs */}
          <mdui-segmented-button-group style={{ margin: 0 }}>
            <mdui-segmented-button 
              icon="dashboard"
              selected={selectedMetric === "overview"}
              onClick={() => setSelectedMetric("overview")}
            >
              Übersicht
            </mdui-segmented-button>
            <mdui-segmented-button 
              icon="bar_chart"
              selected={selectedMetric === "detailed"}
              onClick={() => setSelectedMetric("detailed")}
            >
              Details
            </mdui-segmented-button>
            <mdui-segmented-button 
              icon="feedback"
              selected={selectedMetric === "feedback"}
              onClick={() => setSelectedMetric("feedback")}
            >
              Feedback
            </mdui-segmented-button>
          </mdui-segmented-button-group>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {selectedMetric === "overview" && (
        <>
          {/* KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            <mdui-card variant="elevated" style={{
              padding: '1.5rem',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}>
              <mdui-icon name="how_to_vote" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}></mdui-icon>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '2.5rem', fontWeight: '700' }}>
                {choices.length}
              </h2>
              <p style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Teilnehmer</p>
            </mdui-card>

            <mdui-card variant="elevated" style={{
              padding: '1.5rem',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
            }}>
              <mdui-icon name="assignment" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}></mdui-icon>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '2.5rem', fontWeight: '700' }}>
                {options.length}
              </h2>
              <p style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Projekte</p>
            </mdui-card>

            <mdui-card variant="elevated" style={{
              padding: '1.5rem',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
            }}>
              <mdui-icon name="assignment_turned_in" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}></mdui-icon>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '2.5rem', fontWeight: '700' }}>
                {results.length}
              </h2>
              <p style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Zugeteilte</p>
            </mdui-card>

            <mdui-card variant="elevated" style={{
              padding: '1.5rem',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
            }}>
              <mdui-icon name="thumb_up" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}></mdui-icon>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '2.5rem', fontWeight: '700' }}>
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
                  : 0}%
              </h2>
              <p style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Erstwunsch-Rate</p>
            </mdui-card>

            {feedback.length > 0 && (
              <mdui-card variant="elevated" style={{
                padding: '1.5rem',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
              }}>
                <mdui-icon name="star" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}></mdui-icon>
                <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '2.5rem', fontWeight: '700' }}>
                  {getEnhancedFeedbackStats()?.averages.overall || 0}/5
                </h2>
                <p style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Gesamtbewertung</p>
              </mdui-card>
            )}
          </div>

          {/* Quick Charts Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            {/* Grade Distribution */}
            <mdui-card variant="elevated" style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <mdui-icon name="school"></mdui-icon>
                  Klassenverteilung
                </h3>
                <mdui-button-icon 
                  icon="download"
                  variant="standard"
                  onClick={() => downloadChart(gradeDistributionRef, "klassenverteilung")}
                />
              </div>
              <div ref={gradeDistributionRef} style={{ height: '300px' }}>
                <Bar data={getGradeDistributionData()} options={modernChartOptions} />
              </div>
            </mdui-card>

            {/* Assignment Results */}
            {results.length > 0 && (
              <mdui-card variant="elevated" style={{ padding: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <mdui-icon name="pie_chart"></mdui-icon>
                    Zuteilungsergebnis
                  </h3>
                  <mdui-button-icon 
                    icon="download"
                    variant="standard"
                    onClick={() => downloadChart(assignmentStatsRef, "zuteilungsergebnis")}
                  />
                </div>
                <div ref={assignmentStatsRef} style={{ height: '300px' }}>
                  <Doughnut data={getAssignmentStatsData()} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                      },
                    },
                  }} />
                </div>
              </mdui-card>
            )}
          </div>

          {/* Engagement Metrics */}
          <mdui-card variant="elevated" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{
              margin: '0 0 1.5rem 0',
              fontSize: '1.25rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <mdui-icon name="trending_up"></mdui-icon>
              Engagement-Metriken
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}>
              {(() => {
                const engagement = getEngagementMetrics();
                return [
                  {
                    icon: "schedule",
                    label: "Abstimmungsdauer",
                    value: `${engagement.submissionTimespan}h`,
                    color: "#2196f3"
                  },
                  {
                    icon: "list",
                    label: "Ø Auswahlen",
                    value: `${engagement.averageSelections}/${vote.selectCount}`,
                    color: "#4caf50"
                  },
                  {
                    icon: "percent",
                    label: "Auswahlnutzung",
                    value: `${engagement.selectionUtilization}%`,
                    color: "#ff9800"
                  },
                  {
                    icon: "group",
                    label: "Teilnahme",
                    value: `${engagement.totalParticipants} Schüler`,
                    color: "#9c27b0"
                  }
                ].map((metric, index) => (
                  <div key={index} style={{
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: `2px solid ${metric.color}20`,
                  }}>
                    <mdui-icon name={metric.icon} style={{
                      fontSize: '2rem',
                      color: metric.color,
                      marginBottom: '0.5rem',
                    }}></mdui-icon>
                    <h4 style={{
                      margin: '0 0 0.25rem 0',
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: metric.color,
                    }}>
                      {metric.value}
                    </h4>
                    <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                      {metric.label}
                    </p>
                  </div>
                ));
              })()}
            </div>
          </mdui-card>
        </>
      )}

      {/* Detailed Analytics */}
      {selectedMetric === "detailed" && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '1.5rem',
        }}>
          {/* Submissions Timeline */}
          <mdui-card variant="elevated" style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <mdui-icon name="timeline"></mdui-icon>
                Abgaben-Verlauf
              </h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <mdui-segmented-button-group>
                  <mdui-segmented-button 
                    selected={timeGrouping === "hour"}
                    onClick={() => handleTimeGroupingChange("hour")}
                  >
                    Stunde
                  </mdui-segmented-button>
                  <mdui-segmented-button 
                    selected={timeGrouping === "day"}
                    onClick={() => handleTimeGroupingChange("day")}
                  >
                    Tag
                  </mdui-segmented-button>
                  <mdui-segmented-button 
                    selected={timeGrouping === "week"}
                    onClick={() => handleTimeGroupingChange("week")}
                  >
                    Woche
                  </mdui-segmented-button>
                </mdui-segmented-button-group>
                <mdui-button-icon 
                  icon="download"
                  variant="standard"
                  onClick={() => downloadChart(submissionsTimelineRef, "abgaben-verlauf")}
                />
              </div>
            </div>
            <div ref={submissionsTimelineRef} style={{ height: '400px' }}>
              <Line data={getSubmissionsTimelineData()} options={{
                ...modernChartOptions,
                elements: {
                  line: {
                    tension: 0.4,
                  },
                  point: {
                    radius: 4,
                    hoverRadius: 6,
                  },
                },
              }} />
            </div>
          </mdui-card>

          {/* Project Popularity */}
          <mdui-card variant="elevated" style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <mdui-icon name="trending_up"></mdui-icon>
                Projektbeliebtheit
              </h3>
              <mdui-button-icon 
                icon="download"
                variant="standard"
                onClick={() => downloadChart(projectPopularityRef, "projektbeliebtheit")}
              />
            </div>
            <div ref={projectPopularityRef} style={{ height: '400px' }}>
              <Bar data={getProjectPopularityData()} options={{
                ...modernChartOptions,
                scales: {
                  ...modernChartOptions.scales,
                  x: {
                    ...modernChartOptions.scales.x,
                    stacked: true,
                  },
                  y: {
                    ...modernChartOptions.scales.y,
                    stacked: true,
                  },
                },
                plugins: {
                  ...modernChartOptions.plugins,
                  legend: {
                    display: true,
                    position: 'top' as const,
                  },
                },
              }} />
            </div>
          </mdui-card>

          {/* First Choice Success by Grade */}
          {results.length > 0 && (
            <mdui-card variant="elevated" style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <mdui-icon name="grade"></mdui-icon>
                  Erstwunsch nach Klasse
                </h3>
                <mdui-button-icon 
                  icon="download"
                  variant="standard"
                  onClick={() => downloadChart(firstChoiceSuccessRef, "erstwunsch-erfolg")}
                />
              </div>
              <div ref={firstChoiceSuccessRef} style={{ height: '400px' }}>
                <Bar data={getFirstChoiceSuccessData()} options={modernChartOptions} />
              </div>
            </mdui-card>
          )}

          {/* Choice Assignment Per Option */}
          {results.length > 0 && (
            <mdui-card variant="elevated" style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <mdui-icon name="assignment_ind"></mdui-icon>
                  Wahlprioritäten pro Projekt
                </h3>
                <mdui-button-icon 
                  icon="download"
                  variant="standard"
                  onClick={() => downloadChart(choiceAssignmentPerOptionRef, "wahlprioritaeten")}
                />
              </div>
              <div ref={choiceAssignmentPerOptionRef} style={{ height: '400px' }}>
                <Bar data={getChoiceAssignmentPerOptionData()} options={{
                  ...modernChartOptions,
                  scales: {
                    ...modernChartOptions.scales,
                    x: {
                      ...modernChartOptions.scales.x,
                      stacked: true,
                    },
                    y: {
                      ...modernChartOptions.scales.y,
                      stacked: true,
                    },
                  },
                  plugins: {
                    ...modernChartOptions.plugins,
                    legend: {
                      display: true,
                      position: 'top' as const,
                    },
                  },
                }} />
              </div>
            </mdui-card>
          )}
        </div>
      )}

      {/* Feedback Analytics */}
      {selectedMetric === "feedback" && feedback.length > 0 && (
        <>
          {/* Feedback Overview */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            {(() => {
              const stats = getEnhancedFeedbackStats();
              return [
                {
                  icon: "sentiment_satisfied",
                  label: "Zufriedenheit",
                  value: `${stats?.averages.satisfaction || 0}/5`,
                  color: "#4caf50"
                },
                {
                  icon: "celebration",
                  label: "Vorfreude",
                  value: `${stats?.averages.excitement || 0}/5`,
                  color: "#ff9800"
                },
                {
                  icon: "thumb_up",
                  label: "Einfachheit",
                  value: `${stats?.averages.easeOfProcess || 0}/5`,
                  color: "#2196f3"
                },
                {
                  icon: "rate_review",
                  label: "Rücklaufquote",
                  value: `${stats?.responseRate || 0}%`,
                  color: "#9c27b0"
                }
              ].map((metric, index) => (
                <mdui-card key={index} variant="elevated" style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: `linear-gradient(135deg, ${metric.color}15, ${metric.color}05)`,
                  border: `2px solid ${metric.color}20`,
                }}>
                  <mdui-icon name={metric.icon} style={{
                    fontSize: '2.5rem',
                    color: metric.color,
                    marginBottom: '0.5rem',
                  }}></mdui-icon>
                  <h3 style={{
                    margin: '0 0 0.25rem 0',
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: metric.color,
                  }}>
                    {metric.value}
                  </h3>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                    {metric.label}
                  </p>
                </mdui-card>
              ));
            })()}
          </div>

          {/* Feedback Charts */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            {/* Radar Chart */}
            <mdui-card variant="elevated" style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <mdui-icon name="radar"></mdui-icon>
                  Feedback-Übersicht
                </h3>
                <mdui-button-icon 
                  icon="download"
                  variant="standard"
                  onClick={() => downloadChart(satisfactionTrendRef, "feedback-uebersicht")}
                />
              </div>
              <div ref={satisfactionTrendRef} style={{ height: '300px' }}>
                <Radar data={getFeedbackRadarData()} options={radarChartOptions} />
              </div>
            </mdui-card>

            {/* Satisfaction Distribution */}
            <mdui-card variant="elevated" style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <mdui-icon name="sentiment_satisfied"></mdui-icon>
                  Zufriedenheitsverteilung
                </h3>
              </div>
              <div style={{ height: '300px' }}>
                <Bar data={getFeedbackChartData('satisfaction')} options={modernChartOptions} />
              </div>
            </mdui-card>

            {/* Excitement Distribution */}
            <mdui-card variant="elevated" style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <mdui-icon name="celebration"></mdui-icon>
                  Vorfreude-Verteilung
                </h3>
              </div>
              <div style={{ height: '300px' }}>
                <Bar data={getFeedbackChartData('excitement')} options={modernChartOptions} />
              </div>
            </mdui-card>

            {/* Ease of Process Distribution */}
            <mdui-card variant="elevated" style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <mdui-icon name="thumb_up"></mdui-icon>
                  Einfachheits-Verteilung
                </h3>
              </div>
              <div style={{ height: '300px' }}>
                <Bar data={getFeedbackChartData('easeOfProcess')} options={modernChartOptions} />
              </div>
            </mdui-card>
          </div>

          {/* Project Insights Table */}
          <mdui-card variant="elevated" style={{ padding: '1.5rem' }}>
            <h3 style={{
              margin: '0 0 1.5rem 0',
              fontSize: '1.25rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <mdui-icon name="insights"></mdui-icon>
              Projekt-Einblicke
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Projekt</th>
                    <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Bewertungen</th>
                    <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Zugeteilte</th>
                    <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Beliebtheit</th>
                    <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Zufriedenheitsindex</th>
                  </tr>
                </thead>
                <tbody>
                  {getProjectInsights().map((project, index) => (
                    <tr key={project.id} style={{
                      backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                    }}>
                      <td style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
                        <div>
                          <strong>{project.title}</strong>
                          <br />
                          <small style={{ color: '#666' }}>{project.teacher}</small>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                        {project.totalSelections}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                        {project.assignments}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                        <div style={{
                          display: 'flex',
                          gap: '2px',
                          justifyContent: 'center',
                        }}>
                          {project.choiceBreakdown.map((count, idx) => (
                            <div
                              key={idx}
                              style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: count > 0 ? ['#4caf50', '#ff9800', '#f44336', '#9c27b0', '#2196f3'][idx] : '#e0e0e0',
                                borderRadius: '50%',
                                fontSize: '10px',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                              }}
                              title={`${idx + 1}. Wahl: ${count}`}
                            >
                              {count > 0 ? count : ''}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                        }}>
                          <div style={{
                            width: '60px',
                            height: '8px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${project.satisfactionIndex}%`,
                              height: '100%',
                              backgroundColor: project.satisfactionIndex > 70 ? '#4caf50' : project.satisfactionIndex > 40 ? '#ff9800' : '#f44336',
                              borderRadius: '4px',
                            }} />
                          </div>
                          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                            {project.satisfactionIndex}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </mdui-card>
        </>
      )}

      {selectedMetric === "feedback" && feedback.length === 0 && (
        <mdui-card variant="elevated" style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#666',
        }}>
          <mdui-icon name="sentiment_neutral" style={{ fontSize: '4rem', marginBottom: '1rem' }}></mdui-icon>
          <h3>Noch kein Feedback verfügbar</h3>
          <p>Sobald Schüler Feedback abgeben, werden die Statistiken hier angezeigt.</p>
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

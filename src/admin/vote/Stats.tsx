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
  const [timeGrouping, setTimeGrouping] = useState<"hour" | "day" | "week">("day");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"overview" | "detailed">("overview");

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

  // Handle time grouping change with individual button clicks
  const handleTimeGroupingChange = (newValue: "hour" | "day" | "week") => {
    setTimeGrouping(newValue);
  };

  // Submissions over time data
  const getSubmissionsTimelineData = () => {
    const filteredChoices = getFilteredChoices();
    if (filteredChoices.length === 0) return { labels: [], datasets: [] };

    let timeFilteredChoices = filteredChoices;

    // Filter choices based on time grouping
    if (timeGrouping === "hour") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      timeFilteredChoices = filteredChoices.filter(
        (choice) => new Date(choice.timestamp.seconds * 1000) >= oneHourAgo
      );
    }

    const timeGroups = new Map<string, number>();

    timeFilteredChoices.forEach((choice) => {
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
          backgroundColor: "#1976d2",
          borderColor: "#1976d2",
          borderWidth: 2,
          fill: false,
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
          backgroundColor: "#2196f3",
          borderColor: "#2196f3",
          borderWidth: 1,
        },
      ],
    };
  };

  // Project popularity (how often each project was selected by choice priority)
  const getProjectPopularityData = () => {
    const filteredChoices = getFilteredChoices();
    // Initialize data structure for each option
    const projectChoiceStats = new Map<string, number[]>();

    options.forEach((option) => {
      projectChoiceStats.set(option.id, new Array(vote.selectCount).fill(0));
    });

    // Count how often each project was selected at each choice level
    filteredChoices.forEach((choice) => {
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
      "#4caf50",
      "#ff9800", 
      "#f44336",
      "#9c27b0",
      "#2196f3",
      "#607d8b",
      "#795548",
      "#ff5722",
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
    const filteredResults = getFilteredResults();
    const filteredChoices = getFilteredChoices();
    const filteredChoiceIds = new Set(filteredChoices.map(c => c.id));
    
    const assignmentCounts = new Array(vote.selectCount + 1).fill(0);

    filteredResults.forEach((result) => {
      // Find the corresponding choice using the result ID
      const choice = filteredChoices.find((c) => c.id === result.id);
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
            "#4caf50",
            "#ff9800",
            "#f44336",
            "#9c27b0",
            "#2196f3",
            "#607d8b",
            "#795548",
            "#ff5722",
          ],
        },
      ],
    };
  };

  // Choice assignments per option (how many 1st, 2nd, ... choices are assigned per option)
  const getChoiceAssignmentPerOptionData = () => {
    const filteredResults = getFilteredResults();
    const filteredChoices = getFilteredChoices();
    
    // Initialize data structure for each option
    const optionChoiceStats = new Map<string, number[]>();

    options.forEach((option) => {
      optionChoiceStats.set(option.id, new Array(vote.selectCount).fill(0));
    });

    // Count assignments for each choice level
    filteredResults.forEach((result) => {
      const choice = filteredChoices.find((c) => c.id === result.id);
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
      "#4caf50",
      "#ff9800",
      "#f44336", 
      "#9c27b0",
      "#2196f3",
      "#607d8b",
      "#795548",
      "#ff5722",
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
    const filteredChoices = getFilteredChoices();
    const filteredResults = getFilteredResults();
    const filteredResultIds = new Set(filteredResults.map(r => r.id));
    
    const grades = new Set(filteredChoices.map((c) => Number(c.grade)));
    const gradeStats = new Map<
      number,
      { total: number; firstChoice: number }
    >();

    // Initialize grade stats
    grades.forEach((grade) => {
      gradeStats.set(grade, { total: 0, firstChoice: 0 });
    });

    // Count assignments
    filteredResults.forEach((result) => {
      const choice = filteredChoices.find((c) => c.id === result.id);
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
          backgroundColor: "#4caf50",
          borderColor: "#4caf50",
          borderWidth: 1,
        },
      ],
    };
  };



  // Enhanced feedback statistics with trends
  const getEnhancedFeedbackStats = () => {
    if (feedback.length === 0) return null;

    const filteredChoices = getFilteredChoices();
    
    // Filter feedback based on choice filtering
    const filteredFeedback = feedback.filter(fb => {
      const matchingChoice = filteredChoices.find(choice => 
        Math.abs(choice.timestamp.seconds - fb.timestamp.seconds) < 300 // 5 minutes tolerance
      );
      return !!matchingChoice;
    });

    if (filteredFeedback.length === 0) return null;

    const avgSatisfaction = filteredFeedback.reduce((sum, f) => sum + f.satisfaction, 0) / filteredFeedback.length;
    const avgExcitement = filteredFeedback.reduce((sum, f) => sum + f.excitement, 0) / filteredFeedback.length;
    const avgEaseOfProcess = filteredFeedback.reduce((sum, f) => sum + f.easeOfProcess, 0) / filteredFeedback.length;

    // Calculate response rate by grade
    const gradeResponseRates = new Map<number, { responses: number; total: number }>();
    filteredChoices.forEach((choice) => {
      const grade = Number(choice.grade);
      if (!gradeResponseRates.has(grade)) {
        gradeResponseRates.set(grade, { responses: 0, total: 0 });
      }
      gradeResponseRates.get(grade)!.total++;
    });

    filteredFeedback.forEach((fb) => {
      // Find the choice corresponding to this feedback based on timestamp correlation
      const matchingChoice = filteredChoices.find(choice => 
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
      responseRate: Math.round((filteredFeedback.length / filteredChoices.length) * 100),
      gradeResponseRates: Array.from(gradeResponseRates.entries()).map(([grade, data]) => ({
        grade,
        rate: data.total > 0 ? Math.round((data.responses / data.total) * 100) : 0,
        responses: data.responses,
        total: data.total,
      })),
      distribution: {
        satisfaction: [1, 2, 3, 4, 5].map(rating => 
          filteredFeedback.filter(f => f.satisfaction === rating).length
        ),
        excitement: [1, 2, 3, 4, 5].map(rating => 
          filteredFeedback.filter(f => f.excitement === rating).length
        ),
        easeOfProcess: [1, 2, 3, 4, 5].map(rating => 
          filteredFeedback.filter(f => f.easeOfProcess === rating).length
        ),
      },
      totalResponses: filteredFeedback.length,
    };
  };

  // Calculate engagement metrics
  const getEngagementMetrics = () => {
    const filteredChoices = getFilteredChoices();
    const totalStudents = filteredChoices.length;
    
    if (totalStudents === 0) {
      return {
        totalParticipants: 0,
        submissionTimespan: 0,
        averageSelections: 0,
        maxSelectionsUsed: 0,
        selectionUtilization: 0,
        gradeParticipation: [],
      };
    }
    
    const submissionTimespan = filteredChoices.length > 0 ? 
      Math.max(...filteredChoices.map(c => c.timestamp.seconds)) - Math.min(...filteredChoices.map(c => c.timestamp.seconds)) : 0;
    
    const averageSelections = filteredChoices.reduce((sum, choice) => sum + choice.selected.length, 0) / filteredChoices.length;
    const maxSelectionsUsed = Math.max(...filteredChoices.map(choice => choice.selected.length));
    
    const gradeParticipation = new Map<number, number>();
    filteredChoices.forEach(choice => {
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
    const filteredChoices = getFilteredChoices();
    const filteredResults = getFilteredResults();
    
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
    filteredChoices.forEach(choice => {
      choice.selected.forEach((optionId, index) => {
        const stats = projectStats.get(optionId);
        if (stats && index < vote.selectCount) {
          stats.totalSelections++;
          stats.choiceBreakdown[index]++;
        }
      });
    });

    // Count actual assignments
    filteredResults.forEach(result => {
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
            '#f44336',   // Red for 1
            '#ff9800',   // Orange for 2  
            '#ffc107',   // Yellow for 3
            '#8bc34a',   // Light Green for 4
            '#4caf50',   // Green for 5
          ],
          borderColor: [
            '#f44336',
            '#ff9800',
            '#ffc107',
            '#8bc34a',
            '#4caf50',
          ],
          borderWidth: 1,
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
          backgroundColor: 'rgba(33, 150, 243, 0.2)',
          borderColor: 'rgba(33, 150, 243, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(33, 150, 243, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(33, 150, 243, 1)',
        },
      ],
    };
  };

  // Simplified chart options for Material Design
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          padding: 16,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1976d2',
        cornerRadius: 4,
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: '#757575',
          font: {
            size: 11,
          },
        },
        grid: {
          color: '#e0e0e0',
          borderColor: '#bdbdbd',
        },
      },
      x: {
        ticks: {
          color: '#757575',
          font: {
            size: 11,
          },
        },
        grid: {
          color: '#e0e0e0',
          borderColor: '#bdbdbd',
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
        labels: {
          padding: 16,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: '#1976d2',
        cornerRadius: 4,
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
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
      tooltip: {
        backgroundColor: '#1976d2',
        cornerRadius: 4,
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1,
          color: '#757575',
          font: {
            size: 10,
          },
        },
        grid: {
          color: '#e0e0e0',
        },
        angleLines: {
          color: '#e0e0e0',
        },
        pointLabels: {
          font: {
            size: 12,
          },
          color: '#424242',
        },
      },
    },
  };

  return (
    <div style={{ 
      padding: '1rem',
      maxWidth: '1400px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <mdui-card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '1.75rem',
                fontWeight: '500',
                color: '#1976d2',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <mdui-icon name="analytics"></mdui-icon>
                Statistiken
              </h1>
              <p style={{
                margin: '0.25rem 0 0 0',
                color: '#757575',
                fontSize: '1rem',
              }}>
                {vote.title}
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <mdui-segmented-button-group>
              <mdui-segmented-button 
                icon="dashboard"
                selected={viewMode === "overview"}
                onClick={() => setViewMode("overview")}
              >
                Übersicht
              </mdui-segmented-button>
              <mdui-segmented-button 
                icon="insights"
                selected={viewMode === "detailed"}
                onClick={() => setViewMode("detailed")}
              >
                Details
              </mdui-segmented-button>
            </mdui-segmented-button-group>
          </div>

          {/* Filters */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            padding: '1rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <mdui-icon name="filter_list" style={{ color: '#757575' }}></mdui-icon>
              <span style={{ fontSize: '0.9rem', color: '#757575', fontWeight: '500' }}>Filter:</span>
            </div>
            
            <mdui-select 
              label="Klasse" 
              value={selectedGrade}
              style={{ minWidth: '120px' }}
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
              style={{ minWidth: '130px' }}
              onInput={(e: any) => setDateRange(e.target.value)}
            >
              <mdui-menu-item value="all">Gesamter Zeitraum</mdui-menu-item>
              <mdui-menu-item value="24h">Letzte 24h</mdui-menu-item>
              <mdui-menu-item value="7d">Letzte 7 Tage</mdui-menu-item>
              <mdui-menu-item value="30d">Letzte 30 Tage</mdui-menu-item>
            </mdui-select>

            <mdui-select 
              label="Zeitgruppierung" 
              value={timeGrouping}
              style={{ minWidth: '130px' }}
              onInput={(e: any) => setTimeGrouping(e.target.value as "hour" | "day" | "week")}
            >
              <mdui-menu-item value="hour">Stunden</mdui-menu-item>
              <mdui-menu-item value="day">Tage</mdui-menu-item>
              <mdui-menu-item value="week">Wochen</mdui-menu-item>
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
        </div>
      </mdui-card>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {(() => {
          const filteredChoices = getFilteredChoices();
          const filteredResults = getFilteredResults();
          const engagement = getEngagementMetrics();
          const feedbackStats = getEnhancedFeedbackStats();
          
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

          const stats = [
            {
              icon: "how_to_vote",
              label: "Teilnehmer",
              value: filteredChoices.length.toString(),
              color: "#1976d2"
            },
            {
              icon: "assignment",
              label: "Projekte",
              value: options.length.toString(),
              color: "#388e3c"
            },
            {
              icon: "assignment_turned_in",
              label: "Zugeteilte",
              value: filteredResults.length.toString(),
              color: "#f57c00"
            },
            {
              icon: "thumb_up",
              label: "Erstwunsch-Rate",
              value: `${firstChoiceSuccess}%`,
              color: "#7b1fa2"
            },
          ];

          if (feedbackStats) {
            stats.push({
              icon: "star",
              label: "Gesamtbewertung",
              value: `${feedbackStats.averages.overall}/5`,
              color: "#d32f2f"
            });
          }

          return stats.map((stat, index) => (
            <mdui-card key={index} style={{
              padding: '1.5rem',
              textAlign: 'center',
              borderLeft: `4px solid ${stat.color}`,
            }}>
              <mdui-icon name={stat.icon} style={{
                fontSize: '2rem',
                color: stat.color,
                marginBottom: '0.5rem',
              }}></mdui-icon>
              <h3 style={{
                margin: '0 0 0.25rem 0',
                fontSize: '1.75rem',
                fontWeight: '600',
                color: '#212121',
              }}>
                {stat.value}
              </h3>
              <p style={{
                margin: 0,
                color: '#757575',
                fontSize: '0.9rem',
              }}>
                {stat.label}
              </p>
            </mdui-card>
          ));
        })()}
      </div>

      {/* Overview Mode */}
      {viewMode === "overview" && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem',
        }}>
          {/* Grade Distribution */}
          <mdui-card style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <mdui-icon name="school"></mdui-icon>
                Klassenverteilung
              </h3>
              <mdui-button-icon 
                icon="download"
                onClick={() => downloadChart(gradeDistributionRef, "klassenverteilung")}
              />
            </div>
            <div ref={gradeDistributionRef} style={{ height: '300px' }}>
              <Bar data={getGradeDistributionData()} options={chartOptions} />
            </div>
          </mdui-card>

          {/* Submissions Timeline */}
          <mdui-card style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <mdui-icon name="timeline"></mdui-icon>
                Abgaben-Verlauf
              </h3>
              <mdui-button-icon 
                icon="download"
                onClick={() => downloadChart(submissionsTimelineRef, "abgaben-verlauf")}
              />
            </div>
            <div ref={submissionsTimelineRef} style={{ height: '300px' }}>
              <Line data={getSubmissionsTimelineData()} options={{
                ...chartOptions,
                elements: {
                  line: {
                    tension: 0.4,
                  },
                  point: {
                    radius: 3,
                    hoverRadius: 5,
                  },
                },
              }} />
            </div>
          </mdui-card>

          {/* Assignment Results */}
          {getFilteredResults().length > 0 && (
            <mdui-card style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <mdui-icon name="pie_chart"></mdui-icon>
                  Zuteilungsergebnis
                </h3>
                <mdui-button-icon 
                  icon="download"
                  onClick={() => downloadChart(assignmentStatsRef, "zuteilungsergebnis")}
                />
              </div>
              <div ref={assignmentStatsRef} style={{ height: '300px' }}>
                <Doughnut data={getAssignmentStatsData()} options={pieChartOptions} />
              </div>
            </mdui-card>
          )}

          {/* Feedback Overview */}
          {feedback.length > 0 && getEnhancedFeedbackStats() && (
            <mdui-card style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <mdui-icon name="sentiment_satisfied"></mdui-icon>
                  Feedback-Übersicht
                </h3>
                <mdui-button-icon 
                  icon="download"
                  onClick={() => downloadChart(satisfactionTrendRef, "feedback-uebersicht")}
                />
              </div>
              <div ref={satisfactionTrendRef} style={{ height: '300px' }}>
                <Radar data={getFeedbackRadarData()} options={radarChartOptions} />
              </div>
            </mdui-card>
          )}
        </div>
      )}

      {/* Detailed Mode */}
      {viewMode === "detailed" && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '1.5rem',
        }}>
          {/* Project Popularity */}
          <mdui-card style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <mdui-icon name="trending_up"></mdui-icon>
                Projektbeliebtheit
              </h3>
              <mdui-button-icon 
                icon="download"
                onClick={() => downloadChart(projectPopularityRef, "projektbeliebtheit")}
              />
            </div>
            <div ref={projectPopularityRef} style={{ height: '400px' }}>
              <Bar data={getProjectPopularityData()} options={{
                ...chartOptions,
                scales: {
                  ...chartOptions.scales,
                  x: {
                    ...chartOptions.scales.x,
                    stacked: true,
                  },
                  y: {
                    ...chartOptions.scales.y,
                    stacked: true,
                  },
                },
              }} />
            </div>
          </mdui-card>

          {/* First Choice Success by Grade */}
          {getFilteredResults().length > 0 && (
            <mdui-card style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <mdui-icon name="grade"></mdui-icon>
                  Erstwunsch nach Klasse
                </h3>
                <mdui-button-icon 
                  icon="download"
                  onClick={() => downloadChart(firstChoiceSuccessRef, "erstwunsch-erfolg")}
                />
              </div>
              <div ref={firstChoiceSuccessRef} style={{ height: '400px' }}>
                <Bar data={getFirstChoiceSuccessData()} options={chartOptions} />
              </div>
            </mdui-card>
          )}

          {/* Choice Assignment Per Option */}
          {getFilteredResults().length > 0 && (
            <mdui-card style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <mdui-icon name="assignment_ind"></mdui-icon>
                  Wahlprioritäten pro Projekt
                </h3>
                <mdui-button-icon 
                  icon="download"
                  onClick={() => downloadChart(choiceAssignmentPerOptionRef, "wahlprioritaeten")}
                />
              </div>
              <div ref={choiceAssignmentPerOptionRef} style={{ height: '400px' }}>
                <Bar data={getChoiceAssignmentPerOptionData()} options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    x: {
                      ...chartOptions.scales.x,
                      stacked: true,
                    },
                    y: {
                      ...chartOptions.scales.y,
                      stacked: true,
                    },
                  },
                }} />
              </div>
            </mdui-card>
          )}

          {/* Feedback Details */}
          {feedback.length > 0 && getEnhancedFeedbackStats() && (
            <>
              <mdui-card style={{ padding: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <mdui-icon name="sentiment_satisfied"></mdui-icon>
                    Zufriedenheitsverteilung
                  </h3>
                </div>
                <div style={{ height: '300px' }}>
                  <Bar data={getFeedbackChartData('satisfaction')} options={chartOptions} />
                </div>
              </mdui-card>

              <mdui-card style={{ padding: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <mdui-icon name="celebration"></mdui-icon>
                    Vorfreude-Verteilung
                  </h3>
                </div>
                <div style={{ height: '300px' }}>
                  <Bar data={getFeedbackChartData('excitement')} options={chartOptions} />
                </div>
              </mdui-card>

              <mdui-card style={{ padding: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <mdui-icon name="thumb_up"></mdui-icon>
                    Einfachheits-Verteilung
                  </h3>
                </div>
                <div style={{ height: '300px' }}>
                  <Bar data={getFeedbackChartData('easeOfProcess')} options={chartOptions} />
                </div>
              </mdui-card>
            </>
          )}
        </div>
      )}

      {/* Project Insights Table */}
      {viewMode === "detailed" && (
        <mdui-card style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
          <h3 style={{
            margin: '0 0 1.5rem 0',
            fontSize: '1.1rem',
            fontWeight: '500',
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
              fontSize: '0.9rem',
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: '#f5f5f5',
                  borderBottom: '2px solid #e0e0e0',
                }}>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'left',
                    fontWeight: '500',
                    color: '#424242',
                  }}>Projekt</th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center',
                    fontWeight: '500',
                    color: '#424242',
                  }}>Bewertungen</th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center',
                    fontWeight: '500',
                    color: '#424242',
                  }}>Zugeteilte</th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center',
                    fontWeight: '500',
                    color: '#424242',
                  }}>Beliebtheit</th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center',
                    fontWeight: '500',
                    color: '#424242',
                  }}>Zufriedenheitsindex</th>
                </tr>
              </thead>
              <tbody>
                {getProjectInsights().map((project, index) => (
                  <tr key={project.id} style={{
                    backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                    borderBottom: '1px solid #e0e0e0',
                  }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div>
                        <strong style={{ color: '#212121' }}>{project.title}</strong>
                        <br />
                        <small style={{ color: '#757575' }}>{project.teacher}</small>
                      </div>
                    </td>
                    <td style={{ 
                      padding: '0.75rem', 
                      textAlign: 'center',
                      color: '#424242',
                    }}>
                      {project.totalSelections}
                    </td>
                    <td style={{ 
                      padding: '0.75rem', 
                      textAlign: 'center',
                      color: '#424242',
                    }}>
                      {project.assignments}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{
                        display: 'flex',
                        gap: '2px',
                        justifyContent: 'center',
                      }}>
                        {project.choiceBreakdown.map((count, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: '18px',
                              height: '18px',
                              backgroundColor: count > 0 ? 
                                ['#4caf50', '#ff9800', '#f44336', '#9c27b0', '#2196f3'][idx] : 
                                '#e0e0e0',
                              borderRadius: '50%',
                              fontSize: '9px',
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
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}>
                        <div style={{
                          width: '50px',
                          height: '6px',
                          backgroundColor: '#e0e0e0',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${project.satisfactionIndex}%`,
                            height: '100%',
                            backgroundColor: 
                              project.satisfactionIndex > 70 ? '#4caf50' : 
                              project.satisfactionIndex > 40 ? '#ff9800' : '#f44336',
                            borderRadius: '3px',
                          }} />
                        </div>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          fontWeight: '500',
                          color: '#424242',
                        }}>
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
      )}

      {/* Empty State for Feedback */}
      {feedback.length === 0 && viewMode === "detailed" && (
        <mdui-card style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#757575',
          marginTop: '1.5rem',
        }}>
          <mdui-icon name="sentiment_neutral" style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem',
            color: '#bdbdbd',
          }}></mdui-icon>
          <h3 style={{ 
            margin: '0 0 0.5rem 0',
            color: '#424242',
            fontWeight: '500',
          }}>Noch kein Feedback verfügbar</h3>
          <p style={{ margin: 0 }}>
            Sobald Schüler Feedback abgeben, werden die Statistiken hier angezeigt.
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

import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { SchoolData, Vote } from "../types";
import { useLoaderData } from "react-router";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface LoaderData {
  schools: (SchoolData & { id: string })[];
  votes: (Vote & { schoolId: string })[];
  feedbacks: any[];
}

import React from "react";

export default function Power() {
  const { schools, votes, feedbacks } = useLoaderData() as LoaderData;
  const [expanded, setExpanded] = React.useState(false);

  function averageEaseOfProcess(voteId?: string) {
    if (!voteId) return 0;
    const voteFeedbacks = feedbacks.filter(
      (feedback) => feedback.voteId === voteId
    );
    if (voteFeedbacks.length === 0) return 0;
    const total = voteFeedbacks.reduce(
      (sum, feedback) => sum + (feedback.easeOfProcess || 0),
      0
    );
    return total / voteFeedbacks.length;
  }

  const globalEaseOfProcess =
    feedbacks.length > 0
      ? feedbacks.reduce((acc, curr) => acc + (curr.easeOfProcess || 0), 0) /
        feedbacks.length
      : 0;

  // Generate labels for the last 12 months
  const dateLabels = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      id: `${date.getFullYear()}-${date.getMonth() + 1}`,
      display: date.toLocaleDateString("de-DE", { month: "short", year: "numeric" }),
    };
  }).reverse();

  // Prepare data for the chart
  const chartData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderRadius: number;
      borderSkipped: boolean;
      barPercentage: number;
    }[];
  } = {
    labels: dateLabels.map((l) => l.display),
    datasets: schools.map((school, index) => {
      const schoolVotes = votes.filter((vote) => vote.schoolId === school.id);
      const data = dateLabels.map((labelObj) => {
        const [year, month] = labelObj.id.split("-").map(Number);
        return schoolVotes.filter((vote) => {
          const date = vote.startTime
            ? new Date(vote.startTime.seconds * 1000)
            : new Date();
          return date.getFullYear() === year && date.getMonth() + 1 === month;
        }).length;
      });
      return {
        label: school.name,
        data,
        backgroundColor: school.primaryColor || `hsl(${(index * 360) / schools.length}, 70%, 50%)`,
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: 0.6,
      };
    }),
  };

  return (
    <div className="mdui-prose" style={{ width: "100%" }}>
      <h2>SuperAdmin Dashboard</h2>
      <p>
        Systemweite Verwaltung der WaldorfWahlen-Plattform. Überwachen Sie die
        Nutzungsstatistiken und verwalten Sie alle erstellten Schulen und Wahlen.
      </p>

      {/* Analytics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
          width: "100%",
        }}
      >
        <mdui-card variant="filled" style={{ padding: "20px", width: "100%", boxSizing: "border-box" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Aktive Schulen</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <mdui-icon name="school" style={{ fontSize: "50px", opacity: 0.8 }}></mdui-icon>
            <span style={{ fontSize: "3rem", fontWeight: "bold" }}>
              {schools.length}
            </span>
          </div>
        </mdui-card>

        <mdui-card variant="filled" style={{ padding: "20px", width: "100%", boxSizing: "border-box" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Gesamt Wahlen</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <mdui-icon name="how_to_vote" style={{ fontSize: "50px", opacity: 0.8 }}></mdui-icon>
            <span style={{ fontSize: "3rem", fontWeight: "bold" }}>
              {votes.length}
            </span>
          </div>
        </mdui-card>

        <mdui-card variant="filled" style={{ padding: "20px", width: "100%", boxSizing: "border-box" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Globales Feedback</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <mdui-icon name="star_rate" style={{ fontSize: "50px", opacity: 0.8 }}></mdui-icon>
            <span style={{ fontSize: "3rem", fontWeight: "bold" }}>
              {globalEaseOfProcess.toFixed(1)} <span style={{ fontSize: "1rem", fontWeight: "normal" }}>Ø Sterne</span>
            </span>
          </div>
        </mdui-card>
      </div>

      <h3 style={{ marginTop: "40px" }}>Verlauf</h3>
      <mdui-card variant="outlined" style={{ padding: "20px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ height: "350px", width: "100%" }}>
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "top",
                  labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    boxHeight: 8,
                  },
                },
                tooltip: {
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  borderRadius: 8,
                  padding: 12,
                },
              },
              scales: {
                x: {
                  stacked: true,
                  grid: {
                    display: false,
                  },
                  border: {
                    display: false,
                  },
                },
                y: {
                  stacked: true,
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                    precision: 0,
                  },
                  grid: {
                    display: true,
                    color: "rgba(100, 100, 100, 0.1)",
                  },
                  border: {
                    display: false,
                    dash: [4, 4],
                  },
                },
              },
            }}
          />
        </div>
      </mdui-card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: "20px",
          width: "100%",
          marginTop: "40px",
        }}
      >
        {/* Schulen List */}
        <div>
          <h3 style={{ marginTop: 0 }}>Schulen</h3>
          <mdui-card variant="outlined" style={{ width: "100%" }}>
            <mdui-list>
              {schools.map((school) => {
                const schoolVotes = votes.filter((v) => v.schoolId === school.id).length;
                return (
                  <mdui-list-item
                    key={school.id}
                    rounded
                    href={window.location.href.replace("SCHOOLID", school.id)}
                  >
                    <img
                      slot="icon"
                      src={school.icon}
                      alt="Logo"
                      style={{ height: "32px", width: "32px", objectFit: "contain", borderRadius: "4px" }}
                    />
                    <strong>{school.name}</strong>
                    <span slot="description">{school.id} • {schoolVotes} Wahlen</span>
                    <mdui-button-icon slot="end-icon" icon="open_in_new"></mdui-button-icon>
                  </mdui-list-item>
                );
              })}
            </mdui-list>
          </mdui-card>
        </div>

        {/* Recent Votes List */}
        <div>
          <h3 style={{ marginTop: 0 }}>Kürzliche Wahlen</h3>
          <mdui-card variant="outlined" style={{ width: "100%" }}>
            <mdui-list>
              {votes
                .sort((a, b) => (b.startTime?.seconds || 0) - (a.startTime?.seconds || 0))
                .slice(0, expanded ? votes.length : 5) // Limit to top 5 recently active or all if expanded
                .map((vote) => {
                  const rating = averageEaseOfProcess(vote.id);
                  const schoolInfo = schools.find((s) => s.id === vote.schoolId);
                  const baseUrl = window.location.href.replace("SCHOOLID", vote.schoolId || "").replace("/power", "");
                  
                  return (
                    <mdui-list-item
                      key={vote.id}
                      rounded
                      href={`${baseUrl}/${vote.id}`}
                    >
                      <img
                        slot="icon"
                        src={schoolInfo?.icon}
                        alt="Logo"
                        style={{ height: "32px", width: "32px", objectFit: "contain", borderRadius: "4px" }}
                      />
                      <strong>{vote.title}</strong>
                      <span slot="description">
                        {schoolInfo?.name || vote.schoolId}
                        {rating > 0 && ` • Ø ${rating.toFixed(1)} Sterne`}
                      </span>
                      
                      {/* Action Links */}
                      <mdui-button-icon
                        slot="end-icon"
                        icon="edit"
                        href={`${baseUrl}/${vote.id}/edit`}
                      ></mdui-button-icon>
                      <mdui-button-icon
                        slot="end-icon"
                        icon="people"
                        href={`${baseUrl}/${vote.id}/answers`}
                      ></mdui-button-icon>
                      <mdui-button-icon
                        slot="end-icon"
                        icon="trending_up"
                        href={`${baseUrl}/${vote.id}/stats`}
                      ></mdui-button-icon>
                      <mdui-button-icon
                        slot="end-icon"
                        icon="share"
                        href={`${baseUrl}/${vote.id}/share`}
                      ></mdui-button-icon>
                    </mdui-list-item>
                  );
                })}
              {votes.length > 5 && (
                <mdui-list-item
                  rounded
                  onClick={() => setExpanded(!expanded)}
                  style={{ textAlign: "center", display: "flex", justifyContent: "center" }}
                >
                  <span style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                    <mdui-icon name={expanded ? "expand_less" : "expand_more"}></mdui-icon>
                    {expanded ? "Weniger anzeigen" : "Alle anzeigen"}
                  </span>
                </mdui-list-item>
              )}
            </mdui-list>
          </mdui-card>
        </div>
      </div>
    </div>
  );
}

Power.loader = async function loader() {
  const schools = (await getDocs(collection(db, "schools")).then((data) => {
    return data.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  })) as (SchoolData & { id: string })[];
  console.log(schools);

  const votes = [] as Vote[];
  for (const school of schools) {
    const schoolVotes = await getDocs(
      collection(db, `schools/${school.id}/votes`)
    ).then((data) => {
      return data.docs.map((doc) => ({
        schoolId: school.id,
        id: doc.id,
        ...doc.data(),
      })) as (Vote & { schoolId: string })[];
    });
    votes.push(...schoolVotes);
  }
  console.log(votes);

  const recentVotes = [...votes]
    .sort((a, b) => (b.startTime?.seconds || 0) - (a.startTime?.seconds || 0))
    .slice(0, 5);

  const feedbacks = [] as any[];
  for (const vote of recentVotes) {
    console.log(vote);
    const voteFeedbacks = await getDocs(
      collection(db, `schools/${vote.schoolId}/votes/${vote.id}/feedback`)
    ).then((data) => {
      return data.docs.map((doc) => ({
        voteId: vote.id,
        id: doc.id,
        ...doc.data(),
      }));
    });
    console.log(voteFeedbacks);
    feedbacks.push(...voteFeedbacks);
  }
  console.log(feedbacks);

  return {
    schools,
    votes,
    feedbacks,
  };
};

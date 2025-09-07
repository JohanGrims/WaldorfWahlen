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

export default function Power() {
  const { schools, votes, feedbacks } = useLoaderData() as LoaderData;

  function averageEaseOfProcess(voteId: string) {
    const voteFeedbacks = feedbacks.filter(
      (feedback) => feedback.voteId === voteId
    );
    console.log(voteFeedbacks);
    if (voteFeedbacks.length === 0) return 0;
    const total = voteFeedbacks.reduce(
      (sum, feedback) => sum + (feedback.easeOfProcess || 0),
      0
    );
    return total / voteFeedbacks.length;
  }

  // Generate labels for the last 12 months
  const labels = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  }).reverse();

  // Prepare data for the chart
  const chartData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
    }[];
  } = {
    labels,
    datasets: schools.map((school, index) => {
      const schoolVotes = votes.filter((vote) => vote.schoolId === school.id);
      const data = labels.map((label: string) => {
        const [year, month] = label.split("-").map(Number);
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
        backgroundColor: `hsl(${(index * 360) / schools.length}, 70%, 50%)`,
      };
    }),
  };

  return (
    <div>
      <h2>Willkommen, Administrator!</h2>
      <p />
      <mdui-list>
        {schools.map((school) => (
          <mdui-list-item
            key={school.id}
            rounded
            href={window.location.href.replace("SCHOOLID", school.id)}
          >
            <img
              slot="icon"
              src={school.icon}
              alt="Logo"
              style={{ height: "24px", marginRight: "8px" }}
            />
            {school.name} ({school.id})
          </mdui-list-item>
        ))}
      </mdui-list>

      <Bar
        data={chartData}
        options={{
          responsive: true,
          plugins: {
            legend: {
              position: "top",
            },
            title: {
              display: true,
              text: "Votes per Month per School",
            },
          },
          scales: {
            x: {
              stacked: true,
            },
            y: {
              stacked: true,
            },
          },
        }}
      />

      <p />

      <mdui-list>
        {votes
          .sort((a, b) => (b.endTime?.seconds || 0) - (a.endTime?.seconds || 0))
          .map((vote) => (
            <mdui-list-item
              key={vote.id}
              rounded
              href={window.location.href
                .replace("SCHOOLID", vote.schoolId || "")
                .replace("admin/power", `admin/${vote.id}`)}
            >
              <span slot="icon">
                {(Math.round(averageEaseOfProcess(vote.id) * 10) / 10).toFixed(
                  1
                )}
              </span>
              <img
                slot="icon"
                src={schools.find((s) => s.id === vote.schoolId)?.icon}
                alt="Logo"
                style={{ height: "24px", marginRight: "8px" }}
              />
              {vote.title} ({vote.schoolId})
              <mdui-button-icon
                slot="end-icon"
                icon="edit"
                href={window.location.href
                  .replace("SCHOOLID", vote.schoolId || "")
                  .replace("admin/power", `admin/${vote.id}/edit`)}
              ></mdui-button-icon>
              <mdui-button-icon
                slot="end-icon"
                icon="people"
                href={window.location.href
                  .replace("SCHOOLID", vote.schoolId || "")
                  .replace("admin/power", `admin/${vote.id}/answers`)}
              ></mdui-button-icon>
              <mdui-button-icon
                slot="end-icon"
                icon="trending_up"
                href={window.location.href
                  .replace("SCHOOLID", vote.schoolId || "")
                  .replace("admin/power", `admin/${vote.id}/stats`)}
              ></mdui-button-icon>
              <mdui-button-icon
                slot="end-icon"
                icon="share"
                href={window.location.href
                  .replace("SCHOOLID", vote.schoolId || "")
                  .replace("admin/power", `admin/${vote.id}/share`)}
              ></mdui-button-icon>
              <mdui-button-icon
                slot="end-icon"
                icon="delete"
                href={window.location.href
                  .replace("SCHOOLID", vote.schoolId || "")
                  .replace("admin/power", `admin/${vote.id}/delete`)}
              ></mdui-button-icon>
            </mdui-list-item>
          ))}
      </mdui-list>
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

  const feedbacks = [] as any[];
  for (const vote of votes) {
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

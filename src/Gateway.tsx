import { doc, getDoc, Timestamp, DocumentData } from "firebase/firestore";
import { redirect } from "react-router-dom";
import { db } from "./firebase";
import { Helmet } from "react-helmet";

interface VoteData extends DocumentData {
  active: boolean;
  startTime: Timestamp;
  endTime: Timestamp;
}

export default function Gateway() {
  return (
    <Helmet>
      <title>Sie werden weitergeleitet...</title>
    </Helmet>
  );
}

Gateway.loader = async function loader({ params, request }: { params: { id: string }; request: Request }) {
  const { id } = params;
  const vote = await getDoc(doc(db, `schools/SCHOOLID/votes/${id}`));
  if (!vote.exists()) {
    throw new Response("Seite nicht gefunden", {
      status: 404,
      statusText: "Wahl nicht gefunden",
    });
  }

  const voteData = { id: vote.id, ...vote.data() } as unknown as VoteData;

  const now = Date.now();

  if (
    !voteData.active ||
    now > voteData.endTime.seconds * 1000
  ) {
    /* 
    if the vote is not active or the current time is after the end time of the vote,
    redirect to the results page
    */
    return redirect(`/r/${id}`);
  }
  if (
    now < voteData.startTime.seconds * 1000
  ) {
    /*
    if the current time is before the start time of the vote,
    redirect to the scheduled page
    */
    return redirect(`/s/${id}`);
  }
  if (localStorage.getItem(id)) {
    /*
    if the user has already voted in this vote,
    redirect to the already voted page
    */
    const url = new URL(request.url);
    if (url.searchParams.get("a")) {
      return redirect(`/x/${id}?a=true`);
    }
    return redirect(`/x/${id}`);
  }
  /*
  if none of the above conditions are met,
  redirect to the vote page
  */
  return redirect(`/v/${id}`);
};

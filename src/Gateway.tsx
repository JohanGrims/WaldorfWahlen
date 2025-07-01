import { doc, getDoc, Timestamp, DocumentData } from "firebase/firestore";
import moment from "moment-timezone";
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

Gateway.loader = async function loader({ params }: { params: { id: string } }) {
  const { id } = params;
  const vote = await getDoc(doc(db, `/votes/${id}`));
  if (!vote.exists()) {
    throw new Response("Seite nicht gefunden", {
      status: 404,
      statusText: "Wahl nicht gefunden",
    });
  }

  const voteData = { id: vote.id, ...vote.data() } as unknown as VoteData;

  const berlinTime = moment.tz(Date.now(), "Europe/Berlin");

  if (
    !voteData.active ||
    berlinTime.isAfter(
      moment.unix(voteData.endTime.seconds).tz("Europe/Berlin")
    )
  ) {
    /* 
    if the vote is not active or the current time is after the end time of the vote,
    redirect to the results page
    */
    return redirect(`/r/${id}`);
  }
  if (
    berlinTime.isBefore(
      moment.unix(voteData.startTime.seconds).tz("Europe/Berlin")
    )
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
    return redirect(`/x/${id}`);
  }
  /*
  if none of the above conditions are met,
  redirect to the vote page
  */
  return redirect(`/v/${id}`);
};

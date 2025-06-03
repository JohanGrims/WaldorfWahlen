import { doc, getDoc } from "firebase/firestore";
import moment from "moment-timezone";
import { replace } from "react-router-dom";
import { db } from "./firebase";
import { Helmet } from "react-helmet";
export default function Gateway() {
  return (
    <Helmet>
      <title>Sie werden weitergeleitet...</title>
    </Helmet>
  );
}

Gateway.loader = async function loader({ params }) {
  const { id } = params;
  const vote = await getDoc(doc(db, `/votes/${id}`));
  if (!vote.exists()) {
    throw new Response("Seite nicht gefunden", {
      status: 404,
      statusText: "Wahl nicht gefunden",
    });
  }

  const voteData = { id: vote.id, ...vote.data() };

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
    return replace(`/r/${id}`);
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
    return replace(`/s/${id}`);
  }
  if (localStorage.getItem(id)) {
    /*
    if the user has already voted in this vote,
    redirect to the already voted page
    */
    return replace(`/x/${id}`);
  }
  /*
  if none of the above conditions are met,
  redirect to the vote page
  */
  return replace(`/v/${id}`);
};

import { doc, getDoc } from "firebase/firestore";
import moment from "moment-timezone";
import { replace } from "react-router-dom";
import { db } from "./firebase";
export default function Gateway() {
  return null;
}

Gateway.loader = async function loader({ params }) {
  const { id } = params;
  const vote = await getDoc(doc(db, `/votes/${id}`));
  if (!vote.exists()) {
    new Response("Not Found", {
      status: 404,
      statusText: "Wahl nicht gefunden",
    });
  }

  const voteData = { id: vote.id, ...vote.data() };

  const berlinTime = moment.tz(Date.now(), "Europe/Berlin");

  // Convert vote end time and start time to Berlin timezone
  const voteEndTime = moment.unix(voteData.endTime.seconds).tz("Europe/Berlin");
  const voteStartTime = moment
    .unix(voteData.startTime.seconds)
    .tz("Europe/Berlin");

  // If the vote is not active or the current time is after the vote end time, redirect to the results page
  if (!voteData.active || berlinTime.isAfter(voteEndTime)) {
    return replace(`/r/${id}`);
  }

  // If the current time is before the vote start time, redirect to the start page
  if (berlinTime.isBefore(voteStartTime)) {
    return replace(`/s/${id}`);
  }

  // If the user has already voted (indicated by a local storage item), redirect to the confirmation page
  if (localStorage.getItem(id)) {
    return replace(`/x/${id}`);
  }

  // Otherwise, redirect to the voting page
  return replace(`/v/${id}`);
};

import { doc, getDoc } from "firebase/firestore";
import moment from "moment-timezone";
import { redirect } from "react-router-dom";
import { db } from "./firebase";
export default function Gateway() {
  return null;
}

Gateway.loader = async function loader({ params }) {
  const vote = await getDoc(doc(db, `/votes/${params.id}`));
  if (!vote.exists()) {
    new Response("Not Found", {
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
    return redirect(`/r/${voteData.id}`);
  }
  if (
    berlinTime.isBefore(
      moment.unix(voteData.startTime.seconds).tz("Europe/Berlin")
    )
  ) {
    return redirect(`/s/${voteData.id}`);
  }
  if (localStorage.getItem(voteData.id)) {
    return redirect(`/x/${voteData.id}`);
  }
  return redirect(`/v/${voteData.id}`);
};

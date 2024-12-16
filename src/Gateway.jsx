import { doc, getDoc } from "firebase/firestore";
import moment from "moment-timezone";
import { redirect } from "react-router-dom";
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

  if (
    !voteData.active ||
    berlinTime.isAfter(
      moment.unix(voteData.endTime.seconds).tz("Europe/Berlin")
    )
  ) {
    return redirect(`/r/${id}`);
  }
  if (
    berlinTime.isBefore(
      moment.unix(voteData.startTime.seconds).tz("Europe/Berlin")
    )
  ) {
    return redirect(`/s/${id}`);
  }
  if (localStorage.getItem(id)) {
    return redirect(`/x/${id}`);
  }
  return redirect(`/v/${id}`);
};

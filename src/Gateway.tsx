import { doc, getDoc } from "firebase/firestore";
import moment from "moment-timezone";
import { replace } from "react-router-dom";
import { db } from "./firebase";
import { Vote } from "./types";
export default function Gateway() {
  return null;
}

/**
 * Loader function for the Gateway component.
 * @param {Object} context - The context object.
 * @param {Object} context.params - The parameters object.
 * @param {string} context.params.id - The ID of the vote.
 * @returns {Promise<Response | void>} - A promise that resolves to a Response object or void.
 */
Gateway.loader = async function loader({
  params,
}: {
  params: { id: string };
}): Promise<Response | void> {
  const { id } = params;
  const vote = await getDoc(doc(db, `/votes/${id}`));
  if (!vote.exists()) {
    new Response("Not Found", {
      status: 404,
      statusText: "Wahl nicht gefunden",
    });
  }

  const voteData = { id: vote.id, ...vote.data() } as Vote;

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

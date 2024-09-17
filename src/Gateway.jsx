import { doc, getDoc } from "firebase/firestore/lite";
import React from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { db } from "./firebase";

export default function Gateway() {
  const { voteData } = useLoaderData();

  const navigate = useNavigate();

  React.useEffect(() => {
    if (!voteData.active || Date.now() > voteData.endTime.seconds * 1000) {
      navigate(`/r/${voteData.id}`);
      return;
    }
    if (Date.now() < voteData.startTime.seconds * 1000) {
      navigate(`/s/${voteData.id}`);
      return;
    }
    if (localStorage.getItem(voteData.id)) {
      navigate(`/x/${voteData.id}`);
    }
    navigate(`/v/${voteData.id}`);
  }, []);
  return null;
}

export async function loader({ params }) {
  const vote = await getDoc(doc(db, `/votes/${params.id}`));
  if (!vote.exists()) {
    new Response("Not Found", {
      status: 404,
      statusText: "Wahl nicht gefunden",
    });
  }
  const voteData = { id: vote.id, ...vote.data() };

  return { voteData };
}

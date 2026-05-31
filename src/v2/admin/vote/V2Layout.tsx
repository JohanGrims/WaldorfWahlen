import { collection, doc, getDoc, getDocs, Timestamp, DocumentData } from "firebase/firestore";
import React from "react";
import { LoaderFunctionArgs, Outlet, useLoaderData, useNavigate } from "react-router-dom";
import { db } from "../../../firebase";
import { useDecryption } from "../../contexts";
import { alert } from "mdui";

export interface V2VoteData extends DocumentData {
  id: string;
  title: string;
  active: boolean;
  startTime: Timestamp;
  endTime: Timestamp;
}

export interface V2ChoiceData extends DocumentData {
  id: string; // Token
  selected: string[];
  timestamp: string;
}

export interface V2OptionData extends DocumentData {
  id: string;
  title: string;
  max: number;
}

export interface V2ResultData extends DocumentData {
  id: string;
  points: number[];
  selected: string[];
}

export interface V2LoaderData {
  vote: V2VoteData;
  choices: V2ChoiceData[];
  options: V2OptionData[];
  results: V2ResultData[];
}

export default function V2Layout() {
  const { vote, choices } = useLoaderData() as V2LoaderData;
  const navigate = useNavigate();
  const { isDecrypted, decryptFile } = useDecryption();

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await decryptFile(file);
    } catch (err) {
      alert({ headline: "Fehler", description: "Die Datei konnte nicht gelesen werden." });
    }
    e.target.value = "";
  };

  if (!isDecrypted) {
    return (
      <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
        <h2>Verwaltung: {vote.title}</h2>
        <p style={{ color: "var(--mdui-color-on-surface-variant)" }}>
          Pseudonymisierte Wahl. {choices.length} Stimmen abgegeben.
        </p>
        <mdui-card variant="outlined" style={{ padding: 24, marginTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <mdui-icon name="lock" style={{ fontSize: 48, color: "var(--mdui-color-primary)" }}></mdui-icon>
            <h3>Daten entschlüsseln</h3>
            <p style={{ textAlign: "center", maxWidth: 500 }}>
              Die Daten auf dem Server sind pseudonymisiert (Zero-PII). 
              Laden Sie die originale Schüler-Excel-Datei hoch, um die Hashes lokal zuzuordnen und die Verwaltungswerkzeuge freizuschalten.
            </p>
            <mdui-button icon="lock_open" onClick={() => document.getElementById("decrypt-upload")?.click()}>
              Schlüssel-Excel hochladen
            </mdui-button>
            <input 
              id="decrypt-upload" 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              style={{ display: "none" }} 
              onChange={handleExcelUpload} 
            />
          </div>
        </mdui-card>
      </div>
    );
  }

  return (
    <>
      <Outlet />
    </>
  );
}

V2Layout.loader = async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params as { id: string };
  const voteSnap = await getDoc(doc(db, `schools/SCHOOLID/v2_votes/${id}`));
  if (!voteSnap.exists()) {
    throw new Response("Seite nicht gefunden", { status: 404 });
  }
  const voteData = { id: voteSnap.id, ...voteSnap.data() } as V2VoteData;

  const choicesSnap = await getDocs(collection(db, `schools/SCHOOLID/v2_votes/${id}/choices`));
  const choiceData = choicesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as V2ChoiceData[];

  const optionsSnap = await getDocs(collection(db, `schools/SCHOOLID/v2_votes/${id}/options`));
  let optionData = optionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as V2OptionData[];

  const resultsSnap = await getDocs(collection(db, `schools/SCHOOLID/v2_votes/${id}/results`));
  const resultData = resultsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as V2ResultData[];

  return {
    vote: voteData,
    choices: choiceData,
    options: optionData,
    results: resultData,
  };
};

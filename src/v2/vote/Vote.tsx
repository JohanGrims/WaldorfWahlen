import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { db } from "../../firebase";
import { alert, snackbar } from "mdui";
import "mdui/mdui.css";

interface V2VoteData {
  title: string;
  description?: string;
  selectCount: number;
  active: boolean;
  startTime: any;
  endTime: any;
  allowProposals?: boolean;
  options: { id: string; title: string; max: number; teacher?: string; description?: string }[];
}

export default function V2Vote() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t") || searchParams.get("token"); // This is the hash of the email
  const isPreview = searchParams.get("preview") === "true";

  const [vote, setVote] = useState<V2VoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Proposal state
  const [mode, setMode] = useState<"vote" | "propose">("vote");
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalTeacher, setProposalTeacher] = useState("");
  const [proposalMax, setProposalMax] = useState<number | "">("");
  const [proposalDesc, setProposalDesc] = useState("");

  useEffect(() => {
    async function load() {
      if (!id || (!token && !isPreview)) {
        setLoading(false);
        return;
      }
      try {
        // Assume vote configs are in schools/SCHOOLID/v2_votes
        const docSnap = await getDoc(doc(db, `schools/SCHOOLID/v2_votes/${id}`));
        if (docSnap.exists()) {
          const data = docSnap.data() as V2VoteData;
          
          // Fetch options from subcollection
          const optionsSnap = await getDocs(collection(db, `schools/SCHOOLID/v2_votes/${id}/options`));
          const options = optionsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any;
          
          data.options = options;

          setVote(data);
          setSelected(Array(data.selectCount).fill("null"));
        }
      } catch (err) {
        console.error("Error loading vote:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, token]);

  const toggleSelect = (index: number, optionId: string) => {
    const newSelected = [...selected];
    if (newSelected[index] === optionId) {
      newSelected[index] = "null";
    } else {
      newSelected[index] = optionId;
    }
    setSelected(newSelected);
  };

  const isFormValid = !selected.includes("null");

  const submitProposal = async () => {
    if (!id || (!token && !isPreview) || !proposalTitle || !proposalMax) return;
    setSubmitting(true);
    try {
      if (!isPreview) {
        await addDoc(collection(db, `schools/SCHOOLID/v2_votes/${id}/proposals`), {
          title: proposalTitle,
          teacher: proposalTeacher,
          max: proposalMax,
          description: proposalDesc,
          timestamp: new Date().toISOString()
        });
      }
      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting proposal:", err);
      alert({ headline: "Fehler", description: "Fehler beim Absenden des Vorschlags." });
    } finally {
      setSubmitting(false);
    }
  };

  const submitVote = async () => {
    if (!id || (!token && !isPreview) || !isFormValid) return;
    setSubmitting(true);
    try {
      // Save directly to Firestore using the token as the document ID
      // Zero PII is sent here.
      await setDoc(doc(db, `schools/SCHOOLID/v2_votes/${id}/choices/${token}`), {
        selected,
        timestamp: new Date().toISOString()
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting vote:", err);
      alert({ headline: "Fehler", description: "Fehler beim Absenden der Wahl." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!token && !isPreview) {
    return <div style={{ padding: 20 }}>Fehler: Ungültiger Zugangslink. Das Token fehlt.</div>;
  }

  if (loading) {
    return <div style={{ padding: 20 }}><mdui-circular-progress></mdui-circular-progress></div>;
  }

  if (!vote) {
    return <div style={{ padding: 20 }}>Wahl nicht gefunden.</div>;
  }

  if (submitted) {
    return (
      <div style={{ padding: 40, textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
        <mdui-icon name="check_circle" style={{ fontSize: 64, color: "var(--mdui-color-primary)" }}></mdui-icon>
        <h2>Vielen Dank!</h2>
        <p>Ihre Wahl wurde erfolgreich und pseudonymisiert gespeichert.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h1>{vote.title}</h1>
      {vote.description && <p>{vote.description}</p>}
      
      <p>Sie geben Ihre Stimme pseudonymisiert ab.</p>
      {isPreview && (
        <div style={{ backgroundColor: "#ffcc00", color: "#000", padding: "10px", borderRadius: "8px", marginBottom: "20px" }}>
          <strong>Vorschau-Modus:</strong> Dies ist eine Vorschau. Einsendungen werden nicht gespeichert.
        </div>
      )}
      <br/>

      {vote.allowProposals && (
        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          <mdui-button 
            variant={mode === "vote" ? "filled" : "outlined"} 
            onClick={() => setMode("vote")}
            style={{ flex: 1 }}
          >
            Abstimmen
          </mdui-button>
          <mdui-button 
            variant={mode === "propose" ? "filled" : "outlined"} 
            onClick={() => setMode("propose")}
            style={{ flex: 1 }}
          >
            Projekt vorschlagen
          </mdui-button>
        </div>
      )}

      {mode === "vote" && Array.from({ length: vote.selectCount }).map((_, index) => (
        <div key={index} style={{ marginBottom: 40 }}>
          <h3>{index + 1}. Wahl</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
            {vote.options.map(option => {
              const isSelectedForThis = selected[index] === option.id;
              const isSelectedElsewhere = selected.includes(option.id) && !isSelectedForThis;
              return (
                <mdui-card
                  key={option.id}
                  variant={isSelectedForThis ? "filled" : "outlined"}
                  style={{
                    padding: 16,
                    cursor: isSelectedElsewhere ? "not-allowed" : "pointer",
                    opacity: isSelectedElsewhere ? 0.5 : 1,
                    border: isSelectedForThis ? "2px solid var(--mdui-color-primary)" : undefined
                  }}
                  onClick={() => {
                    if (!isSelectedElsewhere) toggleSelect(index, option.id);
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: 8 }}>{option.title}</div>
                  {option.teacher && <div style={{ fontSize: "0.9em", color: "gray" }}>{option.teacher}</div>}
                  {option.description && <div style={{ fontSize: "0.9em", marginTop: 8 }}>{option.description}</div>}
                </mdui-card>
              );
            })}
          </div>
        </div>
      ))}

      {mode === "vote" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <mdui-button
            end-icon="send"
            disabled={!isFormValid || submitting}
            loading={submitting}
            onClick={submitVote}
          >
            Absenden
          </mdui-button>
        </div>
      )}

      {mode === "propose" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3>Einen eigenen Vorschlag einreichen</h3>
          <p style={{ color: "gray", fontSize: "0.9em" }}>
            Ihr Vorschlag wird von den Administratoren geprüft und gegebenenfalls in die Wahl aufgenommen.
          </p>
          <mdui-text-field 
            label="Titel des Projekts" 
            required 
            value={proposalTitle} 
            onInput={(e: any) => setProposalTitle(e.target.value)} 
          />
          <mdui-text-field 
            label="Leitung (z.B. Lehrer oder Schüler)" 
            value={proposalTeacher} 
            onInput={(e: any) => setProposalTeacher(e.target.value)} 
          />
          <mdui-text-field 
            label="Maximale Anzahl Schüler" 
            type="number" 
            required 
            value={proposalMax.toString()} 
            onInput={(e: any) => setProposalMax(parseInt(e.target.value))} 
          />
          <mdui-text-field 
            label="Beschreibung" 
            rows={4} 
            value={proposalDesc} 
            onInput={(e: any) => setProposalDesc(e.target.value)} 
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <mdui-button
              end-icon="send"
              disabled={!proposalTitle || !proposalMax || submitting}
              loading={submitting}
              onClick={submitProposal}
            >
              Vorschlag einreichen
            </mdui-button>
          </div>
        </div>
      )}
    </div>
  );
}

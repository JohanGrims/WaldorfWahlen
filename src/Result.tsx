import {
  collection,
  doc,
  getDoc,
  getDocs,
  DocumentData,
} from "firebase/firestore";
import React from "react";
import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { db } from "./firebase";
import { confirm } from "mdui";

interface VoteData extends DocumentData {
  result: boolean;
}

interface OptionData extends DocumentData {
  id: string;
  title: string;
}

interface CommentData {
  from: string;
  text: string;
  timestamp: number;
}

interface VoteResultData extends DocumentData {
  result: string;
  comments?: CommentData[];
}

interface LoaderData {
  vote: VoteData;
  options: OptionData[];
}

export default function Result() {
  let { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vote, options } = useLoaderData() as LoaderData;
  const { result } = vote;

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlChoiceId = urlParams.get("id");
  const urlName = urlParams.get("name");
  const urlGrade = urlParams.get("grade");
  const urlListIndex = urlParams.get("listIndex");

  const [voteResult, setVoteResult] = React.useState<
    VoteResultData | undefined
  >(undefined);

  React.useEffect(() => {
    if (vote.result && id) {
      let choiceId: string | null = null;

      // First try to get choiceId from URL parameter
      if (urlChoiceId) {
        choiceId = urlChoiceId;
      } else {
        // Fallback to localStorage for backwards compatibility
        const storedItem = localStorage.getItem(id);
        if (storedItem) {
          choiceId = JSON.parse(storedItem).choiceId;
        }
      }

      if (choiceId) {
        getDoc(doc(db, `/votes/${id}/results/${choiceId}`)).then((docSnap) => {
          if (docSnap.exists()) {
            setVoteResult(docSnap.data() as VoteResultData);
          }
        });
      }
    }
  }, [id, vote.result, urlChoiceId]);

  if (!result) {
    return (
      <mdui-dialog open headline="Die Wahl ist beendet" icon="done">
        <div className="mdui-prose">
          <p>
            Die Wahl ist beendet. Es sind (noch) keine Ergebnisse online
            verfügbar. Bei Fragen oder Problemen melden Sie sich beim
            zuständigen Lehrer.
          </p>
        </div>
        <p />
        <div className="button-container">
          <mdui-button onClick={() => navigate("/")}>Startseite</mdui-button>
          {id &&
            localStorage.getItem(id) &&
            JSON.parse(localStorage.getItem(id)!).choiceId && (
              <mdui-button disabled variant="text">
                {JSON.parse(localStorage.getItem(id)!).choiceId}
              </mdui-button>
            )}
        </div>
      </mdui-dialog>
    );
  }

  if (!voteResult) {
    return (
      <mdui-dialog open headline="Das Wahlergebnis ist da!" icon="done">
        <div className="mdui-prose">
          {urlChoiceId ? (
            <>
              <p>
                Die Ergebnisse konnten nicht gefunden werden. Möglicherweise ist
                die ID ungültig.
              </p>
              <p>Kontaktieren Sie für die Ergebnisse den zuständigen Lehrer.</p>
            </>
          ) : (
            <>
              <p>
                Es sieht so aus, als hätten Sie aber nicht von diesem Gerät
                gewählt...
              </p>
              <p>Kontaktieren Sie für die Ergebnisse den zuständigen Lehrer.</p>
            </>
          )}
        </div>
        <p />
        <div className="button-container">
          <mdui-button onClick={() => navigate("/")}>Startseite</mdui-button>
        </div>
      </mdui-dialog>
    );
  }

  return (
    <mdui-dialog open headline="Das Wahlergebnis ist da!" icon="done">
      <div className="mdui-prose">
        <p>Es sieht so aus, als wären Sie im Projekt...</p>
        <p>...Trommelwirbel...</p>
        <b style={{ fontSize: "30px" }}>
          {options.find((option) => voteResult.result === option.id)?.title}
        </b>
      </div>
      <p />
      {voteResult.comments && voteResult.comments.length > 0 && (
        <mdui-list>
          {voteResult.comments.map((comment, index) => (
            <mdui-list-item
              rounded
              style={{
                width: "100%",
                padding: "20px",
              }}
              key={index}
              onClick={() => {
                confirm({
                  icon: "mail",
                  headline: "E-Mail senden",
                  description: `Möchten Sie eine E-Mail an ${comment.from} senden?`,
                  onConfirm: () => {
                    window.open(`mailto:${comment.from}`);
                  },
                  confirmText: "Ja",
                  cancelText: "Nein",
                });
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "20px",
                }}
              >
                <mdui-avatar slot="icon">
                  {comment.from
                    .split(/[@.]/)
                    .slice(0, 2)
                    .map((part) => part.charAt(0).toUpperCase())
                    .join("")}
                </mdui-avatar>

                {comment.text}

                <mdui-icon name="comment"></mdui-icon>
              </div>
            </mdui-list-item>
          ))}
        </mdui-list>
      )}
      {voteResult.comments && <p />}
      <div className="button-container">
        <mdui-button onClick={() => navigate("/")}>Startseite</mdui-button>
      </div>
    </mdui-dialog>
  );
}

export async function loader({ params }: { params: { id: string } }) {
  const { id } = params;
  const vote = (await getDoc(doc(db, `/votes/${id}`))).data() as VoteData;
  const options = (
    await getDocs(collection(db, `/votes/${id}/options`))
  ).docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  }) as OptionData[];

  return { vote, options };
}

import { doc, getDoc, DocumentData, Timestamp } from "firebase/firestore";
import { snackbar } from "mdui";
import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { db } from "../../../firebase";
import { DrawerItem } from "../../../admin/navigation/components";

interface VoteDrawerProps {
  onClose?: () => void;
}

interface VoteData extends DocumentData {
  title: string;
  active: boolean;
  endTime: Timestamp;
  startTime: Timestamp;
}

export default function V2VoteDrawer({ onClose = () => {} }: VoteDrawerProps) {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [data, setData] = React.useState<VoteData | null>(null);

  const [active, setActive] = React.useState<string | undefined>(undefined);

  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  React.useEffect(() => {
    setActive(location.pathname.split("/")[6]);
  }, [location]);

  React.useEffect(() => {
    setData(null);
    if (!id) return;
    getDoc(doc(db, `schools/SCHOOLID/v2_votes/${id}`))
      .then(async (request) => {
        if (!request.exists()) {
          snackbar({ message: "Wahl existiert nicht." });
          navigate("/v2/admin");
        }
        const data = request.data() as VoteData;
        setData(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        snackbar({ message: "Fehler beim Laden der Wahl." });
        navigate("/v2/admin");
      });
  }, [id]);

  const navigateTo = (path: string) => {
    navigate(path);
    onClose();
  };

  if (loading || !data) {
    return (
      <mdui-navigation-drawer open>
        <mdui-list
          style={{
            margin: "0 0.5rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DrawerItem
            icon={"arrow_back"}
            title={""}
            onClick={() => navigateTo("/v2/admin")}
          />
          <mdui-linear-progress></mdui-linear-progress>
        </mdui-list>
      </mdui-navigation-drawer>
    );
  }

  return (
    <mdui-navigation-drawer open>
      <title>{data.title} - Admin</title>
      <mdui-list
        style={{
          margin: "0 0.5rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <mdui-tooltip
          variant="rich"
          headline="Zurück"
          content="Kehren Sie zur Übersicht zurück."
        >
          <DrawerItem
            icon={"arrow_back"}
            title={data?.title}
            onClick={() => navigate("/v2/admin")}
          />
        </mdui-tooltip>
        <mdui-divider></mdui-divider>
        <br />
        <mdui-tooltip
          variant="rich"
          headline="Wahl bearbeiten"
          content="Bearbeiten Sie die Wahleinstellungen und möglichen Optionen."
        >
          <DrawerItem
            icon={"edit"}
            title={"Bearbeiten"}
            active={active === "edit"}
            onClick={() => navigateTo(`/v2/admin/vote/${id}/manage/edit`)}
          />
        </mdui-tooltip>

        <DrawerItem
          icon={"dashboard"}
          title={"Übersicht"}
          active={active === undefined}
          onClick={() => navigateTo(`/v2/admin/vote/${id}/manage`)}
        />
        <DrawerItem
          icon={
            data.active && data.endTime.seconds * 1000 > Date.now()
              ? data.startTime.seconds * 1000 < Date.now()
                ? "pause"
                : "scheduled"
              : "play_arrow"
          }
          title={
            data.active && data.endTime.seconds * 1000 > Date.now()
              ? data.startTime.seconds * 1000 < Date.now()
                ? "Beenden"
                : "Planen"
              : "Starten"
          }
          active={active === "schedule"}
          onClick={() => navigateTo(`/v2/admin/vote/${id}/manage/schedule`)}
        />
        <DrawerItem
          icon={"people"}
          title={"Antworten"}
          active={active === "answers"}
          onClick={() => navigateTo(`/v2/admin/vote/${id}/manage/answers`)}
        />
        <DrawerItem
          icon={"forward_to_inbox"}
          title={"E-Mail"}
          active={active === "email"}
          onClick={() => navigateTo(`/v2/admin/vote/${id}/manage/email`)}
        />
        <br />
        <mdui-divider></mdui-divider>
        <br />
        <DrawerItem
          icon={"auto_awesome"}
          title={"Zuteilen"}
          active={active === "assign"}
          onClick={() => navigateTo(`/v2/admin/vote/${id}/manage/assign`)}
        />
        <DrawerItem
          icon={"bar_chart"}
          title={"Ergebnisse"}
          active={active === "results"}
          onClick={() => navigateTo(`/v2/admin/vote/${id}/manage/results`)}
        />
        <DrawerItem
          icon={"downloading"}
          title={"Exportieren"}
          active={active === "exports"}
          onClick={() => navigateTo(`/v2/admin/vote/${id}/manage/exports`)}
        />
        <br />
        <mdui-divider></mdui-divider>
        <br />
        <DrawerItem
          icon="visibility"
          title="Vorschau"
          active={active === "preview"}
          onClick={() => window.open(`/v2/vote/${id}?preview=true`, "_blank")}
        />
      </mdui-list>
    </mdui-navigation-drawer>
  );
}

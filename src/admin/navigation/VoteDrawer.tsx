import { doc, getDoc, DocumentData, Timestamp } from "firebase/firestore";
import { snackbar } from "mdui";
import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { db } from "../../firebase";
import { DrawerItem } from "./components";
import { Helmet } from "react-helmet";

interface VoteDrawerProps {
  onClose?: () => void;
}

interface VoteData extends DocumentData {
  title: string;
  active: boolean;
  endTime: Timestamp;
  startTime: Timestamp;
}

export default function VoteDrawer({ onClose = () => {} }: VoteDrawerProps) {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [data, setData] = React.useState<VoteData | null>(null);

  const [active, setActive] = React.useState<string | undefined>(undefined);

  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  React.useEffect(() => {
    setActive(location.pathname.split("/")[3]);
  }, [location]);

  React.useEffect(() => {
    setData(null);
    if (!id) return;
    getDoc(doc(db, `/votes/${id}`))
      .then(async (request) => {
        if (!request.exists()) {
          snackbar({ message: "Wahl existiert nicht." });
          navigate("/admin");
        }
        const data = request.data() as VoteData;
        setData(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        snackbar({ message: "Fehler beim Laden der Wahl." });
        navigate("/admin");
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
            onClick={() => navigateTo("/admin")}
          />
          <mdui-linear-progress></mdui-linear-progress>
        </mdui-list>
      </mdui-navigation-drawer>
    );
  }

  return (
    <mdui-navigation-drawer open>
      <Helmet>
        <title>{data.title} - Admin</title>
      </Helmet>
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
            onClick={() => navigate("/admin")}
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
            onClick={() => navigateTo(`/admin/${id}/edit`)}
          />
        </mdui-tooltip>

        <DrawerItem
          icon={"dashboard"}
          title={"Übersicht"}
          active={active === undefined}
          onClick={() => navigateTo(`/admin/${id}`)}
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
          onClick={() => navigateTo(`/admin/${id}/schedule`)}
        />
        <DrawerItem
          icon={"people"}
          title={"Antworten"}
          active={active === "answers"}
          onClick={() => navigateTo(`/admin/${id}/answers`)}
        />
        <DrawerItem
          icon={"forward_to_inbox"}
          title={"E-Mail"}
          active={active === "email"}
          onClick={() => navigateTo(`/admin/${id}/email`)}
        />
        <br />
        <mdui-divider></mdui-divider>
        <br />
        <DrawerItem
          icon={"fact_check"}
          title={"Abgleichen"}
          active={active === "match"}
          onClick={() => navigateTo(`/admin/${id}/match`)}
        />
        <DrawerItem
          icon={"add"}
          title={"Hinzufügen"}
          active={active === "add"}
          onClick={() => navigateTo(`/admin/${id}/add`)}
        />
        <DrawerItem
          icon={"auto_awesome"}
          title={"Zuteilen"}
          active={active === "assign" || active === "manually"}
          onClick={() => navigateTo(`/admin/${id}/assign`)}
        />
        <DrawerItem
          icon={"bar_chart"}
          title={"Ergebnisse"}
          active={active === "results"}
          onClick={() => navigateTo(`/admin/${id}/results`)}
        />
        <DrawerItem
          icon={"trending_up"}
          title={"Statistiken"}
          active={active === "stats"}
          onClick={() => navigateTo(`/admin/${id}/stats`)}
        />
        <br />
        <mdui-divider></mdui-divider>
        <br />
        <DrawerItem
          icon="visibility"
          title="Vorschau"
          active={active === "preview"}
          onClick={() => window.open(`/v/${id}?preview=true`, "_blank")}
        />
        <DrawerItem
          icon={"share"}
          title={"Teilen"}
          active={active === "share"}
          onClick={() => navigateTo(`/admin/${id}/share`)}
        />
        <DrawerItem
          icon={"delete"}
          title={"Löschen"}
          active={active === "delete"}
          onClick={() => navigateTo(`/admin/${id}/delete`)}
        />
      </mdui-list>
    </mdui-navigation-drawer>
  );
}

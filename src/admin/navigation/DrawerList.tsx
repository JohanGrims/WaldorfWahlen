import { collection, getDocs, Timestamp } from "firebase/firestore";
import { snackbar } from "mdui";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { DrawerItem } from "./components";
import VoteDrawer from "./VoteDrawer";
import routes from "./routes.json";

interface VoteData {
  id: string;
  title: string;
  version: string;
  startTime: Timestamp;
  endTime: Timestamp;
  active?: boolean;
}

interface DrawerListProps {
  onClose?: () => void;
  mobile: boolean;
}

let pages = [undefined, ...routes];

export default function DrawerList({
  onClose = () => {},
  mobile,
}: DrawerListProps) {
  const [activeVotes, setActiveVotes] = React.useState<VoteData[]>([]);
  const [expiredVotes, setExpiredVotes] = React.useState<VoteData[]>([]);
  const [scheduledVotes, setScheduledVotes] = React.useState<VoteData[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  const [active, setActive] = React.useState<string | undefined>(undefined);

  const navigate = useNavigate();

  React.useEffect(() => {
    setActiveVotes([]);
    setExpiredVotes([]);
    setScheduledVotes([]);
    getDocs(collection(db, "/votes"))
      .then((data) => {
        data.docs.map((e) => {
          let data = e.data() as VoteData;
          if (data.active && data.endTime.seconds * 1000 > Date.now()) {
            if (data.startTime.seconds * 1000 > Date.now()) {
              setScheduledVotes((scheduledVotes) => [
                ...scheduledVotes,
                {
                  id: e.id,
                  title: data.title,
                  version: data.version,
                  startTime: data.startTime,
                  endTime: data.endTime,
                },
              ]);
            } else {
              setActiveVotes((activeVotes) => [
                ...activeVotes,
                {
                  id: e.id,
                  title: data.title,
                  version: data.version,
                  startTime: data.startTime,
                  endTime: data.endTime,
                },
              ]);
            }
          } else {
            setExpiredVotes((expiredVotes) => [
              ...expiredVotes,
              {
                id: e.id,
                title: data.title,
                version: data.version,
                startTime: data.startTime,
                endTime: data.endTime,
              },
            ]);
          }
        });

        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        snackbar({ message: "Fehler beim Laden der Wahlen." });
        setLoading(false);
      });
  }, []);

  const location = useLocation();

  React.useEffect(() => {
    setActive(location.pathname.split("/")[2]);
  }, [location]);

  if (!pages.includes(active)) {
    return <VoteDrawer onClose={onClose} />;
  }

  const navigateTo = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <mdui-navigation-drawer open>
      <mdui-list
        style={{
          margin: "0 0.5rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {mobile ? (
          <div
            style={{
              position: "sticky",
              top: 8,
              zIndex: 1,
            }}
          >
            <mdui-card
              variant="outlined"
              style={{
                width: "100%",
              }}
            >
              <mdui-list-item rounded onClick={onClose} icon="close">
                Schließen
              </mdui-list-item>
            </mdui-card>
          </div>
        ) : (
          <mdui-list-item disabled>
            <mdui-list-item-content>Administrator</mdui-list-item-content>
          </mdui-list-item>
        )}
        {loading && <mdui-linear-progress></mdui-linear-progress>}

        <mdui-tooltip
          variant="rich"
          headline="Neue Wahlen erstellen"
          content="Erstellen Sie eine neue Wahlen, um Ihre Schüler Projekten zuzuteilen."
        >
          <DrawerItem
            active={active === "new"}
            title={"Erstellen"}
            icon={"create"}
            onClick={() => navigateTo("/admin/new")}
          />
        </mdui-tooltip>

        <DrawerItem
          active={active === undefined}
          title={"Dashboard"}
          icon={"home"}
          onClick={() => navigateTo("/admin")}
        />

        <mdui-collapse accordion value="active-votes">
          <mdui-collapse-item value="active-votes">
            <mdui-list-item
              rounded
              icon="check_circle--outlined"
              end-icon="expand_more"
              slot="header"
            >
              <mdui-list-item-content>Laufende Wahlen</mdui-list-item-content>
            </mdui-list-item>
            <div style={{ padding: "0 1rem" }}>
              {loading ? (
                <mdui-list-item disabled>wird geladen...</mdui-list-item>
              ) : (
                <>
                  {activeVotes.length === 0 && (
                    <mdui-list-item disabled>Keine Wahlen</mdui-list-item>
                  )}
                  {activeVotes
                    .sort((a, b) => {
                      return b.startTime.seconds - a.startTime.seconds;
                    })
                    .map((e) => (
                      <mdui-tooltip
                        key={e.id}
                        variant="rich"
                        headline="Wahl bearbeiten"
                        content="Bearbeiten Sie die Wahl, setzen Sie die Einstellungen und weisen Sie Schüler zu."
                      >
                        <DrawerItem
                          active={active === e.id}
                          title={e.title}
                          onClick={() => navigateTo(`/admin/${e.id}`)}
                        />
                      </mdui-tooltip>
                    ))}
                </>
              )}
            </div>
          </mdui-collapse-item>

          <mdui-collapse-item value="scheduled-votes">
            <mdui-list-item
              rounded
              icon="scheduled"
              end-icon="expand_more"
              slot="header"
            >
              <mdui-list-item-content>Geplante Wahlen</mdui-list-item-content>
            </mdui-list-item>
            <div style={{ padding: "0 1rem" }}>
              {loading ? (
                <mdui-list-item disabled>wird geladen...</mdui-list-item>
              ) : (
                <>
                  {scheduledVotes.length === 0 && (
                    <mdui-list-item disabled>Keine Wahlen</mdui-list-item>
                  )}
                  {scheduledVotes
                    .sort((a, b) => {
                      return b.startTime.seconds - a.startTime.seconds;
                    })
                    .map((e) => (
                      <mdui-tooltip
                        key={e.id}
                        variant="rich"
                        headline="Wahl bearbeiten"
                        content="Bearbeiten Sie die Wahl, setzen Sie die Einstellungen und weisen Sie Schüler zu."
                      >
                        <DrawerItem
                          active={active === e.id}
                          title={e.title}
                          onClick={() => navigateTo(`/admin/${e.id}`)}
                        />
                      </mdui-tooltip>
                    ))}
                </>
              )}
            </div>
          </mdui-collapse-item>

          <mdui-collapse-item value="expired-votes">
            <mdui-list-item
              rounded
              icon="history"
              end-icon="expand_more"
              slot="header"
            >
              <mdui-list-item-content>Beendete Wahlen</mdui-list-item-content>
            </mdui-list-item>
            <div style={{ padding: "0 1rem" }}>
              {loading ? (
                <mdui-list-item disabled>wird geladen...</mdui-list-item>
              ) : (
                <>
                  {expiredVotes.length === 0 && (
                    <mdui-list-item disabled>Keine Wahlen</mdui-list-item>
                  )}
                  {expiredVotes
                    .sort((a, b) => {
                      return b.startTime.seconds - a.startTime.seconds;
                    })
                    .map((e) => (
                      <mdui-tooltip
                        key={e.id}
                        variant="rich"
                        headline="Wahl bearbeiten"
                        content="Bearbeiten Sie die Wahl, setzen Sie die Einstellungen und weisen Sie Schüler zu."
                      >
                        <DrawerItem
                          active={active === e.id}
                          title={e.title}
                          onClick={() => navigateTo(`/admin/${e.id}`)}
                        />
                      </mdui-tooltip>
                    ))}
                </>
              )}
            </div>
          </mdui-collapse-item>
        </mdui-collapse>
        <br />
        <mdui-divider />
        <br />
        <mdui-tooltip
          variant="rich"
          headline="Exportieren"
          content="Exportieren Sie die Ergebnisse der Wahlen."
        >
          <DrawerItem
            active={active === "exports"}
            title={"Exportieren"}
            icon={"downloading"}
            onClick={() => navigateTo("/admin/exports")}
          />
        </mdui-tooltip>
        <mdui-tooltip
          variant="rich"
          headline="Klassen"
          content="Verwalten Sie die Klassen und SchülerInnen."
        >
          <DrawerItem
            active={active === "students"}
            title={"SchülerInnen"}
            icon={"groups"}
            onClick={() => navigateTo("/admin/students/new-class")}
          />
        </mdui-tooltip>
        <br />
        <mdui-divider />
        <br />
        <mdui-tooltip
          variant="rich"
          headline="Neue Features"
          content="Sehen Sie sich die neuesten Funktionen an."
        >
          <DrawerItem
            active={active === "changelog"}
            title={"Neue Features"}
            icon={"tips_and_updates"}
            onClick={() => navigateTo("/admin/changelog")}
          />
        </mdui-tooltip>

        <mdui-tooltip
          variant="rich"
          headline="Hilfe & Kontakt"
          content="Kontaktieren Sie den Entwickler, um Hilfe zu erhalten."
        >
          <DrawerItem
            active={active === "help"}
            title={"Hilfe & Kontakt"}
            icon={"support"}
            onClick={() => navigateTo("/admin/help")}
          />
        </mdui-tooltip>
        <mdui-tooltip
          variant="rich"
          headline="Admins"
          content="Verwalten Sie die Administratoren der Anwendung."
        >
          <DrawerItem
            active={active === "admins"}
            title={"Administratoren"}
            icon={"manage_accounts"}
            onClick={() => navigateTo("/admin/admins")}
          />
        </mdui-tooltip>

        <mdui-tooltip
          variant="rich"
          headline="Einstellungen"
          content="Passen Sie die Einstellungen der Anwendung an."
        >
          <DrawerItem
            active={active === "settings"}
            title={"Einstellungen"}
            icon={"settings"}
            onClick={() => navigateTo("/admin/settings")}
          />
        </mdui-tooltip>
      </mdui-list>
    </mdui-navigation-drawer>
  );
}

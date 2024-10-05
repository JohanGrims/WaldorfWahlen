import { collection, getDocs } from "firebase/firestore/lite";
import { snackbar } from "mdui";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { DrawerItem } from "./components";
import VoteDrawer from "./VoteDrawer";

let pages = [undefined, "new", "settings", "students"];

export default function DrawerList() {
  const [activeVotes, setActiveVotes] = React.useState([]);
  const [expiredVotes, setExpiredVotes] = React.useState([]);
  const [scheduledVotes, setScheduledVotes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const [active, setActive] = React.useState(undefined);

  const navigate = useNavigate();

  React.useEffect(() => {
    setActiveVotes([]);
    setExpiredVotes([]);
    setScheduledVotes([]);
    getDocs(collection(db, "/votes"))
      .then((data) => {
        data.docs.map((e) => {
          let data = e.data();
          console.log(data.version > 1);
          if (data.active && data.endTime.seconds * 1000 > Date.now()) {
            if (data.startTime.seconds * 1000 > Date.now()) {
              setScheduledVotes((scheduledVotes) => [
                ...scheduledVotes,
                { id: e.id, title: data.title, version: data.version },
              ]);
            } else {
              setActiveVotes((activeVotes) => [
                ...activeVotes,
                { id: e.id, title: data.title, version: data.version },
              ]);
            }
          } else {
            setExpiredVotes((expiredVotes) => [
              ...expiredVotes,
              { id: e.id, title: data.title, version: data.version },
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

  console.log(active, pages.includes(active));

  if (!pages.includes(active)) {
    return <VoteDrawer />;
  }

  return (
    <mdui-navigation-drawer open>
      <mdui-list
        style={{
          margin: "0 0.5rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <mdui-list-item disabled>
          <mdui-list-item-content>Administrator</mdui-list-item-content>
        </mdui-list-item>
        {loading && <mdui-linear-progress indeterminate></mdui-linear-progress>}

        <mdui-tooltip
          variant="rich"
          headline="Neue Wahlen erstellen"
          content="Erstellen Sie eine neue Wahlen, um Ihre Schüler Projekten zuzuteilen."
        >
          <DrawerItem
            active={active === "new"}
            title={"Erstellen"}
            icon={"create"}
            onCLick={() => navigate("/admin/new")}
          />
        </mdui-tooltip>

        <DrawerItem
          active={active === undefined}
          title={"Dashboard"}
          icon={"home"}
          onCLick={() => navigate("/admin")}
        />

        <mdui-collapse
          accordion
          onChange={(e) => console.log(e)}
          value="active-votes"
        >
          <mdui-collapse-item value="active-votes">
            <mdui-list-item
              rounded
              icon="check_circle--outlined"
              end-icon="expand_more"
              slot="header"
            >
              <mdui-list-item-content>Aktive Wahlen</mdui-list-item-content>
            </mdui-list-item>
            <div style={{ padding: "0 1rem" }}>
              {loading ? (
                <mdui-list-item disabled>wird geladen...</mdui-list-item>
              ) : (
                <>
                  {activeVotes.length === 0 && (
                    <mdui-list-item disabled>Keine Wahlen</mdui-list-item>
                  )}
                  {activeVotes.map((e) => (
                    <mdui-tooltip
                      variant="rich"
                      headline="Wahl bearbeiten"
                      content="Bearbeiten Sie die Wahl, setzen Sie die Einstellungen und weisen Sie Schüler zu."
                    >
                      <DrawerItem
                        active={active === e.id}
                        title={e.title}
                        onCLick={() => navigate(`/admin/${e.id}`)}
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
                  {scheduledVotes.map((e) => (
                    <mdui-tooltip
                      variant="rich"
                      headline="Wahl bearbeiten"
                      content="Bearbeiten Sie die Wahl, setzen Sie die Einstellungen und weisen Sie Schüler zu."
                    >
                      <DrawerItem
                        active={active === e.id}
                        title={e.title}
                        onCLick={() => navigate(`/admin/${e.id}`)}
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
                  {expiredVotes.map((e) => (
                    <mdui-tooltip
                      variant="rich"
                      headline="Wahl bearbeiten"
                      content="Bearbeiten Sie die Wahl, setzen Sie die Einstellungen und weisen Sie Schüler zu."
                    >
                      <DrawerItem
                        active={active === e.id}
                        title={e.title}
                        onCLick={() => navigate(`/admin/${e.id}`)}
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
        <DrawerItem
          active={active === "students"}
          title={"SchülerInnen"}
          icon={"people"}
          onCLick={() => navigate("/admin/students")}
        />

        <br />

        <mdui-divider />
        <br />

        <mdui-tooltip
          variant="rich"
          headline="Einstellungen"
          content="Passen Sie die Einstellungen der Anwendung an."
        >
          <DrawerItem
            active={active === "settings"}
            title={"Einstellungen"}
            icon={"settings"}
            onCLick={() => navigate("/admin/settings")}
          />
        </mdui-tooltip>
      </mdui-list>
    </mdui-navigation-drawer>
  );
}

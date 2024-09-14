import { collection, getDocs } from "firebase/firestore/lite";
import React from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";

export default function DrawerList() {
  const [activeVotes, setActiveVotes] = React.useState([]);
  const [expiredVotes, setExpiredVotes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const [active, setActive] = React.useState("");

  const navigate = useNavigate();

  React.useEffect(() => {
    getDocs(collection(db, "/votes"))
      .then((data) => {
        data.docs.map((e) => {
          let data = e.data();
          console.log(data.version > 1);
          if (data.active) {
            setActiveVotes((activeVotes) => [
              ...activeVotes,
              { id: e.id, title: data.title, version: data.version },
            ]);
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
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ width: "30vw" }} />;
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
          <mdui-list-item-content>
            {auth.currentUser.email}
          </mdui-list-item-content>
        </mdui-list-item>
        <mdui-list-item
          rounded
          icon="create"
          onClick={() => navigate("/admin/new")}
        >
          <mdui-list-item-content>Erstellen</mdui-list-item-content>
        </mdui-list-item>

        <mdui-list-item
          rounded
          active
          icon="home"
          onClick={() => navigate("/admin")}
        >
          <mdui-list-item-content>Dashboard</mdui-list-item-content>
        </mdui-list-item>

        <mdui-collapse
          accordion
          onChange={(e) => console.log(e)}
          value={active}
        >
          <mdui-collapse-item value="active-votes">
            <mdui-list-item
              rounded
              icon="poll--outlined"
              end-icon="expand_more"
              slot="header"
            >
              <mdui-list-item-content>Aktive Umfragen</mdui-list-item-content>
            </mdui-list-item>
            <div style={{ padding: "0 1rem" }}>
              {activeVotes.length === 0 && (
                <mdui-list-item disabled>Keine Umfragen</mdui-list-item>
              )}
              {activeVotes.map((e) => (
                <mdui-list-item
                  rounded
                  key={e.id}
                  onClick={() => navigate(`/admin/${e.id}`)}
                >
                  {e.title}
                </mdui-list-item>
              ))}
            </div>
          </mdui-collapse-item>

          <mdui-collapse-item value="expired-votes">
            <mdui-list-item
              rounded
              icon="restore"
              end-icon="expand_more"
              slot="header"
            >
              <mdui-list-item-content>Beendete Umfragen</mdui-list-item-content>
            </mdui-list-item>
            <div style={{ padding: "0 1rem" }}>
              {expiredVotes.length === 0 && (
                <mdui-list-item disabled>Keine Umfragen</mdui-list-item>
              )}
              {expiredVotes.map((e) => (
                <mdui-list-item
                  rounded
                  key={e.id}
                  onClick={() => navigate(`/admin/${e.id}`)}
                >
                  {e.title}
                </mdui-list-item>
              ))}
            </div>
          </mdui-collapse-item>
        </mdui-collapse>
        <div style={{ height: "1rem" }} />
        <mdui-divider />
        <mdui-list-item
          rounded
          alignment="center"
          icon="settings"
          onClick={() => navigate("/admin/settings")}
        >
          <mdui-list-item-content>Einstellungen</mdui-list-item-content>
        </mdui-list-item>
        <mdui-list-item
          rounded
          icon="people"
          onClick={() => navigate("/admin/users")}
        >
          <mdui-list-item-content>Administratoren</mdui-list-item-content>
        </mdui-list-item>
      </mdui-list>
    </mdui-navigation-drawer>
  );
}

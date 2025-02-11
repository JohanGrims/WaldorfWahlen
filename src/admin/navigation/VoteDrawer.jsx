import { doc, getDoc } from "firebase/firestore";
import { snackbar } from "mdui";
import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { db } from "../../firebase";
import { DrawerItem } from "./components";

/**
 * A React component that renders a navigation drawer for managing voting-related actions in the admin panel.
 *
 * The VoteDrawer component fetches voting details from Firestore using the "id" URL parameter upon mounting. It updates
 * its active navigation state based on the current route and conditionally renders various navigation items for actions
 * such as editing vote settings, viewing overviews, scheduling or starting votes, handling responses, matching, adding options,
 * assigning options, checking results, previewing, sharing, or deleting a vote. If voting data is still being fetched or is not
 * available, the component displays a loading state with a progress indicator.
 *
 * Navigation is managed via React Router's "navigate" function and through a helper function "navigateTo", which also invokes
 * the optional "onClose" callback to handle drawer closing. In scenarios where the vote document does not exist or an error occurs
 * during data retrieval, a snackbar notification is displayed and navigation redirects back to the admin page.
 *
 * @param {Object} props - Component props.
 * @param {Function} [props.onClose=() => {}] - Optional callback function that is called after a navigation event to close the drawer.
 *
 * @returns {JSX.Element} The rendered navigation drawer component.
 */
export default function VoteDrawer({ onClose = () => {} }) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState([]);

  const [active, setActive] = React.useState(undefined);

  const navigate = useNavigate();

  const { id } = useParams();
  const location = useLocation();

  React.useEffect(() => {
    setActive(location.pathname.split("/")[3]);
  }, [location]);

  React.useEffect(() => {
    setData({});
    getDoc(doc(db, `/votes/${id}`))
      .then(async (request) => {
        if (!request.exists()) {
          snackbar({ message: "Wahl existiert nicht." });
          navigate("/admin");
        }
        const data = request.data();
        setData(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        snackbar({ message: "Fehler beim Laden der Wahl." });
        navigate("/admin");
      });
  }, []);

  const navigateTo = (path) => {
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
            onCLick={() => navigateTo("/admin")}
          />
          <mdui-linear-progress indeterminate></mdui-linear-progress>
        </mdui-list>
      </mdui-navigation-drawer>
    );
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
        <mdui-tooltip
          variant="rich"
          headline="Zurück"
          content="Kehren Sie zur Übersicht zurück."
        >
          <DrawerItem
            icon={"arrow_back"}
            title={data?.title}
            onCLick={() => navigate("/admin")}
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
            onCLick={() => navigateTo(`/admin/${id}/edit`)}
          />
        </mdui-tooltip>

        <DrawerItem
          icon={"dashboard"}
          title={"Übersicht"}
          active={active === undefined}
          onCLick={() => navigateTo(`/admin/${id}`)}
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
          onCLick={() => navigateTo(`/admin/${id}/schedule`)}
        />
        <DrawerItem
          icon={"people"}
          title={"Antworten"}
          active={active === "answers"}
          onCLick={() => navigateTo(`/admin/${id}/answers`)}
        />
        <br />
        <mdui-divider></mdui-divider>
        <br />
        <DrawerItem
          icon={"fact_check"}
          title={"Abgleichen"}
          active={active === "match"}
          onCLick={() => navigateTo(`/admin/${id}/match`)}
        />
        <DrawerItem
          icon={"add"}
          title={"Hinzufügen"}
          active={active === "add"}
          onCLick={() => navigateTo(`/admin/${id}/add`)}
        />
        <DrawerItem
          icon={"auto_awesome"}
          title={"Zuteilen"}
          active={active === "assign" || active === "manually"}
          onCLick={() => navigateTo(`/admin/${id}/assign`)}
        />
        <DrawerItem
          icon={"table"}
          title={"Ergebnisse"}
          active={active === "results"}
          onCLick={() => navigateTo(`/admin/${id}/results`)}
        />
        <br />
        <mdui-divider></mdui-divider>
        <br />
        <DrawerItem
          icon="visibility"
          title="Vorschau"
          active={active === "preview"}
          onCLick={() => window.open(`/v/${id}?preview=true`, "_blank")}
        />
        <DrawerItem
          icon={"share"}
          title={"Teilen"}
          active={active === "share"}
          onCLick={() => navigateTo(`/admin/${id}/share`)}
        />
        <DrawerItem
          icon={"delete"}
          title={"Löschen"}
          active={active === "delete"}
          onCLick={() => navigateTo(`/admin/${id}/delete`)}
        />
      </mdui-list>
    </mdui-navigation-drawer>
  );
}

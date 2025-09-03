import {
  addDoc,
  collection,
  doc,
  getDocs,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { prompt, snackbar } from "mdui";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { DrawerItem } from "./components";
import VoteDrawer from "./VoteDrawer";
import routes from "./routes.json";
import { useSchool } from "../../contexts";
import { SchoolData } from "../../types";
import { set } from "date-fns";

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

  const { schoolData } = useSchool();

  React.useEffect(() => {
    setActiveVotes([]);
    setExpiredVotes([]);
    setScheduledVotes([]);
    getDocs(collection(db, "schools/SCHOOLID/votes"))
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

    auth.currentUser?.getIdTokenResult().then((idTokenResult) => {
      const claims = idTokenResult.claims;
      if (claims.role === "admin") {
        // List firestore /schools
        getDocs(collection(db, "schools")).then((data) => {
          const schools = data.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as (SchoolData & { id: string })[];

          setSchoolsDropdown(schools);
        });
      }
    });
  }, [location]);

  const navigateTo = (path: string) => {
    navigate(path);
    onClose();
  };

  // Advanced school variables for admins
  const [schoolsDropdown, setSchoolsDropdown] = React.useState<
    (SchoolData & { id: string })[] | undefined
  >(undefined);
  const [addingSchool, setAddingSchool] = React.useState<boolean>(false);
  const [newSchool, setNewSchool] = React.useState<
    Partial<SchoolData & { id: string }>
  >({});

  const handleAddSchool = () => {
    if (
      !newSchool.id ||
      !newSchool.name ||
      !newSchool.shortName ||
      !newSchool.icon ||
      !newSchool.link ||
      !newSchool.primaryColor
    ) {
      snackbar({ message: "Bitte füllen Sie alle Felder aus." });
      return;
    }

    setDoc(doc(db, `schools/${newSchool.id}`), {
      name: newSchool.name,
      shortName: newSchool.shortName,
      icon: newSchool.icon,
      link: newSchool.link,
      primaryColor: newSchool.primaryColor,
      createdAt: Timestamp.now(),
    })
      .then(() => {
        snackbar({
          message: "Schule erfolgreich hinzugefügt.",
          action: "Schule anzeigen",
          onClick: () => {
            window.location.href = window.location.href.replace(
              "SCHOOLID",
              newSchool.id!
            );
          },
        });
      })
      .catch((e) => {
        console.error(e);
        snackbar({ message: "Fehler beim Hinzufügen der Schule." });
      });
    // Redirect to new school
  };

  if (!pages.includes(active)) {
    return <VoteDrawer onClose={onClose} />;
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
        ) : schoolsDropdown ? (
          <mdui-select
            ref={(ref) => {
              if (ref) {
                ref.addEventListener("change", (e) => {
                  if ((e.target as HTMLSelectElement).value === "add-school") {
                    setAddingSchool(true);
                    return;
                  }
                  console.log(e);
                  window.location.href = window.location.href.replace(
                    "SCHOOLID",
                    (e.target as HTMLSelectElement).value
                  );
                });
              }
            }}
            variant="outlined"
            value={"SCHOOLID"}
            end-icon="school"
          >
            {schoolsDropdown.map((school) => (
              <mdui-menu-item key={school.id} value={school.id}>
                <img
                  style={{
                    height: "24px",
                    width: "24px",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                  src={school.icon}
                  slot="icon"
                />
                {school.name}
              </mdui-menu-item>
            ))}
            <mdui-menu-item value="add-school" icon="add">
              Neue Schule
            </mdui-menu-item>
          </mdui-select>
        ) : (
          <mdui-list-item disabled>
            <mdui-list-item-content>{schoolData?.name}</mdui-list-item-content>
          </mdui-list-item>
        )}
        {loading && <mdui-linear-progress></mdui-linear-progress>}

        {addingSchool && (
          <mdui-dialog fullscreen open>
            <mdui-button-icon
              icon="close"
              onClick={() => setAddingSchool(false)}
            ></mdui-button-icon>
            <div className="mdui-prose" style={{ padding: "1rem" }}>
              <h1>Neue Schule hinzufügen</h1>
              <p>
                Fügen Sie eine neue Schule hinzu, indem Sie den Namen und das
                Icon der Schule angeben. Sie werden danach automatisch zur neuen
                Schule weitergeleitet. Dort könne Sie dann LehrerInnen
                hinzufügen.
              </p>
              <mdui-text-field
                label="ID der Schule"
                placeholder="mst"
                value={newSchool.id || ""}
                onInput={(e) =>
                  setNewSchool({
                    ...newSchool,
                    id: (e.currentTarget as HTMLInputElement).value,
                  })
                }
              ></mdui-text-field>
              <p />
              <mdui-text-field
                label="Name der Schule"
                placeholder="Schule Musterstadt"
                value={newSchool.name || ""}
                onInput={(e) =>
                  setNewSchool({
                    ...newSchool,
                    name: (e.currentTarget as HTMLInputElement).value,
                  })
                }
              ></mdui-text-field>
              <p />
              <mdui-text-field
                label="Kurzer Name der Schule"
                placeholder="Musterstadt"
                value={newSchool.shortName || ""}
                onInput={(e) =>
                  setNewSchool({
                    ...newSchool,
                    shortName: (e.currentTarget as HTMLInputElement).value,
                  })
                }
              ></mdui-text-field>
              <p />
              <mdui-text-field
                label="Icon der Schule"
                placeholder="https://example.com/school-icon.png"
                value={newSchool.icon || ""}
                onInput={(e) =>
                  setNewSchool({
                    ...newSchool,
                    icon: (e.currentTarget as HTMLInputElement).value,
                  })
                }
              ></mdui-text-field>
              <p />
              <mdui-text-field
                label="URL der Schule"
                placeholder="https://example.com/schule-musterstadt"
                value={newSchool.link || ""}
                onInput={(e) =>
                  setNewSchool({
                    ...newSchool,
                    link: (e.currentTarget as HTMLInputElement).value,
                  })
                }
              ></mdui-text-field>
              <p />
              <mdui-text-field
                label="Primärfarbe der Schule"
                placeholder="#FF0000"
                value={newSchool.primaryColor || ""}
                onInput={(e) =>
                  setNewSchool({
                    ...newSchool,
                    primaryColor: (e.currentTarget as HTMLInputElement).value,
                  })
                }
              ></mdui-text-field>
            </div>

            <mdui-button slot="action" onClick={handleAddSchool} icon="school">
              Schule hinzufügen
            </mdui-button>
          </mdui-dialog>
        )}

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
          headline="Schule"
          content="Verwalten Sie die Schuleinstellungen."
        >
          <DrawerItem
            active={active === "school"}
            title={"Schule"}
            icon={"school"}
            onClick={() => navigateTo("/admin/school")}
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

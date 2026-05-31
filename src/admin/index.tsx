import { onAuthStateChanged, User } from "firebase/auth";
import React from "react";
import { Outlet, useRevalidator } from "react-router-dom";
import { auth, db } from "../firebase";

import "./admin.css";

import { alert, confirm, snackbar } from "mdui";
import { useNavigate } from "react-router-dom";
import Login from "./auth/Login";
import DrawerList from "./navigation/DrawerList";
import { doc, getDoc, DocumentData } from "firebase/firestore";
import { useDecryption } from "../contexts/DecryptionContext";

interface ReleaseNotesData extends DocumentData {
  updated?: {
    seconds: number;
  };
}

interface DrawerListProps {
  onClose: () => void;
  mobile: boolean;
}

export default function Admin() {
  const mobile: boolean = window.innerWidth < 840;

  const [authUser, setAuthUser] = React.useState<User | null | false>(false);
  const [loading, setLoading] = React.useState<boolean>(true);

  const [open, setOpen] = React.useState<boolean>(!mobile);

  const navigate = useNavigate();

  const revalidator = useRevalidator();
  const { hasMapping, loadFromExcel, clearMapping } = useDecryption();
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const count = await loadFromExcel(file);
        snackbar({ message: `${count} Schüler erfolgreich geladen und im Browser entschlüsselt.` });
      } catch (err) {
        console.error(err);
        snackbar({ message: "Fehler beim Laden der Excel-Datei." });
      }
    }
  };

  async function checkForReleaseNotes() {
    const response = await getDoc(doc(db, "docs", "release-notes"));

    if (response.exists()) {
      const data = response.data() as ReleaseNotesData;
      if (!data?.updated?.seconds) return;

      const lastLogin = auth.currentUser?.metadata.lastSignInTime;
      console.log("Last login time:", lastLogin);

      if (!lastLogin) return;

      const newTimestamp = new Date(data.updated.seconds * 1000).getTime();

      if (newTimestamp > new Date(lastLogin).getTime()) {
        snackbar({
          message:
            "Es gibt neue Features! Klicken Sie hier, um mehr zu erfahren. 🎉",
          action: "Mehr erfahren",
          onActionClick: () => {
            navigate("/admin/changelog");
          },
          closeable: true,
        });
      }
    } else {
      console.warn("Release notes document does not exist.");
    }
  }

  React.useEffect(() => {
    const listen = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setAuthUser(user);
        setLoading(false);
        checkForReleaseNotes();

        user.getIdTokenResult().then((idTokenResult) => {
          if (
            idTokenResult.claims.project !== "SCHOOLID" &&
            idTokenResult.claims.role !== "admin"
          ) {
            confirm({
              icon: "error",
              headline: "Zugriff verweigert",
              description: `Ihr Konto hat keine Administratorrechte für die Schule mit der ID "SCHOOLID". Bitte melden Sie sich mit einem anderen Konto an oder wechseln Sie zu Ihrer Schule "${idTokenResult.claims.project}".`,
              cancelText: "Abmelden",
              confirmText: `Zu "${idTokenResult.claims.project}" wechseln`,
              onCancel: () => {
                auth.signOut();
                snackbar({
                  message: "Sie sind jetzt abgemeldet.",
                  closeable: true,
                });
              },
              onConfirm: () => {
                auth.signOut();
                window.location.href = window.location.href.replace(
                  "SCHOOLID",
                  idTokenResult.claims.project as string
                );
              },
              onOverlayClick: () => {
                snackbar({
                  message: "Sie haben keinen Zugriff auf diesen Bereich.",
                });
              },
            });
          }
        });
      } else {
        setAuthUser(false);
        setLoading(false);
      }
    });

    return () => {
      listen();
    };
  }, []);

  if (loading) {
    return <div />;
  }

  if (!authUser) {
    return <Login />;
  }

  return (
    <mdui-layout style={{ width: "100vw", height: "100vh" }}>
      <title>Admin - WaldorfWahlen</title>
      {open && (
        <DrawerList
          onClose={() => {
            if (mobile) {
              setOpen(false);
            }
          }}
          mobile={mobile}
        />
      )}
      <mdui-top-app-bar variant="center-aligned" scroll-behavior="elevate">
        {revalidator.state === "loading" && <mdui-linear-progress />}

        {window.innerWidth < 840 && (
          <mdui-button-icon
            icon="menu"
            onClick={() => setOpen(!open)}
          ></mdui-button-icon>
        )}
        <mdui-top-app-bar-title>{authUser.email}</mdui-top-app-bar-title>

        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: "none" }} 
          accept=".xlsx, .xls" 
          onChange={handleFileUpload} 
        />
        
        {hasMapping ? (
          <mdui-tooltip content="Entschlüsselung aktiv (Daten löschen)" open-delay={0}>
            <mdui-button-icon
              icon="key_off"
              onClick={() => clearMapping()}
              style={{ color: "var(--mdui-color-primary)" }}
            ></mdui-button-icon>
          </mdui-tooltip>
        ) : (
          <mdui-tooltip content="Excel hochladen (für Klarnamen in anonymen Wahlen)" open-delay={0}>
            <mdui-button-icon
              icon="vpn_key"
              onClick={() => fileInputRef.current?.click()}
            ></mdui-button-icon>
          </mdui-tooltip>
        )}

        <mdui-dropdown>
          <mdui-avatar
            slot="trigger"
            style={{ marginRight: "1rem", cursor: "pointer" }}
          >
            {authUser.email
              ? authUser.email
                  .split(/[@.]/)
                  .slice(0, 2)
                  .map((part) => part.charAt(0).toUpperCase())
                  .join("")
              : "?"}
          </mdui-avatar>
          <mdui-menu>
            <mdui-menu-item
              icon="settings"
              onClick={() => navigate("/admin/settings")}
            >
              Einstellungen
            </mdui-menu-item>
            <mdui-menu-item
              icon="tips_and_updates"
              onClick={() => navigate("/admin/changelog")}
            >
              Neue Features
            </mdui-menu-item>
            <mdui-menu-item
              icon="support"
              onClick={() => navigate("/admin/help")}
            >
              Hilfe & Kontakt
            </mdui-menu-item>
          </mdui-menu>
        </mdui-dropdown>

        <mdui-tooltip content="Abmelden" open-delay={0} placement="left">
          <mdui-button-icon
            icon="logout"
            onClick={() => {
              confirm({
                icon: "logout",
                headline: "Abmelden",
                description: "Möchten Sie sich wirklich abmelden?",
                cancelText: "Abbrechen",
                confirmText: "Abmelden",
                onConfirm: () => {
                  auth.signOut();
                  snackbar({
                    message: "Sie sind jetzt abgemeldet.",
                    closeable: true,
                  });
                },
              });
            }}
          ></mdui-button-icon>
        </mdui-tooltip>
      </mdui-top-app-bar>

      <mdui-layout-main
        style={{ padding: "64px 0px 0px 380px", minHeight: "300px" }}
      >
        <div style={{ padding: "1rem" }}>
          <Outlet />
        </div>
      </mdui-layout-main>
    </mdui-layout>
  );
}

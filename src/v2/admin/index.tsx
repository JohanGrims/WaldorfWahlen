import { onAuthStateChanged, User } from "firebase/auth";
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";

import "../../admin/admin.css";

import { snackbar, confirm } from "mdui";
import Login from "../../admin/auth/Login";
import V2DrawerList from "./navigation/V2DrawerList";
import { DecryptionProvider } from "../contexts";

export default function V2AdminLayout() {
  const mobile: boolean = window.innerWidth < 840;

  const [authUser, setAuthUser] = React.useState<User | null | false>(false);
  const [loading, setLoading] = React.useState<boolean>(true);

  const [open, setOpen] = React.useState<boolean>(!mobile);

  const navigate = useNavigate();

  React.useEffect(() => {
    const listen = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setAuthUser(user);
        setLoading(false);

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
      <title>Admin V2 - WaldorfWahlen</title>
      {open && (
        <V2DrawerList
          onClose={() => {
            if (mobile) {
              setOpen(false);
            }
          }}
          mobile={mobile}
        />
      )}
      <mdui-top-app-bar variant="center-aligned" scroll-behavior="elevate">
        {window.innerWidth < 840 && (
          <mdui-button-icon
            icon="menu"
            onClick={() => setOpen(!open)}
          ></mdui-button-icon>
        )}
        <mdui-top-app-bar-title>Pseudonymisierte Wahlen (V2)</mdui-top-app-bar-title>

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
          <DecryptionProvider>
            <Outlet />
          </DecryptionProvider>
        </div>
      </mdui-layout-main>
    </mdui-layout>
  );
}

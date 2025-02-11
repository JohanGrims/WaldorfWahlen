import { onAuthStateChanged } from "firebase/auth";
import React from "react";
import { Outlet } from "react-router-dom";
import { auth } from "../firebase";

import "./admin.css";

import { confirm, snackbar } from "mdui";
import { useNavigate } from "react-router-dom";
import Login from "./auth/Login";
import DrawerList from "./navigation/DrawerList";

/**
 * Renders the administrative interface and manages authentication.
 *
 * This React functional component handles Firebase user authentication by listening to
 * authentication state changes via the onAuthStateChanged hook. While waiting for the auth
 * status to resolve, it displays a loading state. If the user is not authenticated, it renders
 * the Login component; otherwise, it displays an admin layout.
 *
 * The admin layout includes:
 * - A responsive DrawerList for navigation, automatically adjusted based on the device's screen width.
 * - A top app bar that shows the authenticated user's email and an avatar dropdown menu with options
 *   for navigating to settings, changelog, and help pages.
 * - A logout button that triggers a confirmation dialog before signing out the user and showing a snackbar notification.
 * - An Outlet component to render nested routes.
 *
 * The visibility of the DrawerList is controlled by the "open" state, which is initialized based on
 * whether the device is classified as mobile (window.innerWidth < 840px).
 *
 * Side Effects:
 * - Listens for authentication state changes using Firebase.
 * - Triggers navigation via the useNavigate hook.
 * - Displays a confirmation dialog and a snackbar on logout.
 *
 * @returns {JSX.Element} The rendered admin interface layout.
 */
export default function Admin() {
  const mobile = window.innerWidth < 840;

  const [authUser, setAuthUser] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const [open, setOpen] = React.useState(!mobile);

  const navigate = useNavigate();

  React.useEffect(() => {
    const listen = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
        setLoading(false);
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
        {window.innerWidth < 840 && (
          <mdui-button-icon
            icon="menu"
            onClick={() => setOpen(!open)}
          ></mdui-button-icon>
        )}
        <mdui-top-app-bar-title>{authUser.email}</mdui-top-app-bar-title>

        <mdui-dropdown>
          <mdui-avatar
            slot="trigger"
            style={{ marginRight: "1rem", cursor: "pointer" }}
          >
            {authUser.email
              .split(/[@.]/)
              .slice(0, 2)
              .map((part) => part.charAt(0).toUpperCase())
              .join("")}
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

        <mdui-tooltip content="Abmelden" open-delay="0" placement="left">
          <mdui-button-icon
            icon="logout"
            onClick={() => {
              confirm({
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

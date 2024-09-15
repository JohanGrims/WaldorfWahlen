import { onAuthStateChanged } from "firebase/auth";
import React from "react";
import { Outlet } from "react-router-dom";
import { auth } from "../firebase";

import "./index.css";

import { confirm, snackbar } from "mdui";
import Login from "./auth/Login";
import DrawerList from "./navigation/DrawerList";

export default function Admin(props) {
  const [authUser, setAuthUser] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const listen = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
        console.log(user);
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
      <DrawerList />
      <mdui-top-app-bar variant="center-aligned" scroll-behavior="elevate">
        <mdui-top-app-bar-title>{authUser.email}</mdui-top-app-bar-title>
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
                  snackbar({ message: "Sie sind jetzt abgemeldet." });
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

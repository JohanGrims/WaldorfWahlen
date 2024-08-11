import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import React from "react";
import { Outlet } from "react-router-dom";
import { auth } from "../firebase";

export default function Admin(props) {
  const [authUser, setAuthUser] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
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

  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log(userCredential);
        handleNext();
      })
      .catch((error) => {
        console.error(error.code);
      });
  };

  if (loading) {
    return <div />;
  }

  if (!authUser) {
    return (
      <div className="login">
        <h1>Login</h1>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="button"
          placeholder="Email"
        />
        <p />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="button"
          placeholder="Passwort"
        />
        <p />
        <br />
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw" }}>
      <div
        style={{
          position: "fixed",
          top: "0px",
          width: "100vw",
          left: "0px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#f89e23",
          padding: "20px",
          boxSizing: "border-box",
          height: "50px",
          zIndex: 1000,
        }}
      >
        <a href="/admin">
          <b>Admin</b>
        </a>
        <div> {authUser.email}</div>

        <a className="button" onClick={() => auth.signOut()}>
          Logout
        </a>
      </div>
      <div style={{ height: "100px" }}></div>

      <Outlet />
    </div>
  );
}

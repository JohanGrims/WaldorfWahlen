import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import ErrorPage from "./Error.jsx";
import Result from "./Result.jsx";
import Share from "./Share.jsx";
import Submitted from "./Submitted.jsx";
import Vote from "./Vote.jsx";
import Overview from "./admin/Overview.jsx";
import VoteDetail from "./admin/VoteDetail.jsx";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <App /> },
      {
        path: "/vote/:id",
        element: <Vote />,
      },
      {
        path: "/v/:id",
        element: <Vote />,
      },
      {
        path: "/results/:id",
        element: <Result />,
      },
      {
        path: "/r/:id",
        element: <Result />,
      },
      {
        path: "/submitted/:id",
        element: <Submitted />,
      },
      {
        path: "/admin",
        element: <Overview />,
      },
      { path: "/admin/:id", element: <VoteDetail /> },
      { path: "/share/:id", element: <Share /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />
);

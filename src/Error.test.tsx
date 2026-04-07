import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import ErrorPage from "./Error";

function renderWithRouterError(error: unknown) {
  // Create a route that throws an error to trigger the error boundary
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <div>OK</div>,
        errorElement: <ErrorPage />,
        loader: () => {
          throw error;
        },
      },
    ],
    { initialEntries: ["/"] }
  );

  return render(<RouterProvider router={router} />);
}

describe("ErrorPage", () => {
  // Suppress console.error output during these tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = () => {};
  });
  afterEach(() => {
    console.error = originalError;
  });

  it("renders error dialog for a 404 Response", async () => {
    renderWithRouterError(
      new Response("Not Found", { status: 404, statusText: "Wahl nicht gefunden" })
    );

    expect(
      await screen.findByText("Wahl nicht gefunden")
    ).toBeInTheDocument();

    // "Fehler 404" is in the headline attribute of mdui-dialog
    const dialog = document.querySelector('mdui-dialog[headline="Fehler 404"]');
    expect(dialog).not.toBeNull();
  });

  it("shows client-side error message for 4xx errors", async () => {
    renderWithRouterError(
      new Response("Bad Request", { status: 400, statusText: "Ungültige Anfrage" })
    );

    expect(
      await screen.findByText(/Es scheint, dass der Fehler auf Ihrer Seite liegt/)
    ).toBeInTheDocument();
  });

  it("shows server-side message for 5xx errors", async () => {
    renderWithRouterError(
      new Response("Internal", { status: 500, statusText: "Serverfehler" })
    );

    expect(
      await screen.findByText(/Wir arbeiten daran, das Problem zu beheben/)
    ).toBeInTheDocument();
  });

  it("handles plain Error objects", async () => {
    renderWithRouterError(new Error("Something broke"));

    expect(
      await screen.findByText("Something broke")
    ).toBeInTheDocument();
  });

  it("handles string errors", async () => {
    renderWithRouterError("A string error");

    expect(await screen.findByText("A string error")).toBeInTheDocument();
  });

  it("handles unknown error types", async () => {
    renderWithRouterError(42);

    expect(await screen.findByText("Unknown error")).toBeInTheDocument();
  });

  it("renders back and reload buttons", async () => {
    renderWithRouterError(
      new Response("Error", { status: 500, statusText: "Fehler" })
    );

    expect(await screen.findByText("Zurück")).toBeInTheDocument();
    expect(await screen.findByText("Neu laden")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Timestamp } from "firebase/firestore";

// Mock react-router's useNavigate so VoteCard doesn't need a real Router
const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

import VoteCard from "./VoteCard";

// Simple render helper – no Router wrapper needed thanks to the mock
function renderVoteCard(props: {
  id: string;
  title: string;
  endTime: Timestamp;
}) {
  return render(<VoteCard {...props} />);
}

describe("VoteCard", () => {
  const mockTimestamp = {
    seconds: 1705320000, // 2024-01-15 12:00:00 UTC
    nanoseconds: 0,
    toDate: () => new Date(1705320000 * 1000),
    toMillis: () => 1705320000 * 1000,
    isEqual: (other: any) => other?.seconds === 1705320000,
    valueOf: () => "1705320000",
  } as Timestamp;

  it("renders the vote title", () => {
    renderVoteCard({
      id: "test-1",
      title: "Projektwoche 2024",
      endTime: mockTimestamp,
    });
    expect(screen.getByText("Projektwoche 2024")).toBeInTheDocument();
  });

  it("renders the formatted end date", () => {
    renderVoteCard({
      id: "test-1",
      title: "Testwahl",
      endTime: mockTimestamp,
    });
    // The VoteCard uses toLocaleDateString("de-DE") which formats to German date
    const dateText = screen.getByText(/Endet am/);
    expect(dateText).toBeInTheDocument();
  });

  it("renders a clickable card", () => {
    const { container } = renderVoteCard({
      id: "abc123",
      title: "Klickmich",
      endTime: mockTimestamp,
    });
    const card = container.querySelector("mdui-card");
    expect(card).not.toBeNull();
    expect(card!.hasAttribute("clickable")).toBe(true);
  });

  it("renders with elevated variant", () => {
    const { container } = renderVoteCard({
      id: "test-2",
      title: "Elevated Test",
      endTime: mockTimestamp,
    });
    const card = container.querySelector("mdui-card");
    expect(card!.getAttribute("variant")).toBe("elevated");
  });

  it("displays different titles for different votes", () => {
    const { unmount } = renderVoteCard({
      id: "vote-a",
      title: "Erste Wahl",
      endTime: mockTimestamp,
    });
    expect(screen.getByText("Erste Wahl")).toBeInTheDocument();
    unmount();

    renderVoteCard({
      id: "vote-b",
      title: "Zweite Wahl",
      endTime: mockTimestamp,
    });
    expect(screen.getByText("Zweite Wahl")).toBeInTheDocument();
  });
});

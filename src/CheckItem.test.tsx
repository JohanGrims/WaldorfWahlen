import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import CheckItem from "./CheckItem";

describe("CheckItem", () => {
  it("renders the label text", () => {
    render(<CheckItem label="Mathe" checked={false} />);
    expect(screen.getByText("Mathe")).toBeInTheDocument();
  });

  it("renders with checked state", () => {
    const { container } = render(<CheckItem label="Kunst" checked={true} />);
    const checkbox = container.querySelector("mdui-checkbox");
    expect(checkbox).not.toBeNull();
    expect(checkbox!.hasAttribute("checked")).toBe(true);
    expect(checkbox!.hasAttribute("disabled")).toBe(true);
  });

  it("renders with unchecked state", () => {
    const { container } = render(<CheckItem label="Sport" checked={false} />);
    const checkbox = container.querySelector("mdui-checkbox");
    expect(checkbox).not.toBeNull();
    expect(checkbox!.hasAttribute("checked")).toBe(false);
    expect(checkbox!.hasAttribute("disabled")).toBe(true);
  });

  it("uses default icons when none provided", () => {
    const { container } = render(<CheckItem label="Test" checked={true} />);
    const checkbox = container.querySelector("mdui-checkbox");
    expect(checkbox!.getAttribute("checked-icon")).toBe("done");
  });

  it("uses custom checked icon", () => {
    const { container } = render(
      <CheckItem label="Test" checked={true} checkedIcon="star" />
    );
    const checkbox = container.querySelector("mdui-checkbox");
    expect(checkbox!.getAttribute("checked-icon")).toBe("star");
  });

  it("uses custom unchecked icon", () => {
    const { container } = render(
      <CheckItem label="Test" checked={false} uncheckedIcon="remove" />
    );
    const checkbox = container.querySelector("mdui-checkbox");
    expect(checkbox!.getAttribute("unchecked-icon")).toBe("remove");
  });

  it("renders different markup for checked vs unchecked", () => {
    const { container: checkedContainer } = render(
      <CheckItem label="A" checked={true} />
    );
    const { container: uncheckedContainer } = render(
      <CheckItem label="B" checked={false} />
    );

    const checkedEl = checkedContainer.querySelector("mdui-checkbox");
    const uncheckedEl = uncheckedContainer.querySelector("mdui-checkbox");

    // checked variant has the "checked" attribute
    expect(checkedEl!.hasAttribute("checked")).toBe(true);
    expect(uncheckedEl!.hasAttribute("checked")).toBe(false);
  });
});

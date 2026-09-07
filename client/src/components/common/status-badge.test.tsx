import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApplicationStatusBadge, ProcessingStatusBadge } from "./status-badge";

describe("ApplicationStatusBadge", () => {
  it("renders every backend-supported application status", () => {
    const statuses = ["pending", "under review", "shortlisted", "interview", "rejected", "withdrawn"] as const;
    for (const status of statuses) {
      const { unmount } = render(<ApplicationStatusBadge status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
      unmount();
    }
  });
});

describe("ProcessingStatusBadge", () => {
  it("maps each AI processing status to a human label", () => {
    render(<ProcessingStatusBadge status="completed" />);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});

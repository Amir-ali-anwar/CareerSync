import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchScoreRing, matchScoreLabel } from "./match-score-ring";

describe("matchScoreLabel", () => {
  it("bands scores into the expected labels", () => {
    expect(matchScoreLabel(95)).toBe("Excellent Match");
    expect(matchScoreLabel(80)).toBe("Excellent Match");
    expect(matchScoreLabel(70)).toBe("Strong Match");
    expect(matchScoreLabel(50)).toBe("Fair Match");
    expect(matchScoreLabel(10)).toBe("Weak Match");
  });
});

describe("MatchScoreRing", () => {
  it("renders the rounded percentage", () => {
    render(<MatchScoreRing score={87.6} />);
    expect(screen.getByText("88%")).toBeInTheDocument();
  });

  it("clamps out-of-range scores into 0-100", () => {
    render(<MatchScoreRing score={150} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});

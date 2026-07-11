// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { useCreatorGradeLevelStore } from "../creatorGradeLevel.store";

describe("creatorGradeLevel.store", () => {
  beforeEach(() => {
    localStorage.clear();
    useCreatorGradeLevelStore.setState({ gradeLevel: "" });
  });

  it("persists a valid grade level", () => {
    useCreatorGradeLevelStore.getState().setGradeLevel("ม.2");
    expect(useCreatorGradeLevelStore.getState().gradeLevel).toBe("ม.2");
    expect(JSON.parse(localStorage.getItem("creator-grade-level")!).state).toEqual({
      gradeLevel: "ม.2",
    });
  });

  it("ignores unknown grade values", () => {
    useCreatorGradeLevelStore.getState().setGradeLevel("ป.4");
    useCreatorGradeLevelStore.getState().setGradeLevel("invalid");
    expect(useCreatorGradeLevelStore.getState().gradeLevel).toBe("ป.4");
  });
});

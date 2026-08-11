import { describe, expect, it } from "vitest";
import type { Agenda, Session } from "./agenda.js";
import { createAgendaIndex } from "./agenda.js";
import {
  agendaStateFromParams,
  agendaStateToParams,
  defaultAgendaState,
  resolveAgendaState,
} from "./state.js";

const session = (id: string, day: string): Session => ({
  id,
  day,
  start: "10:00",
  end: "11:00",
  stageId: "a",
  allStages: false,
  format: null,
  title: id,
  description: null,
  location: null,
  speakers: [],
});

const agenda: Agenda = {
  timezone: "Asia/Kuala_Lumpur",
  utcOffsetMinutes: 480,
  days: [
    { id: "d1", date: "2026-08-11", label: "Day 1", short: "11 Aug", weekday: "Tue" },
    { id: "d2", date: "2026-08-12", label: "Day 2", short: "12 Aug", weekday: "Wed" },
  ],
  stages: [
    { id: "a", name: "Alpha", short: "Alpha", venue: "Hall A", accent: "amber" },
    { id: "b", name: "Beta", short: "Beta", venue: "Hall B", accent: "sky" },
  ],
  sessions: [session("s1", "d1"), session("s2", "d2")],
};

const index = createAgendaIndex(agenda);

describe("resolveAgendaState", () => {
  it("falls back to defaults for undefined input", () => {
    expect(resolveAgendaState(index, undefined)).toEqual(defaultAgendaState(index));
  });

  it("drops an unknown day rather than rendering an empty agenda", () => {
    expect(resolveAgendaState(index, { dayId: "nope" }).dayId).toBe(
      defaultAgendaState(index).dayId,
    );
  });

  it("drops unknown stage ids but keeps valid ones", () => {
    expect(resolveAgendaState(index, { stageIds: ["a", "ghost"] }).stageIds).toEqual(["a"]);
  });

  it("drops a selected session that does not exist", () => {
    expect(resolveAgendaState(index, { selectedId: "missing" }).selectedId).toBeNull();
  });

  it("lets a selected session override the day it belongs to", () => {
    const s = resolveAgendaState(index, { dayId: "d1", selectedId: "s2" });
    expect([s.dayId, s.selectedId]).toEqual(["d2", "s2"]);
  });

  it("only accepts known view modes", () => {
    expect(resolveAgendaState(index, { view: "list" }).view).toBe("list");
    // @ts-expect-error — exercising untrusted input
    expect(resolveAgendaState(index, { view: "spreadsheet" }).view).toBe("grid");
  });
});

describe("url codec", () => {
  it("keeps a pristine view's URL clean", () => {
    expect(agendaStateToParams(index, defaultAgendaState(index)).toString()).toBe("");
  });

  it("serialises only non-default values", () => {
    const params = agendaStateToParams(index, {
      dayId: "d2",
      stageIds: ["a", "b"],
      query: "ada",
      view: "list",
      selectedId: "s2",
    });
    expect(Object.fromEntries(params)).toEqual({
      day: "d2",
      stage: "a,b",
      q: "ada",
      view: "list",
      session: "s2",
    });
  });

  it("round-trips through the URL without drift", () => {
    const original = {
      dayId: "d2",
      stageIds: ["b"],
      query: "hello",
      view: "list" as const,
      selectedId: "s2",
    };
    const back = agendaStateFromParams(index, agendaStateToParams(index, original));
    expect(back).toEqual(original);
  });

  it("survives a hostile query string", () => {
    const params = new URLSearchParams(
      "day=../../etc&stage=a,,,ghost&view=evil&session=<script>",
    );
    expect(agendaStateFromParams(index, params)).toEqual({
      dayId: "d1",
      stageIds: ["a"],
      query: "",
      view: "grid",
      selectedId: null,
    });
  });
});

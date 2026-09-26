import { describe, it, expect } from "vitest";
import { canUseAgent, toolAllowedForRole } from "@/lib/agent/permissions";
import { validRole } from "@/lib/users";
import { isBrigadirApiBlocked } from "@/lib/roles";

describe("права на агента", () => {
  it("бригадирът няма агент; /api/agent е блокиран в middleware", () => {
    expect(canUseAgent("brigadir")).toBe(false);
    expect(toolAllowedForRole("search_clients", "brigadir")).toBe(false);
    expect(isBrigadirApiBlocked("/api/agent/chat")).toBe(true);
  });
  it("само админ управлява потребители и настройки", () => {
    for (const role of ["employee", "manager"]) {
      expect(toolAllowedForRole("update_user", role)).toBe(false);
      expect(toolAllowedForRole("update_settings", role)).toBe(false);
      expect(toolAllowedForRole("create_offer", role)).toBe(true);
    }
    expect(toolAllowedForRole("update_user", "admin")).toBe(true);
  });
  it("без роля — нищо", () => {
    expect(canUseAgent(undefined)).toBe(false);
  });
});

describe("роли", () => {
  it("валидни роли", () => {
    expect(validRole("manager")).toBe(true);
    expect(validRole("superuser")).toBe(false);
    expect(validRole(undefined)).toBe(false);
  });
});

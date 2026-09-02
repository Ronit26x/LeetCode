import { describe, expect, it } from "vitest";
import { isAllowedGitHubLogin, parseAllowedLogins } from "@/lib/allowlist";

describe("GitHub allowlist", () => {
  it("accepts exactly the configured logins", () => {
    expect(isAllowedGitHubLogin({ login: "Ronit26x" }, "Ronit26x")).toBe(true);
    expect(isAllowedGitHubLogin({ login: "androidguy30" }, "Ronit26x,androidguy30")).toBe(true);
    expect(isAllowedGitHubLogin({ login: "Ronit26x" }, "Ronit26x, androidguy30")).toBe(true);
  });
  it("rejects other accounts, case differences, and malformed profiles", () => {
    expect(isAllowedGitHubLogin({ login: "someone-else" }, "Ronit26x,androidguy30")).toBe(false);
    expect(isAllowedGitHubLogin({ login: "ronit26x" }, "Ronit26x")).toBe(false);
    expect(isAllowedGitHubLogin({ login: 42 }, "Ronit26x")).toBe(false);
    expect(isAllowedGitHubLogin({}, "Ronit26x")).toBe(false);
    expect(isAllowedGitHubLogin(null, "Ronit26x")).toBe(false);
    expect(isAllowedGitHubLogin({ login: "Ronit26x" }, "")).toBe(false);
    expect(isAllowedGitHubLogin({ login: "" }, ",")).toBe(false);
  });
  it("parses lists with commas, spaces and stray separators", () => {
    expect(parseAllowedLogins(" Ronit26x,, androidguy30 ")).toEqual(["Ronit26x", "androidguy30"]);
    expect(parseAllowedLogins(undefined)).toEqual([]);
  });
});

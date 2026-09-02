import { describe, expect, it } from "vitest";
import { isAllowedGitHubLogin } from "@/lib/allowlist";

describe("GitHub allowlist", () => {
  it("accepts exactly the configured login", () => {
    expect(isAllowedGitHubLogin({ login: "Ronit26x" }, "Ronit26x")).toBe(true);
  });
  it("rejects other accounts, case differences, and malformed profiles", () => {
    expect(isAllowedGitHubLogin({ login: "someone-else" }, "Ronit26x")).toBe(false);
    expect(isAllowedGitHubLogin({ login: "ronit26x" }, "Ronit26x")).toBe(false);
    expect(isAllowedGitHubLogin({ login: 42 }, "Ronit26x")).toBe(false);
    expect(isAllowedGitHubLogin({}, "Ronit26x")).toBe(false);
    expect(isAllowedGitHubLogin(null, "Ronit26x")).toBe(false);
    expect(isAllowedGitHubLogin({ login: "Ronit26x" }, "")).toBe(false);
  });
});

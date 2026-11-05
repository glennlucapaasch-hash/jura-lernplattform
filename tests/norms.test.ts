import { describe, it, expect } from "vitest";
import { normUrl, extractNorms } from "@/lib/norms";
describe("norms", () => {
  it("builds official links", () => {
    expect(normUrl("§ 130 Abs. 1 S. 1 BGB")).toBe("https://www.gesetze-im-internet.de/bgb/__130.html");
    expect(normUrl("Art. 38 Abs. 1 S. 2 GG")).toBe("https://www.gesetze-im-internet.de/gg/art_38.html");
    expect(normUrl("§ 312i BGB")).toBe("https://www.gesetze-im-internet.de/bgb/__312i.html");
    expect(normUrl("§ 13 Nr. 5 BVerfGG")).toBe("https://www.gesetze-im-internet.de/bverfgg/__13.html");
    expect(normUrl("§ 2 S. 3 KVS")).toBeNull();
  });
  it("extracts norms from text", () => {
    expect(extractNorms("Nach § 130 Abs. 1 S. 1 BGB wird … vgl. Art. 20 GG und nochmals § 130 Abs. 1 S. 1 BGB")).toEqual(["§ 130 Abs. 1 S. 1 BGB", "Art. 20 GG"]);
  });
});

// A stand-in for https://leetcode.com/graphql so the E2E suite never touches the network.
// Any slug that starts with "two-sum" resolves, so each test run can use a unique slug.
import http from "node:http";

const PORT = Number(process.env.PORT ?? 4321);

function questionFor(slug) {
  if (!slug.startsWith("two-sum")) return null;
  const suffix = slug.slice("two-sum".length).replace(/^-/, "");
  return {
    questionFrontendId: "1",
    title: suffix ? `Two Sum ${suffix}` : "Two Sum",
    difficulty: "Easy",
    topicTags: [
      { name: "Array", slug: "array" },
      { name: "Hash Table", slug: "hash-table" },
    ],
  };
}

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let slug = "";
      try {
        slug = JSON.parse(body).variables?.slug ?? "";
      } catch {}
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: { question: questionFor(slug) } }));
    });
  })
  .listen(PORT, () => console.log(`leetcode stub on ${PORT}`));

import { Probot } from "probot";
import QueryManager from "./query-manager";
import { sayPlease } from "./utils/utils";

export = (app: Probot) => {
  app.on("issue_comment.created", async context => {
    const { repo, owner } = context.repo();
    const queryManager = new QueryManager(repo, owner, context);
    const issue = context.payload.issue;
    const pr = await queryManager.fetchPr(issue.number);
    if (!pr) return;

    if ("pull_request" in issue) {
      const comment = context.payload.comment;
      // this is probably a request for TrufBot to do something
      if (comment.body.includes("@TrufBot")) {
        const lower = comment.body.toLocaleLowerCase();
        if (!lower.includes("please")) {
          return await queryManager.makeIssueComment(sayPlease());
        }
      }
    }
  });
};

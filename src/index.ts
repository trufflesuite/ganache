import { Probot } from "probot";
import QueryManager from "./query-manager";

export = (app: Probot) => {
  app.on("issue_comment.created", async context => {
    const { repo, owner } = context.repo();
    const queryManager = new QueryManager(repo, owner, context);
    const issue = context.payload.issue;
    const pr = await queryManager.fetchPr(issue.number);
    if (!pr) return;
    }
  });
};

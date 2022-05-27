import { WebhookEvent } from "@octokit/webhooks";
import { Context } from "probot";

type WebhookContext = WebhookEvent<any> &
  Omit<Context<any>, keyof WebhookEvent<any>>;

export default class QueryManager {
  repo: any;
  owner: any;
  context: WebhookContext;
  constructor(repo: any, owner: any, context: WebhookContext) {
    this.repo = repo;
    this.owner = owner;
    this.context = context;
  }
}

import QueryManager from "../query-manager";
import {
  MERGE_NOT_COLLABORATOR,
  MERGE_DIRTY_COMMENT,
  MERGE_BLOCKED_COMMENT,
  MERGE_UNKNOWN_COMMENT,
  MERGE_BEHIND_COMMENT
} from "../utils/constants";

export const validateAndMerge = async function (
  queryManager: QueryManager,
  association: string,
  pr: any
) {
  if (association !== "OWNER" && association !== "COLLABORATOR") {
    return await queryManager.makeIssueComment(MERGE_NOT_COLLABORATOR);
  }

  const { mergeable_state: mergeable } = pr;
  if (mergeable === "clean" || mergeable === "unstable") {
    queryManager.mergePr(pr.number);
  } else if (mergeable === "dirty") {
    return await queryManager.makeIssueComment(MERGE_DIRTY_COMMENT);
  } else if (mergeable === "blocked") {
    return await queryManager.makeIssueComment(MERGE_BLOCKED_COMMENT);
  } else if (mergeable === "unknown") {
    return await queryManager.makeIssueComment(MERGE_UNKNOWN_COMMENT);
  } else if (mergeable === "behind") {
    return await queryManager.makeIssueComment(MERGE_BEHIND_COMMENT);
  } else {
    return await queryManager.makeIssueComment(
      `This PR cannot be merged; unhandled status "${mergeable}" was sent by Github.`
    );
  }
};

import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  MISSING_BOTH_MESSAGE
} from "./chunk-5GGUB4EO.js";
import {
  RULE_ENVIRONMENTS
} from "./chunk-GY5I4AYD.js";
import {
  detectExplicitScope,
  resolveProjectContext
} from "./chunk-E6LFKMI2.js";
import {
  AGENT_REASON,
  AGENT_STATUS,
  outputAgentError
} from "./chunk-L7CEMAJG.js";
import {
  printError
} from "./chunk-CQJRLNTX.js";
import {
  isAPIError
} from "./chunk-AWCID36T.js";
import {
  output_manager_default
} from "./chunk-OX7KI3LF.js";

// src/commands/traces/config/errors.ts
function messageFor(err) {
  if (isAPIError(err)) {
    return err.serverMessage || err.message;
  }
  return err instanceof Error ? err.message : String(err);
}
function handleTracingApiError(client, err) {
  if (client.nonInteractive) {
    const status = isAPIError(err) ? err.status : void 0;
    outputAgentError(client, {
      status: AGENT_STATUS.ERROR,
      reason: status === 403 ? AGENT_REASON.PERMISSION_DENIED : status === 404 ? AGENT_REASON.NOT_FOUND : AGENT_REASON.API_ERROR,
      message: messageFor(err)
    });
  }
  if (isAPIError(err) && err.status === 403) {
    output_manager_default.error(messageFor(err));
    return 1;
  }
  printError(err);
  return 1;
}
function configError(client, reason, message) {
  if (client.nonInteractive) {
    outputAgentError(client, {
      status: AGENT_STATUS.ERROR,
      reason,
      message
    });
  }
  output_manager_default.error(message);
  return 1;
}
function invalidArguments(client, message) {
  return configError(client, AGENT_REASON.INVALID_ARGUMENTS, message);
}
function ruleNotFound(client, message) {
  return configError(client, AGENT_REASON.NOT_FOUND, message);
}
function confirmationRequired(client, message, next) {
  outputAgentError(client, {
    status: AGENT_STATUS.ERROR,
    reason: AGENT_REASON.CONFIRMATION_REQUIRED,
    message,
    userActionRequired: true,
    next
  });
  output_manager_default.error(message);
  return 1;
}

// src/commands/traces/config/json-output.ts
function writeConfigJson(client, {
  project,
  bare,
  envelope,
  message,
  next
}) {
  if (!client.nonInteractive) {
    client.stdout.write(`${JSON.stringify(bare, null, 2)}
`);
    return;
  }
  client.stdout.write(
    `${JSON.stringify(
      {
        status: AGENT_STATUS.OK,
        projectId: project.id,
        projectName: project.name,
        ...envelope,
        message,
        next
      },
      null,
      2
    )}
`
  );
}

// src/commands/traces/config/rules.ts
var RULE_LIMIT = 10;
var MIN_SAMPLE_RATE = 1;
var MAX_SAMPLE_RATE = 100;
function isRuleEnvironment(value) {
  return RULE_ENVIRONMENTS.includes(value);
}
var ENVIRONMENT_ERROR = `\`environment\` must be one of: ${RULE_ENVIRONMENTS.join(", ")}.`;
var RATE_ERROR = `\`rate\` must be a whole number from ${MIN_SAMPLE_RATE} to ${MAX_SAMPLE_RATE}.`;
var EMPTY_PATH_ERROR = "`requestPath` cannot be empty.";
function parseSampleRate(value) {
  if (!/^\d+$/.test(value.trim())) {
    return void 0;
  }
  const rate = Number(value);
  return rate >= MIN_SAMPLE_RATE && rate <= MAX_SAMPLE_RATE ? rate : void 0;
}
function toRow(rule) {
  return {
    environment: rule.env ?? "any",
    requestPath: rule.requestPath ?? null,
    sampleRate: Math.round(rule.rate * 100)
  };
}
function toApiRate(sampleRate) {
  return sampleRate / 100;
}
function toRule(row) {
  return {
    rate: toApiRate(row.sampleRate),
    ...row.environment === "any" ? {} : { env: row.environment },
    ...row.requestPath === null ? {} : { requestPath: row.requestPath }
  };
}
var ALL_PATHS_LABEL = "(all paths)";
function formatPath(requestPath) {
  return requestPath ?? ALL_PATHS_LABEL;
}
function formatRate(sampleRate) {
  return `${sampleRate}%`;
}
function formatRuleTarget(environment, requestPath) {
  return `${environment} ${formatPath(requestPath)}`;
}
function formatRuleLine(row) {
  return `${formatRuleTarget(row.environment, row.requestPath)} ${formatRate(row.sampleRate)}`;
}
var COMMAND_WORD_COUNT = 3;
function subcommandArguments(positional) {
  return positional.slice(COMMAND_WORD_COUNT);
}
function hasSameKey(a, b) {
  return a.environment === b.environment && a.requestPath === b.requestPath;
}
async function readProjectTracing({
  client,
  teamId,
  projectId
}) {
  const project = await client.fetch(
    `/v9/projects/${encodeURIComponent(projectId)}`,
    { accountId: teamId }
  );
  const tracing = project.tracing ?? null;
  return {
    project,
    tracing,
    entries: (tracing?.samplingRules ?? []).map((rule) => ({
      rule,
      row: toRow(rule)
    }))
  };
}
async function writeSamplingRules({
  client,
  teamId,
  projectId,
  tracing,
  rules
}) {
  const body = {
    tracing: { ...tracing ?? {}, samplingRules: rules }
  };
  await client.fetch(`/v9/projects/${encodeURIComponent(projectId)}`, {
    accountId: teamId,
    method: "PATCH",
    body
  });
}

// src/commands/traces/config/scope.ts
async function resolveConfigScope(client, flags) {
  const link = await resolveProjectContext({
    client,
    projectNameOrId: flags.project
  });
  if (link.status === "error") {
    return { exitCode: link.exitCode };
  }
  if (link.status === "not_linked") {
    output_manager_default.error(MISSING_BOTH_MESSAGE);
    return { exitCode: 1 };
  }
  if (flags.project === void 0 && detectExplicitScope(client) && link.org.id !== client.config.currentTeam) {
    output_manager_default.error(
      `The linked project ${link.project.name} belongs to ${link.org.slug || link.org.id}, which is not the scope that was passed. Pass --project <name> to act on a project in that scope.`
    );
    return { exitCode: 1 };
  }
  return { teamId: link.org.id, projectId: link.project.id };
}

export {
  handleTracingApiError,
  invalidArguments,
  ruleNotFound,
  confirmationRequired,
  writeConfigJson,
  RULE_LIMIT,
  isRuleEnvironment,
  ENVIRONMENT_ERROR,
  RATE_ERROR,
  EMPTY_PATH_ERROR,
  parseSampleRate,
  toApiRate,
  toRule,
  formatPath,
  formatRate,
  formatRuleTarget,
  formatRuleLine,
  subcommandArguments,
  hasSameKey,
  readProjectTracing,
  writeSamplingRules,
  resolveConfigScope
};

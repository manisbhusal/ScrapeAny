import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  EMPTY_PATH_ERROR,
  ENVIRONMENT_ERROR,
  RULE_LIMIT,
  confirmationRequired,
  formatRuleLine,
  formatRuleTarget,
  handleTracingApiError,
  invalidArguments,
  isRuleEnvironment,
  readProjectTracing,
  resolveConfigScope,
  ruleNotFound,
  subcommandArguments,
  writeConfigJson,
  writeSamplingRules
} from "./chunk-ZKUHCL6O.js";
import {
  quoteArg
} from "./chunk-HGRWPPYB.js";
import "./chunk-5GGUB4EO.js";
import {
  validateJsonOutput
} from "./chunk-KXDWXXJH.js";
import {
  tracesCommand
} from "./chunk-7Q45OKWR.js";
import {
  rmSubcommand
} from "./chunk-GY5I4AYD.js";
import {
  help
} from "./chunk-RZ5NP6HN.js";
import "./chunk-E6LFKMI2.js";
import "./chunk-OHER4DGX.js";
import {
  TelemetryClient
} from "./chunk-CYNB6LL4.js";
import {
  buildCommandWithGlobalFlags
} from "./chunk-L7CEMAJG.js";
import "./chunk-GGP5R3FU.js";
import {
  printError
} from "./chunk-CQJRLNTX.js";
import {
  parseArguments
} from "./chunk-57RHXXXG.js";
import "./chunk-RKDCNQ4S.js";
import "./chunk-AWCID36T.js";
import {
  getCommandName,
  getCommandNamePlain,
  getFlagsSpecification
} from "./chunk-Q2DGFCO7.js";
import "./chunk-P4QNYOFB.js";
import "./chunk-52QYYTM5.js";
import {
  output_manager_default
} from "./chunk-OX7KI3LF.js";
import {
  require_source
} from "./chunk-S7KYDPEM.js";
import {
  __toESM
} from "./chunk-TZ2YI2VH.js";

// src/commands/traces/config/rm.ts
var import_chalk = __toESM(require_source(), 1);

// src/util/telemetry/commands/traces/config/rm.ts
var TracesConfigRmTelemetryClient = class extends TelemetryClient {
  /**
   * The environment word is a closed set, so a valid value is tracked raw.
   * Anything else is a typo the CLI rejected and is redacted.
   */
  trackCliArgumentEnvironment(environment) {
    if (environment) {
      this.trackCliArgument({
        arg: "environment",
        value: isRuleEnvironment(environment) ? environment : this.redactedValue
      });
    }
  }
  /** The path prefix is customer data. */
  trackCliArgumentRequestPath(requestPath) {
    if (requestPath) {
      this.trackCliArgument({
        arg: "requestPath",
        value: this.redactedValue
      });
    }
  }
  trackCliFlagDefault(defaultOnly) {
    if (defaultOnly) {
      this.trackCliFlag("default");
    }
  }
  trackCliFlagJson(json) {
    if (json) {
      this.trackCliFlag("json");
    }
  }
};

// src/commands/traces/config/rm.ts
var USAGE = "traces config rm <environment> [requestPath]";
function matches(row, environment, selector) {
  if (row.environment !== environment) {
    return false;
  }
  switch (selector.kind) {
    case "exact":
      return row.requestPath === selector.requestPath;
    case "default":
      return row.requestPath === null;
    case "every":
      return true;
  }
}
function describeSelection(environment, selector) {
  switch (selector.kind) {
    case "exact":
      return formatRuleTarget(environment, selector.requestPath);
    case "default":
      return formatRuleTarget(environment, null);
    case "every":
      return environment;
  }
}
function ruleWord(count) {
  return count === 1 ? "rule" : "rules";
}
function canConfirm(client) {
  return !client.nonInteractive && !client.isAgent && client.stdin.isTTY === true;
}
function commandToRunByHand(client, environment, pathArg, defaultFlag) {
  const template = [
    "traces config rm",
    environment,
    ...pathArg !== void 0 ? [quoteArg(pathArg)] : [],
    ...defaultFlag ? ["--default"] : []
  ].join(" ");
  return buildCommandWithGlobalFlags(client.argv, template, void 0, {
    // The command is for a terminal, so it must not carry the flag that says
    // there is nobody at one.
    excludeFlags: ["--non-interactive"],
    preserveProject: true
  });
}
async function rm(client) {
  const telemetry = new TracesConfigRmTelemetryClient({
    opts: { store: client.telemetryEventStore }
  });
  let parsedArgs;
  const flagsSpecification = getFlagsSpecification(rmSubcommand.options);
  try {
    parsedArgs = parseArguments(client.argv.slice(2), flagsSpecification);
  } catch (err) {
    printError(err);
    return 1;
  }
  const { flags } = parsedArgs;
  const [environmentArg, ...pathArgs] = subcommandArguments(parsedArgs.args);
  const pathArg = pathArgs[0];
  const defaultFlag = Boolean(flags["--default"]);
  telemetry.trackCliArgumentEnvironment(environmentArg);
  telemetry.trackCliArgumentRequestPath(pathArg);
  telemetry.trackCliFlagDefault(flags["--default"]);
  telemetry.trackCliOptionFormat(flags["--format"]);
  telemetry.trackCliFlagJson(flags["--json"]);
  telemetry.trackCliOptionProject(flags["--project"]);
  if (environmentArg === void 0) {
    output_manager_default.print(
      help(rmSubcommand, {
        parent: { ...tracesCommand, name: "traces config" },
        columns: client.stderr.columns
      })
    );
    return 2;
  }
  if (pathArgs.length > 1) {
    output_manager_default.error(`Too many arguments. Usage: ${getCommandName(USAGE)}`);
    return 2;
  }
  if (!isRuleEnvironment(environmentArg)) {
    return invalidArguments(
      client,
      `${ENVIRONMENT_ERROR} Received: ${environmentArg}`
    );
  }
  if (pathArg !== void 0 && defaultFlag) {
    return invalidArguments(
      client,
      "`--default` selects the rule that has no path prefix, so it cannot be combined with a path prefix."
    );
  }
  if (pathArg !== void 0 && pathArg.trim() === "") {
    return invalidArguments(client, EMPTY_PATH_ERROR);
  }
  const selector = pathArg !== void 0 ? { kind: "exact", requestPath: pathArg } : defaultFlag ? { kind: "default" } : { kind: "every" };
  const formatResult = validateJsonOutput(flags);
  if (!formatResult.valid) {
    output_manager_default.error(formatResult.error);
    return 1;
  }
  const asJson = formatResult.jsonOutput || client.nonInteractive;
  const scope = await resolveConfigScope(client, {
    project: flags["--project"]
  });
  if ("exitCode" in scope) {
    return scope.exitCode;
  }
  if (!asJson) {
    output_manager_default.spinner("Fetching trace sampling rules\u2026");
  }
  let project;
  let tracing;
  let entries;
  try {
    ({ project, tracing, entries } = await readProjectTracing({
      client,
      ...scope
    }));
  } catch (err) {
    output_manager_default.stopSpinner();
    return handleTracingApiError(client, err);
  }
  output_manager_default.stopSpinner();
  const removed = entries.filter((entry) => matches(entry.row, environmentArg, selector)).map((entry) => entry.row);
  const kept = entries.filter(
    (entry) => !matches(entry.row, environmentArg, selector)
  );
  if (removed.length === 0) {
    return ruleNotFound(
      client,
      `No trace sampling rule matches ${describeSelection(environmentArg, selector)} on ${project.name}.`
    );
  }
  const removedLines = removed.map(formatRuleLine);
  output_manager_default.log(
    `The following ${removed.length} ${ruleWord(removed.length)} will be removed from ${import_chalk.default.bold(project.name)}:`
  );
  for (const line of removedLines) {
    output_manager_default.print(`  ${line}
`);
  }
  if (!canConfirm(client)) {
    return confirmationRequired(
      client,
      `Removing ${removed.length} trace sampling ${ruleWord(removed.length)} from ${project.name} needs a confirmation, and this session cannot prompt for one. Rules at risk: ${removedLines.join(", ")}.`,
      [
        {
          command: commandToRunByHand(
            client,
            environmentArg,
            pathArg,
            defaultFlag
          ),
          when: "Run this in a terminal and answer the prompt"
        }
      ]
    );
  }
  const confirmed = await client.input.confirm(
    `Remove ${removed.length} trace sampling ${ruleWord(removed.length)}?`,
    false
  );
  if (!confirmed) {
    output_manager_default.log("Canceled.");
    return 0;
  }
  if (!asJson) {
    output_manager_default.spinner("Updating trace sampling rules\u2026");
  }
  try {
    await writeSamplingRules({
      client,
      ...scope,
      tracing,
      rules: kept.map((entry) => entry.rule)
    });
  } catch (err) {
    output_manager_default.stopSpinner();
    return handleTracingApiError(client, err);
  }
  output_manager_default.stopSpinner();
  const message = `Removed ${removed.length} trace sampling ${ruleWord(removed.length)} from ${project.name}. ${kept.length} of ${RULE_LIMIT} rules.`;
  if (asJson) {
    writeConfigJson(client, {
      project,
      bare: removed,
      envelope: { removed, ruleCount: kept.length, ruleLimit: RULE_LIMIT },
      message,
      next: [
        {
          command: getCommandNamePlain("traces config ls"),
          when: "Read back every remaining sampling rule"
        }
      ]
    });
    return 0;
  }
  output_manager_default.success(
    `Removed ${removed.length} trace sampling ${ruleWord(removed.length)} from ${import_chalk.default.bold(project.name)}. ${kept.length} of ${RULE_LIMIT} rules.`
  );
  return 0;
}
export {
  rm as default
};

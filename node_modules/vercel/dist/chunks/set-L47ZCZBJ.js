import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  EMPTY_PATH_ERROR,
  ENVIRONMENT_ERROR,
  RATE_ERROR,
  RULE_LIMIT,
  formatRate,
  formatRuleTarget,
  handleTracingApiError,
  hasSameKey,
  invalidArguments,
  isRuleEnvironment,
  parseSampleRate,
  readProjectTracing,
  resolveConfigScope,
  subcommandArguments,
  toApiRate,
  toRule,
  writeConfigJson,
  writeSamplingRules
} from "./chunk-ZKUHCL6O.js";
import "./chunk-5GGUB4EO.js";
import {
  validateJsonOutput
} from "./chunk-KXDWXXJH.js";
import {
  tracesCommand
} from "./chunk-7Q45OKWR.js";
import {
  setSubcommand
} from "./chunk-GY5I4AYD.js";
import {
  help
} from "./chunk-RZ5NP6HN.js";
import "./chunk-E6LFKMI2.js";
import "./chunk-OHER4DGX.js";
import {
  TelemetryClient
} from "./chunk-CYNB6LL4.js";
import "./chunk-L7CEMAJG.js";
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

// src/commands/traces/config/set.ts
var import_chalk = __toESM(require_source(), 1);

// src/util/telemetry/commands/traces/config/set.ts
var TracesConfigSetTelemetryClient = class extends TelemetryClient {
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
  trackCliArgumentRate(rate) {
    if (rate) {
      this.trackCliArgument({
        arg: "rate",
        value: this.redactedValue
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
  trackCliFlagJson(json) {
    if (json) {
      this.trackCliFlag("json");
    }
  }
};

// src/commands/traces/config/set.ts
var USAGE = "traces config set <environment> <rate> [requestPath]";
async function set(client) {
  const telemetry = new TracesConfigSetTelemetryClient({
    opts: { store: client.telemetryEventStore }
  });
  let parsedArgs;
  const flagsSpecification = getFlagsSpecification(setSubcommand.options);
  try {
    parsedArgs = parseArguments(client.argv.slice(2), flagsSpecification);
  } catch (err) {
    printError(err);
    return 1;
  }
  const { flags } = parsedArgs;
  const [environmentArg, rateArg, ...pathArgs] = subcommandArguments(
    parsedArgs.args
  );
  const pathArg = pathArgs[0];
  telemetry.trackCliArgumentEnvironment(environmentArg);
  telemetry.trackCliArgumentRate(rateArg);
  telemetry.trackCliArgumentRequestPath(pathArg);
  telemetry.trackCliOptionFormat(flags["--format"]);
  telemetry.trackCliFlagJson(flags["--json"]);
  telemetry.trackCliOptionProject(flags["--project"]);
  if (environmentArg === void 0 || rateArg === void 0) {
    output_manager_default.print(
      help(setSubcommand, {
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
  const sampleRate = parseSampleRate(rateArg);
  if (sampleRate === void 0) {
    return invalidArguments(client, `${RATE_ERROR} Received: ${rateArg}`);
  }
  if (pathArg !== void 0 && pathArg.trim() === "") {
    return invalidArguments(client, EMPTY_PATH_ERROR);
  }
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
  const rule = {
    environment: environmentArg,
    requestPath: pathArg ?? null,
    sampleRate
  };
  if (!asJson) {
    output_manager_default.spinner("Updating trace sampling rules\u2026");
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
  const existingIndex = entries.findIndex((entry) => hasSameKey(entry.row, rule));
  const previous = existingIndex === -1 ? void 0 : entries[existingIndex].row;
  const nextRules = existingIndex === -1 ? [...entries.map((entry) => entry.rule), toRule(rule)] : entries.map(
    (entry, index) => index === existingIndex ? { ...entry.rule, rate: toApiRate(rule.sampleRate) } : entry.rule
  );
  if (nextRules.length > RULE_LIMIT) {
    output_manager_default.stopSpinner();
    return invalidArguments(
      client,
      `A project can have at most ${RULE_LIMIT} trace sampling rules, and ${project.name} already has ${entries.length}. Remove one with ${getCommandName("traces config rm <environment> [requestPath]")} first.`
    );
  }
  try {
    await writeSamplingRules({ client, ...scope, tracing, rules: nextRules });
  } catch (err) {
    output_manager_default.stopSpinner();
    return handleTracingApiError(client, err);
  }
  output_manager_default.stopSpinner();
  const target = formatRuleTarget(rule.environment, rule.requestPath);
  const wasClause = previous ? ` (was ${formatRate(previous.sampleRate)})` : "";
  const successLine = (subject) => `Set ${subject} to ${formatRate(rule.sampleRate)}${wasClause}. ${nextRules.length} of ${RULE_LIMIT} rules.`;
  if (asJson) {
    writeConfigJson(client, {
      project,
      bare: rule,
      envelope: {
        rule,
        previousSampleRate: previous?.sampleRate ?? null,
        ruleCount: nextRules.length,
        ruleLimit: RULE_LIMIT
      },
      message: successLine(target),
      next: [
        {
          command: getCommandNamePlain("traces config ls"),
          when: "Read back every sampling rule"
        }
      ]
    });
    return 0;
  }
  output_manager_default.success(successLine(import_chalk.default.bold(target)));
  return 0;
}
export {
  set as default
};

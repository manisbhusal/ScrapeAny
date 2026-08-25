import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  RULE_LIMIT,
  formatPath,
  formatRate,
  handleTracingApiError,
  readProjectTracing,
  resolveConfigScope,
  subcommandArguments,
  writeConfigJson
} from "./chunk-ZKUHCL6O.js";
import "./chunk-5GGUB4EO.js";
import {
  formatTable
} from "./chunk-OQ3C5VXZ.js";
import {
  validateLsArgs
} from "./chunk-5LX2JDZP.js";
import {
  validateJsonOutput
} from "./chunk-KXDWXXJH.js";
import {
  lsSubcommand
} from "./chunk-GY5I4AYD.js";
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

// src/commands/traces/config/ls.ts
var import_chalk = __toESM(require_source(), 1);

// src/util/telemetry/commands/traces/config/ls.ts
var TracesConfigLsTelemetryClient = class extends TelemetryClient {
  trackCliFlagJson(json) {
    if (json) {
      this.trackCliFlag("json");
    }
  }
};

// src/commands/traces/config/ls.ts
var SET_HINT = "traces config set <environment> <rate> [requestPath]";
function ruleCountLabel(count) {
  return `${count} of ${RULE_LIMIT} rules`;
}
function printTable(projectName, rows) {
  output_manager_default.log(
    `Trace sampling rules for ${import_chalk.default.bold(projectName)} (${ruleCountLabel(rows.length)})`
  );
  output_manager_default.print(
    `${formatTable(
      ["environment", "path", "rate"],
      ["l", "l", "l"],
      [
        {
          rows: rows.map((row) => [
            row.environment,
            formatPath(row.requestPath),
            formatRate(row.sampleRate)
          ])
        }
      ]
    )}
`
  );
}
async function ls(client) {
  const telemetry = new TracesConfigLsTelemetryClient({
    opts: { store: client.telemetryEventStore }
  });
  let parsedArgs;
  const flagsSpecification = getFlagsSpecification(lsSubcommand.options);
  try {
    parsedArgs = parseArguments(client.argv.slice(2), flagsSpecification);
  } catch (err) {
    printError(err);
    return 1;
  }
  const { flags } = parsedArgs;
  telemetry.trackCliOptionFormat(flags["--format"]);
  telemetry.trackCliFlagJson(flags["--json"]);
  telemetry.trackCliOptionProject(flags["--project"]);
  const argsResult = validateLsArgs({
    commandName: "traces config ls",
    args: subcommandArguments(parsedArgs.args),
    maxArgs: 0,
    exitCode: 2
  });
  if (argsResult !== 0) {
    return argsResult;
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
  if (!asJson) {
    output_manager_default.spinner("Fetching trace sampling rules\u2026");
  }
  let project;
  let entries;
  try {
    ({ project, entries } = await readProjectTracing({ client, ...scope }));
  } catch (err) {
    output_manager_default.stopSpinner();
    return handleTracingApiError(client, err);
  }
  output_manager_default.stopSpinner();
  const rows = entries.map((entry) => entry.row);
  const message = rows.length === 0 ? `No trace sampling rules for ${project.name}.` : `Listed ${ruleCountLabel(rows.length)}.`;
  if (asJson) {
    writeConfigJson(client, {
      project,
      bare: rows,
      envelope: { rules: rows },
      message,
      next: [
        {
          command: getCommandNamePlain(SET_HINT),
          when: "Add or replace a sampling rule"
        }
      ]
    });
    return 0;
  }
  if (rows.length === 0) {
    output_manager_default.log(`No trace sampling rules for ${import_chalk.default.bold(project.name)}.`);
    output_manager_default.dim(`Add one with ${getCommandName(SET_HINT)}`);
    return 0;
  }
  printTable(project.name, rows);
  return 0;
}
export {
  ls as default
};

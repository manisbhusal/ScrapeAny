import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  repositoryPath
} from "./chunk-BEQV3X2L.js";
import {
  emitVcrArgParseError,
  formatRelativeTime,
  handleVcrApiError,
  requireVcrRepository,
  resolveVcrScope,
  validateVcrJsonOutput
} from "./chunk-M3OSDZPY.js";
import "./chunk-G75NFPIT.js";
import "./chunk-KQRVZWJU.js";
import "./chunk-KXDWXXJH.js";
import {
  inspectSubcommand
} from "./chunk-CJV7J7B5.js";
import "./chunk-EZKW5YJ2.js";
import "./chunk-NFU4XJIR.js";
import "./chunk-3HZLXCVL.js";
import "./chunk-R6IGDGX3.js";
import "./chunk-E6LFKMI2.js";
import "./chunk-OHER4DGX.js";
import "./chunk-CYNB6LL4.js";
import "./chunk-L7CEMAJG.js";
import "./chunk-GGP5R3FU.js";
import {
  printError
} from "./chunk-CQJRLNTX.js";
import {
  parseArguments
} from "./chunk-57RHXXXG.js";
import "./chunk-RKDCNQ4S.js";
import {
  isAPIError
} from "./chunk-AWCID36T.js";
import {
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

// src/commands/vcr/inspect.ts
var import_chalk = __toESM(require_source(), 1);
function printRepository(repository) {
  output_manager_default.print("\n");
  output_manager_default.print(`  ${import_chalk.default.cyan("Name")}			${repository.name}
`);
  output_manager_default.print(`  ${import_chalk.default.cyan("ID")}			${repository.id}
`);
  output_manager_default.print(`  ${import_chalk.default.cyan("Project ID")}		${repository.projectId}
`);
  output_manager_default.print(
    `  ${import_chalk.default.cyan("Created")}		${formatRelativeTime(repository.createdAt)}
`
  );
  output_manager_default.print(
    `  ${import_chalk.default.cyan("Updated")}		${formatRelativeTime(repository.updatedAt)}
`
  );
  output_manager_default.print("\n");
}
async function inspect(client, argv, telemetry) {
  let parsedArgs;
  try {
    parsedArgs = parseArguments(
      argv,
      getFlagsSpecification(inspectSubcommand.options)
    );
  } catch (err) {
    emitVcrArgParseError(
      client,
      err,
      "vcr inspect <repository> --project <name-or-id>"
    );
    printError(err);
    return 1;
  }
  const fr = validateVcrJsonOutput(client, parsedArgs.flags);
  if (typeof fr === "number") {
    return fr;
  }
  const repository = parsedArgs.args[0];
  const project = parsedArgs.flags["--project"];
  telemetry.trackCliOptionProject(project);
  telemetry.trackCliOptionFormat(parsedArgs.flags["--format"]);
  const missingRepository = requireVcrRepository(
    client,
    repository,
    fr.jsonOutput,
    "vcr inspect <repository>"
  );
  if (typeof missingRepository === "number") {
    return missingRepository;
  }
  const scope = await resolveVcrScope(client, {
    project,
    jsonOutput: fr.jsonOutput
  });
  if (typeof scope === "number") {
    return scope;
  }
  const path = repositoryPath(scope, repository);
  output_manager_default.spinner("Fetching repository...");
  try {
    const result = await client.fetch(path);
    if (fr.jsonOutput) {
      client.stdout.write(`${JSON.stringify(result.repository, null, 2)}
`);
    } else {
      output_manager_default.log(`${import_chalk.default.bold("Repository")} ${import_chalk.default.cyan(repository)}`);
      printRepository(result.repository);
    }
    return 0;
  } catch (err) {
    if (isAPIError(err)) {
      return handleVcrApiError(client, err, fr.jsonOutput);
    }
    throw err;
  } finally {
    output_manager_default.stopSpinner();
  }
}
export {
  inspect as default
};

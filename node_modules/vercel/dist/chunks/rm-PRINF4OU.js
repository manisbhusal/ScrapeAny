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
  handleVcrApiError,
  requireVcrRepository,
  resolveVcrScope,
  validateVcrJsonOutput
} from "./chunk-M3OSDZPY.js";
import "./chunk-G75NFPIT.js";
import "./chunk-KQRVZWJU.js";
import "./chunk-KXDWXXJH.js";
import {
  removeSubcommand
} from "./chunk-CJV7J7B5.js";
import "./chunk-EZKW5YJ2.js";
import "./chunk-NFU4XJIR.js";
import "./chunk-3HZLXCVL.js";
import "./chunk-R6IGDGX3.js";
import "./chunk-E6LFKMI2.js";
import "./chunk-OHER4DGX.js";
import "./chunk-CYNB6LL4.js";
import {
  AGENT_REASON,
  buildCommandWithYes,
  outputAgentError
} from "./chunk-L7CEMAJG.js";
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
import "./chunk-S7KYDPEM.js";
import "./chunk-TZ2YI2VH.js";

// src/commands/vcr/rm.ts
async function rm(client, argv, telemetry) {
  let parsedArgs;
  try {
    parsedArgs = parseArguments(
      argv,
      getFlagsSpecification(removeSubcommand.options)
    );
  } catch (err) {
    emitVcrArgParseError(
      client,
      err,
      "vcr rm <repository> --project <name-or-id>"
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
  const skipConfirmation = Boolean(parsedArgs.flags["--yes"]);
  telemetry.trackCliOptionProject(project);
  telemetry.trackCliFlagYes(parsedArgs.flags["--yes"]);
  telemetry.trackCliOptionFormat(parsedArgs.flags["--format"]);
  const missingRepository = requireVcrRepository(
    client,
    repository,
    fr.jsonOutput,
    "vcr rm <repository>"
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
  if (!skipConfirmation) {
    outputAgentError(
      client,
      {
        status: "error",
        reason: AGENT_REASON.CONFIRMATION_REQUIRED,
        message: "Deleting a repository deletes it and all of its images. Re-run with --yes.",
        next: [{ command: buildCommandWithYes(client.argv) }]
      },
      1
    );
    if (!await client.input.confirm(
      `Delete repository ${repository} and all of its images? This cannot be undone.`,
      false
    )) {
      output_manager_default.log("Canceled");
      return 0;
    }
  }
  const path = repositoryPath(scope, repository);
  output_manager_default.spinner("Deleting repository...");
  try {
    await client.fetch(path, { method: "DELETE" });
    if (fr.jsonOutput) {
      client.stdout.write(
        `${JSON.stringify({ repository, deleted: true }, null, 2)}
`
      );
    } else {
      output_manager_default.success(`Repository ${repository} deleted`);
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
  rm as default
};

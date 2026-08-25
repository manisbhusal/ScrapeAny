import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  getSubcommand
} from "./chunk-YPQSDAEW.js";
import {
  getCommandAliases
} from "./chunk-QG4PCM45.js";
import {
  tracesCommand
} from "./chunk-7Q45OKWR.js";
import {
  lsSubcommand,
  rmSubcommand,
  setSubcommand,
  tracesConfigCommand
} from "./chunk-GY5I4AYD.js";
import "./chunk-CJV7J7B5.js";
import "./chunk-EZKW5YJ2.js";
import "./chunk-NFU4XJIR.js";
import "./chunk-3HZLXCVL.js";
import "./chunk-MTWHQEXI.js";
import "./chunk-POOO7W47.js";
import "./chunk-SLPSPYVR.js";
import "./chunk-4KD5BYHB.js";
import "./chunk-DWIC7MRV.js";
import "./chunk-XM3LOQIX.js";
import "./chunk-XDGOOW3K.js";
import "./chunk-VP5Y3SZG.js";
import "./chunk-7XX4ZEOV.js";
import {
  help
} from "./chunk-RZ5NP6HN.js";
import "./chunk-OHER4DGX.js";
import {
  TelemetryClient
} from "./chunk-CYNB6LL4.js";
import "./chunk-RKDCNQ4S.js";
import "./chunk-Q2DGFCO7.js";
import "./chunk-P4QNYOFB.js";
import {
  output_manager_default
} from "./chunk-OX7KI3LF.js";
import "./chunk-S7KYDPEM.js";
import "./chunk-TZ2YI2VH.js";

// src/util/telemetry/commands/traces/config/index.ts
var TracesConfigTelemetryClient = class extends TelemetryClient {
  trackCliSubcommandLs(actual) {
    this.trackCliSubcommand({
      subcommand: "ls",
      value: actual
    });
  }
  trackCliSubcommandSet(actual) {
    this.trackCliSubcommand({
      subcommand: "set",
      value: actual
    });
  }
  trackCliSubcommandRm(actual) {
    this.trackCliSubcommand({
      subcommand: "rm",
      value: actual
    });
  }
};

// src/commands/traces/config/index.ts
var COMMAND_CONFIG = {
  ls: getCommandAliases(lsSubcommand),
  set: getCommandAliases(setSubcommand),
  rm: getCommandAliases(rmSubcommand)
};
var SUBCOMMAND_METADATA = {
  ls: lsSubcommand,
  set: setSubcommand,
  rm: rmSubcommand
};
async function config(client, { args, needHelp, subcommandOriginal, telemetry }) {
  const { subcommand: action, subcommandOriginal: actionOriginal } = getSubcommand(args, COMMAND_CONFIG);
  const actionMetadata = typeof action === "string" ? SUBCOMMAND_METADATA[action] : void 0;
  function printHelp(command, nested) {
    output_manager_default.print(
      help(command, {
        // `help` takes a single parent, so a nested group borrows the parent
        // command with its own path as the name.
        parent: nested ? { ...tracesCommand, name: "traces config" } : tracesCommand,
        columns: client.stderr.columns
      })
    );
    return 2;
  }
  if (needHelp) {
    telemetry.trackCliFlagHelp("traces", subcommandOriginal);
    return actionMetadata ? printHelp(actionMetadata, true) : printHelp(tracesConfigCommand, false);
  }
  telemetry.trackCliSubcommandConfig(subcommandOriginal);
  const configTelemetry = new TracesConfigTelemetryClient({
    opts: { store: client.telemetryEventStore }
  });
  switch (action) {
    case "ls":
      configTelemetry.trackCliSubcommandLs(actionOriginal);
      return (await import("./ls-TM6NTZEB.js")).default(client);
    case "set":
      configTelemetry.trackCliSubcommandSet(actionOriginal);
      return (await import("./set-L47ZCZBJ.js")).default(client);
    case "rm":
      configTelemetry.trackCliSubcommandRm(actionOriginal);
      return (await import("./rm-RV5SQFQA.js")).default(client);
    default:
      return printHelp(tracesConfigCommand, false);
  }
}
export {
  config as default
};

import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  pkg_default
} from "./chunk-P4QNYOFB.js";
import {
  require_source
} from "./chunk-S7KYDPEM.js";
import {
  __commonJS,
  __toESM
} from "./chunk-TZ2YI2VH.js";

// ../../node_modules/.pnpm/title@3.4.1/node_modules/title/lib/lower-case.js
var require_lower_case = __commonJS({
  "../../node_modules/.pnpm/title@3.4.1/node_modules/title/lib/lower-case.js"(exports, module) {
    var conjunctions = [
      "for",
      "and",
      "nor",
      "but",
      "or",
      "yet",
      "so"
    ];
    var articles = [
      "a",
      "an",
      "the"
    ];
    var prepositions = [
      "aboard",
      "about",
      "above",
      "across",
      "after",
      "against",
      "along",
      "amid",
      "among",
      "anti",
      "around",
      "as",
      "at",
      "before",
      "behind",
      "below",
      "beneath",
      "beside",
      "besides",
      "between",
      "beyond",
      "but",
      "by",
      "concerning",
      "considering",
      "despite",
      "down",
      "during",
      "except",
      "excepting",
      "excluding",
      "following",
      "for",
      "from",
      "in",
      "inside",
      "into",
      "like",
      "minus",
      "near",
      "of",
      "off",
      "on",
      "onto",
      "opposite",
      "over",
      "past",
      "per",
      "plus",
      "regarding",
      "round",
      "save",
      "since",
      "than",
      "through",
      "to",
      "toward",
      "towards",
      "under",
      "underneath",
      "unlike",
      "until",
      "up",
      "upon",
      "versus",
      "via",
      "with",
      "within",
      "without"
    ];
    module.exports = /* @__PURE__ */ new Set([
      ...conjunctions,
      ...articles,
      ...prepositions
    ]);
  }
});

// ../../node_modules/.pnpm/title@3.4.1/node_modules/title/lib/specials.js
var require_specials = __commonJS({
  "../../node_modules/.pnpm/title@3.4.1/node_modules/title/lib/specials.js"(exports, module) {
    var intended = [
      "ZEIT",
      "ZEIT Inc.",
      "CLI",
      "API",
      "HTTP",
      "HTTPS",
      "JSX",
      "DNS",
      "URL",
      "now.sh",
      "now.json",
      "CI",
      "CDN",
      "package.json",
      "GitHub",
      "CSS",
      "JS",
      "HTML",
      "WordPress",
      "JavaScript",
      "Next.js",
      "Node.js"
    ];
    module.exports = intended;
  }
});

// ../../node_modules/.pnpm/title@3.4.1/node_modules/title/lib/index.js
var require_lib = __commonJS({
  "../../node_modules/.pnpm/title@3.4.1/node_modules/title/lib/index.js"(exports, module) {
    var lowerCase = require_lower_case();
    var specials = require_specials();
    var regex = /(?:(?:(\s?(?:^|[.\(\)!?;:"-])\s*)(\w))|(\w))(\w*[’']*\w*)/g;
    var convertToRegExp = (specials2) => specials2.map((s) => [new RegExp(`\\b${s}\\b`, "gi"), s]);
    function parseMatch(match) {
      const firstCharacter = match[0];
      if (/\s/.test(firstCharacter)) {
        return match.substr(1);
      }
      if (/[\(\)]/.test(firstCharacter)) {
        return null;
      }
      return match;
    }
    module.exports = (str, options = {}) => {
      str = str.toLowerCase().replace(regex, (m, lead = "", forced, lower, rest) => {
        const parsedMatch = parseMatch(m);
        if (!parsedMatch) {
          return m;
        }
        if (!forced) {
          const fullLower = lower + rest;
          if (lowerCase.has(fullLower)) {
            return parsedMatch;
          }
        }
        return lead + (lower || forced).toUpperCase() + rest;
      });
      const customSpecials = options.special || [];
      const replace = [...specials, ...customSpecials];
      const replaceRegExp = convertToRegExp(replace);
      replaceRegExp.forEach(([pattern, s]) => {
        str = str.replace(pattern, s);
      });
      return str;
    };
  }
});

// src/util/output/cmd.ts
var import_chalk = __toESM(require_source(), 1);
function cmd(text) {
  return `${import_chalk.default.gray("`")}${import_chalk.default.cyan(text)}${import_chalk.default.gray("`")}`;
}

// src/util/pkg-name.ts
var import_title = __toESM(require_lib(), 1);
var packageName = pkg_default.name;
function getTitleName() {
  const str = packageName;
  return (0, import_title.default)(str);
}
function getCommandName(subcommands) {
  let vercel = packageName;
  if (subcommands) {
    vercel = `${vercel} ${subcommands}`;
  }
  return cmd(vercel);
}
function getCommandNamePlain(subcommands) {
  return subcommands ? `${packageName} ${subcommands}` : packageName;
}

// src/util/get-flags-specification.ts
function getFlagsSpecification(options) {
  const flagsSpecification = {};
  for (const option of options) {
    flagsSpecification[`--${option.name}`] = option.type;
    if (option.shorthand) {
      flagsSpecification[`-${option.shorthand}`] = `--${option.name}`;
    }
  }
  return flagsSpecification;
}

// src/util/redact-args.ts
var SENSITIVE_AUTH_FLAG_NAMES = /* @__PURE__ */ new Set(["--token", "-t"]);
function normalizeFlagName(flag) {
  if (flag.includes("=")) {
    return flag.slice(0, flag.indexOf("="));
  }
  return flag;
}
function stripSensitiveAuthArgs(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const name = normalizeFlagName(arg);
    if (SENSITIVE_AUTH_FLAG_NAMES.has(name)) {
      if (!arg.includes("=") && i + 1 < args.length) {
        i++;
      }
      continue;
    }
    out.push(arg);
  }
  return out;
}

// src/util/arg-common.ts
var globalCommandOptions = [
  {
    name: "help",
    shorthand: "h",
    type: Boolean,
    description: "Output usage information",
    deprecated: false
  },
  {
    name: "version",
    shorthand: "v",
    type: Boolean,
    description: "Output the version number",
    deprecated: false
  },
  {
    name: "cwd",
    shorthand: null,
    type: String,
    argument: "DIR",
    description: "Sets the current working directory for a single run of a command",
    deprecated: false
  },
  {
    name: "local-config",
    shorthand: "A",
    type: String,
    argument: "FILE",
    description: "Path to the local `vercel.json` file",
    deprecated: false
  },
  {
    name: "global-config",
    shorthand: "Q",
    type: String,
    argument: "DIR",
    description: "Path to the global `.vercel` directory",
    deprecated: false
  },
  {
    name: "debug",
    shorthand: "d",
    type: Boolean,
    description: "Debug mode (default off)",
    deprecated: false
  },
  {
    name: "no-color",
    shorthand: null,
    type: Boolean,
    description: "No color mode (default off)",
    deprecated: false
  },
  {
    name: "non-interactive",
    shorthand: null,
    type: Boolean,
    description: "Run without interactive prompts; when an agent is detected this is the default",
    deprecated: false
  },
  {
    name: "scope",
    shorthand: "S",
    type: String,
    description: "Set a custom scope",
    deprecated: false
  },
  {
    name: "token",
    shorthand: "t",
    type: String,
    argument: "TOKEN",
    description: "Login token",
    deprecated: false
  },
  { name: "team", shorthand: "T", type: String, deprecated: false },
  { name: "api", shorthand: null, type: String, deprecated: false }
];
var GLOBAL_CLI_FLAG_NAMES = (() => {
  const set = /* @__PURE__ */ new Set();
  for (const opt of globalCommandOptions) {
    set.add(`--${opt.name}`);
    if (opt.shorthand) {
      set.add(`-${opt.shorthand}`);
    }
  }
  return set;
})();
function globalCliFlagTakesValue(flagName) {
  const normalized = normalizeFlagName(flagName);
  for (const opt of globalCommandOptions) {
    if (`--${opt.name}` === normalized) {
      return opt.type === String;
    }
    if (opt.shorthand && `-${opt.shorthand}` === normalized) {
      return opt.type === String;
    }
  }
  return false;
}
var SUGGESTION_FLAGS_TAKING_VALUE = /* @__PURE__ */ new Set([
  "--config",
  "--environment",
  "--git-branch",
  "--id",
  "--value",
  "--status",
  "--name",
  "--slug",
  "--version",
  // redirects list --version
  "--search",
  "--format",
  "--project",
  "--page",
  "--per-page"
]);
function suggestionFlagTakesSeparateValue(flagName) {
  const name = normalizeFlagName(flagName);
  if (globalCliFlagTakesValue(name))
    return true;
  return SUGGESTION_FLAGS_TAKING_VALUE.has(name);
}
function getSameSubcommandSuggestionFlags(args) {
  const safeArgs = stripSensitiveAuthArgs(args);
  const out = [];
  for (let i = 0; i < safeArgs.length; i++) {
    const a = safeArgs[i];
    if (!a.startsWith("-"))
      continue;
    out.push(a);
    if (a.includes("="))
      continue;
    const name = a;
    if (suggestionFlagTakesSeparateValue(name) && i + 1 < safeArgs.length && !safeArgs[i + 1].startsWith("-")) {
      out.push(safeArgs[++i]);
    }
  }
  return out;
}
var GLOBAL_OPTIONS = getFlagsSpecification(globalCommandOptions);
var arg_common_default = () => GLOBAL_OPTIONS;
var yesOption = {
  name: "yes",
  shorthand: "y",
  type: Boolean,
  deprecated: false,
  description: "Accept default value for all prompts"
};
var nextOption = {
  name: "next",
  shorthand: "N",
  type: Number,
  deprecated: false,
  description: "Show next page of results",
  argument: "MS"
};
var confirmOption = {
  name: "confirm",
  shorthand: "c",
  type: Boolean,
  deprecated: true
};
var limitOption = {
  name: "limit",
  shorthand: null,
  type: Number,
  deprecated: false,
  description: "Number of results to return per page (default: 20, max: 100)",
  argument: "NUMBER"
};
var forceOption = {
  name: "force",
  shorthand: "f",
  type: Boolean,
  deprecated: false
};
var formatOption = {
  name: "format",
  shorthand: "F",
  type: String,
  argument: "FORMAT",
  description: "Specify the output format (json)",
  deprecated: false
};
var jsonOption = {
  name: "json",
  shorthand: null,
  type: Boolean,
  deprecated: false,
  description: "Output as JSON"
};
var allOption = {
  name: "all",
  shorthand: "a",
  type: Boolean,
  deprecated: false,
  description: "List resources across all projects"
};
var projectOption = {
  name: "project",
  shorthand: null,
  type: String,
  argument: "NAME_OR_ID",
  description: "Project name or ID (defaults to the linked project)",
  deprecated: false
};
var deploymentOption = {
  name: "deployment",
  shorthand: null,
  type: String,
  deprecated: false,
  description: "The deployment ID or URL to target",
  argument: "ID|URL"
};
var protectionBypassOption = {
  name: "protection-bypass",
  shorthand: null,
  type: String,
  deprecated: false,
  description: "Protection bypass secret for accessing protected deployments",
  argument: "SECRET"
};
var GLOBAL_LONG_TO_OPT = /* @__PURE__ */ new Map();
var GLOBAL_SHORT_TO_OPT = /* @__PURE__ */ new Map();
for (const opt of globalCommandOptions) {
  GLOBAL_LONG_TO_OPT.set(`--${opt.name}`, opt);
  if (opt.shorthand) {
    GLOBAL_SHORT_TO_OPT.set(`-${opt.shorthand}`, opt);
  }
}
function getGlobalFlagsFromArgs(args, options) {
  const delimiterIndex = args.indexOf("--");
  const cliArgs = delimiterIndex === -1 ? args : args.slice(0, delimiterIndex);
  const safeArgs = stripSensitiveAuthArgs(cliArgs);
  const out = [];
  for (let i = 0; i < safeArgs.length; i++) {
    const a = safeArgs[i];
    if (options?.preserveYes && (a === "--yes" || a === "-y")) {
      out.push(a);
      continue;
    }
    if (options?.preserveConfig && (a === "--config" || a.startsWith("--config="))) {
      out.push(a);
      if (a === "--config") {
        const next = safeArgs[i + 1];
        if (next && !next.startsWith("-")) {
          out.push(next);
          i++;
        }
      }
      continue;
    }
    let opt;
    if (a.startsWith("--") && a.includes("=")) {
      const name = a.slice(2).split("=")[0];
      opt = GLOBAL_LONG_TO_OPT.get(`--${name}`);
      if (opt)
        out.push(a);
      continue;
    }
    opt = GLOBAL_LONG_TO_OPT.get(a) || GLOBAL_SHORT_TO_OPT.get(a);
    if (!opt)
      continue;
    out.push(a);
    if (opt.type === String && !a.includes("=")) {
      const next = safeArgs[i + 1];
      if (next && !next.startsWith("-")) {
        out.push(next);
        i++;
      }
    }
  }
  if (options?.preserveProject) {
    const projectOption2 = findProjectOption(safeArgs);
    if (projectOption2)
      out.push(...projectOption2.args);
  }
  return out;
}
function findProjectOption(args) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--")
      return void 0;
    if (arg.startsWith("--project=")) {
      return {
        value: arg.slice("--project=".length),
        args: [arg]
      };
    }
    if (arg === "--project") {
      const value = args[i + 1];
      if (value && !value.startsWith("-")) {
        return { value, args: [arg, value] };
      }
      return void 0;
    }
  }
  return void 0;
}
function getProjectOptionFromArgs(args) {
  return findProjectOption(args)?.value;
}

export {
  require_lib,
  cmd,
  packageName,
  getTitleName,
  getCommandName,
  getCommandNamePlain,
  getFlagsSpecification,
  stripSensitiveAuthArgs,
  globalCommandOptions,
  suggestionFlagTakesSeparateValue,
  getSameSubcommandSuggestionFlags,
  arg_common_default,
  yesOption,
  nextOption,
  confirmOption,
  limitOption,
  forceOption,
  formatOption,
  jsonOption,
  allOption,
  projectOption,
  deploymentOption,
  protectionBypassOption,
  getGlobalFlagsFromArgs,
  getProjectOptionFromArgs
};

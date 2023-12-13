require("dotenv").config();
require("./otel-providers.js");

const opentelemetry = require("@opentelemetry/api");
const meter = opentelemetry.metrics.getMeter(process.env.OTEL_SERVICE_NAME);
const otelMigrationRead = meter.createUpDownCounter("migration.read");
const otelMigrationWrite = meter.createUpDownCounter("migration.write");
const otelMigrationReadConsistent = meter.createUpDownCounter(
  "migration.summary.consistent"
);
const otelMigrationReadSummary = meter.createUpDownCounter(
  "migration.summary.read"
);
const otelMigrationWriteSummary = meter.createUpDownCounter(
  "migration.summary.write"
);
const LD = require("@launchdarkly/node-server-sdk");
const ldClient = LD.init(process.env.LD_SDK_KEY, {
  logger: LD.basicLogger({ level: "debug", destination: console.log }),
});

const { defaultMultiUser } = require("./data.js");
const context = defaultMultiUser[0]; // name: "Everett Gibson"
const isRandomizeRead = process.env.RANDOMIZE_READ === "true";
const isRandomizeWrite = process.env.RANDOMIZE_WRITE === "true";
const flagKey = process.env.LD_FLAG_KEY;
const interval = process.env.POLL_INTERVAL;
// const interval = 2500;

function RandomBetween(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

const options = {
  readNew: async (payload) => {
    return new Promise((resolve, reject) => {
      return setTimeout(
        async (start) => {
          const operation = "readNew";
          const now = Date.now();
          const executionTime = now - start;

          const value =
            isRandomizeRead && Math.round(Math.random()) == 1
              ? "hello"
              : "goodbye";

          const { value: stage, tracker } = await ldClient.migrationVariation(
            flagKey,
            context,
            LD.LDMigrationStage.Off
          );

          otelMigrationRead.add(1, { operation, executionTime, stage });

          console.log(
            `${now}: Stage[${stage}] Operation[${operation}] user[${payload.user.name}]`
          );

          const status = isRandomizeRead
            ? Math.round(Math.random()) == 1
            : true;
          const params = {
            success: status,
            value,
            executionTime,
            operation,
            stage,
          };
          if (status) {
            resolve(LD.LDMigrationSuccess(params));
          } else {
            reject(LD.LDMigrationError(params));
          }
        },
        RandomBetween(1, 50),
        Date.now()
      );
    });
  },
  readOld: async (payload) => {
    return new Promise((resolve, reject) => {
      return setTimeout(
        async (start) => {
          const operation = "readOld";
          const now = Date.now();
          const executionTime = now - start;
          const value =
            isRandomizeRead && Math.round(Math.random()) == 1
              ? "hello"
              : "goodbye";

          const { value: stage, tracker } = await ldClient.migrationVariation(
            flagKey,
            context,
            LD.LDMigrationStage.Off
          );
          otelMigrationRead.add(1, { operation, executionTime, stage });
          console.log(
            `${now}: Stage[${stage}] Operation[${operation}] user[${payload.user.name}]`
          );
          const status = isRandomizeRead
            ? Math.round(Math.random()) == 1
            : true;
          const params = {
            success: status,
            value,
            executionTime,
            operation,
            stage,
          };
          if (status) {
            resolve(LD.LDMigrationSuccess(params));
          } else {
            reject(LD.LDMigrationError(params));
          }
        },
        RandomBetween(50, 100),
        Date.now()
      );
    });
  },
  writeNew: async (payload) => {
    return new Promise((resolve, reject) => {
      return setTimeout(
        async (start) => {
          const operation = "writeNew";
          const now = Date.now();
          const executionTime = now - start;
          const value =
            isRandomizeWrite && Math.round(Math.random()) == 1
              ? "hello"
              : "goodbye";

          const { value: stage, tracker } = await ldClient.migrationVariation(
            flagKey,
            context,
            LD.LDMigrationStage.Off
          );
          otelMigrationWrite.add(1, { operation, executionTime, stage });
          console.log(
            `${now}: Stage[${stage}] Operation[${operation}] user[${payload.user.name}]`
          );
          const status = isRandomizeWrite
            ? Math.round(Math.random()) == 1
            : true;
          const params = {
            success: status,
            value,
            executionTime,
            operation,
            stage,
          };
          if (status) {
            resolve(LD.LDMigrationSuccess(params));
          } else {
            reject(LD.LDMigrationError(params));
          }
        },
        RandomBetween(1, 50),
        Date.now()
      );
    });
  },
  writeOld: async (payload) => {
    return new Promise((resolve, reject) => {
      return setTimeout(
        async (start) => {
          const operation = "writeOld";
          const now = Date.now();
          const executionTime = now - start;
          const value =
            isRandomizeWrite && Math.round(Math.random()) == 1
              ? "hello"
              : "goodbye";

          const { value: stage, tracker } = await ldClient.migrationVariation(
            flagKey,
            context,
            LD.LDMigrationStage.Off
          );
          otelMigrationWrite.add(1, { operation, executionTime, stage });
          console.log(
            `${now}: Stage[${stage}] Operation[${operation}] user[${payload.user.name}]`
          );
          const status = isRandomizeWrite
            ? Math.round(Math.random()) == 1
            : true;
          const params = {
            success: status,
            value,
            executionTime,
            operation,
            stage,
          };
          if (status) {
            resolve(LD.LDMigrationSuccess(params));
          } else {
            reject(LD.LDMigrationError(params));
          }
        },
        RandomBetween(50, 100),
        Date.now()
      );
    });
  },
  check: (oldVal, newVal) => {
    const now = Date.now();
    console.log(
      `${now}: => Check: Read consistency validation. \noldVal=${JSON.stringify(
        oldVal
      )}\nnewVal=${JSON.stringify(newVal)}`
    );
    const { executionTime: oldTime, value: oldValue } = oldVal;
    const { executionTime: newTime, value: newValue } = newVal;
    const timeDiff = oldTime - newTime;
    console.log(
      `${now}: => Check: Read consistency  Timediff= ${timeDiff} oldVal=${oldValue} newVal=${newValue} Status[${
        oldValue === newValue ? "Pass" : "Fail"
      }]`
    );

    const isConsistent = oldValue === newValue;
    otelMigrationReadConsistent.add(1, {
      operation: "check",
      timeDiff,
      isConsistent,
    });

    return isConsistent;
  },
  execution: new LD.LDSerialExecution(LD.LDExecutionOrdering.Fixed),
  latencyTracking: true,
  errorTracking: true,
};

async function poll({ context, migration, flagKey }) {
  const defaultStage = LD.LDMigrationStage.Off;
  console.log(`\nRunning [${intervalCounter++}] ${new Date()}`);

  // LDMigration.read()
  // https://launchdarkly.github.io/js-core/packages/sdk/server-node/docs/interfaces/LDMigration.html#read
  migration.read(flagKey, context, defaultStage, context).then((result) => {
    console.log(
      `${Date.now()}: => migration:read() Complete. result=${JSON.stringify(
        result
      )}`
    );
    const { origin, success } = result;
    otelMigrationReadSummary.add(1, { origin, success });
  });
  // LDMigration.write()
  // https://launchdarkly.github.io/js-core/packages/sdk/server-node/docs/interfaces/LDMigration.html#write
  migration.write(flagKey, context, defaultStage, context).then((result) => {
    console.log(
      `${Date.now()}: => migration:write() Complete. result=${JSON.stringify(
        result
      )}`
    );
    const { origin, success } = result.authoritative;
    otelMigrationWriteSummary.add(1, { origin, success });
  });
  return Promise.resolve(true);
}

var intervalCounter = 1;
function main() {
  const migration = LD.createMigration(ldClient, options);
  setInterval(poll, interval, {
    context,
    migration,
    flagKey,
  });
}

main();

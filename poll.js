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


function RandomBetween(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

const options = {
  readNew: async (payload) => {
    return new Promise((resolve, reject) => {
      return setTimeout(
        async (startTime) => {
          const now = Date.now();

          const { value: stage } = await ldClient.migrationVariation(
            flagKey,
            context,
            LD.LDMigrationStage.Off
          );
          const ret = await sampleOperation({
            startTime,
            currTime: now,
            stage,
            operation: "readNew",
            isRandomize: isRandomizeRead,
            otelFn: otelMigrationRead,
            payload
          })
          if (ret.success) {
            resolve(LD.LDMigrationSuccess(ret));
          } else {
            reject(LD.LDMigrationError(ret));
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
        async (startTime) => {
          const now = Date.now();

          const { value: stage } = await ldClient.migrationVariation(
            flagKey,
            context,
            LD.LDMigrationStage.Off
          );
          const ret = await sampleOperation({
            startTime,
            currTime: now,
            stage,
            operation: "readOld",
            isRandomize: isRandomizeRead,
            otelFn: otelMigrationRead,
            payload
          })
          if (ret.success) {
            resolve(LD.LDMigrationSuccess(ret));
          } else {
            reject(LD.LDMigrationError(ret));
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
        async (startTime) => {
          const now = Date.now();

          const { value: stage } = await ldClient.migrationVariation(
            flagKey,
            context,
            LD.LDMigrationStage.Off
          );
          const ret = await sampleOperation({
            startTime,
            currTime: now,
            stage,
            operation: "writeNew",
            isRandomize: isRandomizeWrite,
            otelFn: otelMigrationWrite,
            payload
          })

          if (ret.success) {
            resolve(LD.LDMigrationSuccess(ret));
          } else {
            reject(LD.LDMigrationError(ret));
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
        async (startTime) => {
          const now = Date.now();

          const { value: stage } = await ldClient.migrationVariation(
            flagKey,
            context,
            LD.LDMigrationStage.Off
          );
          const ret = await sampleOperation({
            startTime,
            currTime: now,
            stage,
            operation: "writeOld",
            isRandomize: isRandomizeWrite,
            otelFn: otelMigrationWrite,
            payload
          })

          if (ret.success) {
            resolve(LD.LDMigrationSuccess(ret));
          } else {
            reject(LD.LDMigrationError(ret));
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
      `${now}: => Check: Read consistency  Timediff= ${timeDiff} oldVal=${oldValue} newVal=${newValue} Status[${oldValue === newValue ? "Pass" : "Fail"
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

async function sampleOperation({ startTime, currTime, stage, operation, isRandomize, otelFn, payload }) {
  const executionTime = currTime - startTime;
  const isEnabled = isRandomize && Math.round(Math.random()) == 1;

  const status = isRandomize? isEnabled: true;
  const value = status? "hello": "goodbye";
  otelFn.add(1, { operation, executionTime, stage });

  console.log(
    `${currTime}: Stage[${stage}] Operation[${operation}] user[${payload.user.name}] isRandomize=${isRandomize} status=${status}`
  );


  const params = {
    success: status,
    value,
    executionTime,
    operation,
    stage,
  };
  return params;
}

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

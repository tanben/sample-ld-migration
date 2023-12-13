require("dotenv").config();

const { DiagConsoleLogger, DiagLogLevel, diag } = require("@opentelemetry/api");
const opentelemetry = require("@opentelemetry/api");

const { Resource } = require("@opentelemetry/resources");
const {
  SemanticResourceAttributes,
} = require("@opentelemetry/semantic-conventions");
const { registerInstrumentations } = require("@opentelemetry/instrumentation");
const {
  MeterProvider,
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} = require("@opentelemetry/sdk-metrics");
const {
  OTLPMetricExporter,
} = require("@opentelemetry/exporter-metrics-otlp-proto");

const { PrometheusExporter } = require("@opentelemetry/exporter-prometheus");

const OTEL_DEBUG = process.env.OTEL_DEBUG === "true";
OTEL_DEBUG && diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
OTEL_DEBUG && console.log(`OTEL Verbose logging ${OTEL_DEBUG}`);

registerInstrumentations({
  instrumentations: [],
});

const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: `${process.env.OTEL_SERVICE_NAME}`,
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: `${process.env.OTEL_SERVICE_NAME}-instance`,
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
  })
);

const meterProvider = new MeterProvider({
  resource,
});

// NewRelic Exporter
const nrMetricExporter = new OTLPMetricExporter({
  url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`,
  headers: {
    "api-key": `${process.env.NEW_RELIC_LICENSE_INGEST_KEY}`,
  },
});

const nrMetricReader = new PeriodicExportingMetricReader({
  exporter: nrMetricExporter,
  exportIntervalMillis: process.env.EXPORTER_INTERVAL,
});
//- NewRelic end

const consoleMetricReader = new PeriodicExportingMetricReader({
  exporter: new ConsoleMetricExporter(),
  exportIntervalMillis: process.env.EXPORTER_INTERVAL,
});
const metricProviders = {
  newrelic: nrMetricReader,
  prometheus: new PrometheusExporter(),
};
if (process.env.OTEL_ENABLED === "true") {
  console.log("OTEL ENABLED");
  const envProviders = process.env.OTEL_PROVIDERS;
  const providers = envProviders.split(",").map((p) => p.trim());
  providers.forEach((p) => {
    console.log(`loading Provider: ${p}`);
    meterProvider.addMetricReader(metricProviders[p]);
  });
}

if (process.env.OTEL_CONSOLE_LOG === "true") {
  console.log("OTEL Console logger enabled");
  meterProvider.addMetricReader(consoleMetricReader);
}

opentelemetry.metrics.setGlobalMeterProvider(meterProvider);

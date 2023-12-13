# sample-ld-migration
This is a sample request generator for demonstrating LaunchDarkly migration assistant with OpenTelemetry

# Prerequisites
* NodeJS >=v16
* NewRelic Account
* LaunchDarkly account
* Prometheus 
  
# To run
1. copy `.env.example` to `.env`
2. update the `.env` file with your LaunchDarkly SDK key(server-side) and NewRelic ingest key.
3. install npm packages by runing `npm install`.
4. run using command: `npm run migration` or `node poll.js`
   


# Sample Configuration
```

## Application config
POLL_INTERVAL=60000
RANDOMIZE_READ=false
RANDOMIZE_WRITE=false

## LD config
LD_SDK_KEY=sdk-11111111-2222222-333333
LD_FLAG_KEY= "sample-6-stage-flag"


## OTEL config
OTEL_ENABLED=false
EXPORTER_INTERVAL=60000
OTEL_DEBUG=false
OTEL_SERVICE_NAME="sample-migration"
OTEL_CONSOLE_LOG=false
OTEL_PROVIDERS=prometheus
#OTEL_PROVIDERS=newrelic,prometheus

## OTEL Provider config
NEW_RELIC_LICENSE_INGEST_KEY=aaaaa-bbbbbbbbb-cccccccc
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4318



```


# Output
```

Running [1] Wed Dec 13 2023 14:20:09 GMT-0500 (Eastern Standard Time)
1702495209743: Stage[shadow] Operation[writeOld] user[Everett Gibson]
1702495209745: Stage[shadow] Operation[readOld] user[Everett Gibson]
1702495209753: Stage[shadow] Operation[writeNew] user[Everett Gibson]
1702495209755: => migration:write() Complete. result={"authoritative":{"origin":"old","success":true,"result":{"success":true,"value":"goodbye","executionTime":95,"operation":"writeOld","stage":"shadow"}},"nonAuthoritative":{"origin":"new","success":true,"result":{"success":true,"value":"goodbye","executionTime":8,"operation":"writeNew","stage":"shadow"}}}
1702495209787: Stage[shadow] Operation[readNew] user[Everett Gibson]
1702495209788: => Check: Read consistency validation. 
oldVal={"success":true,"value":"goodbye","executionTime":97,"operation":"readOld","stage":"shadow"}
newVal={"success":true,"value":"goodbye","executionTime":41,"operation":"readNew","stage":"shadow"}
1702495209788: => Check: Read consistency  Timediff= 56 oldVal=goodbye newVal=goodbye Status[Pass]
1702495209789: => migration:read() Complete. result={"origin":"old","success":true,"result":{"success":true,"value":"goodbye","executionTime":97,"operation":"readOld","stage":"shadow"}}
```
LaunchDarkly Migration Insights dashboard
![Alt text](./image/ld-dashboard.jpg)

NewRelic Dashboard
![Alt text](./image/nr-dashboard.jpg)

Prometheus Dashboard
![Alt text](./image/prometheus-dashboard.jpg)

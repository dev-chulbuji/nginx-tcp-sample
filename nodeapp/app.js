const express = require('express')
const app = express()

// const
const PORT = process.env.PORT || 3000
const SERVICE_NAME = process.env.SERVICE_NAME || 'dj-nodeapp'
const VERSION = process.env.VERSION || '0.0.1'

// jaeger
const JAEGER_AGENT_HOST = process.env.JAEGER_AGENT_HOST || 'http://jaeger'
const JAEGER_AGENT_PORT = process.env.JAEGER_AGENT_PORT || '6831'

console.log(`
print ENV
PORT: ${PORT}
SERVICE_NAME: ${SERVICE_NAME}
JAEGER_AGENT_PORT: ${JAEGER_AGENT_PORT}
JAEGER_AGENT_HOST: ${JAEGER_AGENT_HOST}
`)

const initTracer = () => {
  const initJaegerTracer = require('jaeger-client').initTracer
  const config = {
    serviceName: SERVICE_NAME,
    // reporter: {
    //   collectorEndpoint: `${JAEGER_AGENT_HOST}:${JAEGER_AGENT_PORT}/api/traces`,
    //   logSpans: true,
    // },
  }
  const options = {
    tags: {
      version: VERSION
    },
    logger: console,
  };

  // Only for DEV the sampler will report every span
  config.sampler = { type: 'const', param: 1 }

  return initJaegerTracer(config, options)
}

const tracingMiddleWare = (req, res, next) => {
  const wireCtx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
  // Creating our span with context from incoming request
  const span = tracer.startSpan(req.path, { childOf: wireCtx })
  // Use the log api to capture a log
  span.log({ event: 'request_received' })

  // Use the setTag api to capture standard span tags for http traces
  span.setTag(opentracing.Tags.HTTP_METHOD, req.method)
  span.setTag(opentracing.Tags.SPAN_KIND, opentracing.Tags.SPAN_KIND_RPC_SERVER)
  span.setTag(opentracing.Tags.HTTP_URL, req.path)

  // include trace ID in headers so that we can debug slow requests we see in
  // the browser by looking up the trace ID found in response headers
  const responseHeaders = {}
  tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, responseHeaders)
  res.set(responseHeaders)

  // add the span to the request object for any other handler to use the span
  Object.assign(req, { span })

  // finalize the span when the response is completed
  const finishSpan = () => {
    if (res.statusCode >= 500) {
      // Force the span to be collected for http errors
      span.setTag(opentracing.Tags.SAMPLING_PRIORITY, 1)
      // If error then set the span to error
      span.setTag(opentracing.Tags.ERROR, true)

      // Response should have meaning info to futher troubleshooting
      span.log({ event: 'error', message: res.statusMessage })
    }
    // Capture the status code
    span.setTag(opentracing.Tags.HTTP_STATUS_CODE, res.statusCode)
    span.log({ event: 'request_end' })
    span.finish()
  }
  res.on('finish', finishSpan)
  next()
}

const opentracing = require('opentracing')
const tracer = initTracer()
opentracing.initGlobalTracer(tracer)

app.use(tracingMiddleWare)

app.get('/', (req, res, next) => {
  const sourceIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  res.json(`source ip :: ${sourceIp}`)
})

app.listen(PORT, () => console.log(`server is running on ${PORT}`))

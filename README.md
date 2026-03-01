# page-clone

Clone any web page into a local, interactive sandbox with mocked API endpoints. Built for testing AI agents against real websites without touching the real backend.

## The Problem

You're building an AI agent that automates workflows on a website. You want to test it, but you don't want the agent accidentally deleting real data, submitting real orders, or corrupting your account. You need a safe clone of the site.

## How It Works

```
RECORD PHASE                              SERVE PHASE

1. Playwright loads the URL                4. Express serves clone on localhost:3000
   └─ records all network traffic (HAR)    5. GET / → SingleFile snapshot (full page)
2. SingleFile captures the rendered DOM    6. API calls → recorded responses from HAR
   └─ inlines CSS, images, fonts           7. Unrecorded endpoints → LLM generates
3. HAR analyzer identifies API endpoints       a plausible response (optional)
```

The clone looks and behaves like the real site. An injected script monkey-patches `fetch()` and `XMLHttpRequest` so that any API calls the page makes are redirected from the original server to your local mock server.

## Quick Start

```bash
# Install dependencies
npm install

# Install browser (first time only)
npx playwright install chromium

# Clone a page
npx tsx src/cli.ts https://example.com
```

Then open http://localhost:3000 in your browser.

## Usage

```
npx tsx src/cli.ts <url> [options]

Arguments:
  url                    URL of the page to clone

Options:
  -p, --port <number>    Port to serve on (default: 3000)
  --record-only          Only record, don't start the server
  --output <dir>         Custom output directory
  --wait <ms>            Extra wait time after page load in ms (default: 2000)
  -h, --help             Show help
```

### Examples

```bash
# Clone a page and serve it
npx tsx src/cli.ts https://reqres.in/

# Use a different port
npx tsx src/cli.ts https://news.ycombinator.com --port 8080

# Just record (save snapshot + HAR, don't start server)
npx tsx src/cli.ts https://example.com --record-only

# Enable LLM-powered dynamic mocks for unrecorded endpoints
OPENAI_API_KEY=sk-... npx tsx src/cli.ts https://example.com
```

## What Gets Captured

| Asset Type | How It's Captured |
|---|---|
| HTML, CSS, images, fonts | SingleFile inlines everything into one `.html` file |
| API responses (JSON, XML) | Recorded in HAR, served as mock Express routes |
| Unrecorded API endpoints | Returns generic mock or LLM-generated response |

## Architecture

```
src/
  cli.ts                     # Entry point, orchestrates record → serve
  types.ts                   # Shared TypeScript interfaces
  utils.ts                   # Output directory helpers
  recorder/
    index.ts                 # Recording pipeline orchestrator
    har-recorder.ts          # Playwright: loads page, records HAR
    snapshot-capturer.ts     # SingleFile: captures DOM snapshot
    har-analyzer.ts          # Parses HAR, extracts API endpoints
  server/
    index.ts                 # Express server setup
    static-routes.ts         # Serves snapshot HTML with origin-rewrite injection
    mock-routes.ts           # Registers recorded API endpoints as routes
    catch-all.ts             # Unrecorded endpoints → LLM fallback
    origin-rewriter.ts       # Generates fetch/XHR monkey-patch script
  llm/
    index.ts                 # OpenAI client wrapper
    mock-generator.ts        # Builds prompt, parses LLM response
recordings/                  # Output directory (auto-created, gitignored)
```

## How Mock Endpoints Work

### Static mocks (recorded)

During recording, Playwright captures all network traffic into a HAR file. The HAR analyzer identifies API endpoints by filtering for:
- Same-origin requests only
- JSON/XML content types, or paths matching `/api/`, `/graphql/`, `/v1/`, etc.
- XHR/fetch resource types

Each identified endpoint becomes an Express route that returns the exact recorded response.

You can inspect what was captured:
```bash
cat recordings/<your-recording>/api-endpoints.json
```

### Dynamic mocks (LLM-generated)

When the agent triggers an API call that wasn't recorded (e.g. a POST to create something), the catch-all route can use OpenAI to generate a plausible response. It passes the recorded endpoint schemas as context so the LLM matches the API's data patterns.

Set `OPENAI_API_KEY` to enable this. Without it, unrecorded endpoints return `{"message": "Mock response (no LLM configured)"}`.

## Testing the Clone

1. **Visual check** — open http://localhost:3000 and compare side-by-side with the real site

2. **Check mock endpoints** — look at the terminal output for the list of mocked routes, then:
   ```bash
   curl http://localhost:3000/api/some-endpoint
   ```
   Response should include the header `X-Page-Clone: static-mock`.

3. **Check catch-all** — hit an endpoint that wasn't recorded:
   ```bash
   curl http://localhost:3000/api/nonexistent
   ```
   Response should include `X-Page-Clone: llm-generated` (with API key) or `X-Page-Clone: no-llm`.

4. **Check origin rewriting** — open browser DevTools Network tab on the clone. API calls should go to `localhost:3000`, not the original domain.

## Known Limitations

- **JavaScript interactivity**: SingleFile captures the rendered DOM but complex JS event handlers (React hooks, Vue reactivity) may not survive serialization. Native HTML elements (forms, dropdowns, links) work fine.
- **Same-origin only**: Only mocks API calls to the same origin as the page. Cross-origin APIs (e.g. `api.example.com` when the page is on `www.example.com`) are not intercepted.
- **Public pages only**: No authentication support yet. The tool captures whatever a logged-out browser sees.
- **Stateless mocks**: POST/PUT/DELETE responses don't persist. If the agent creates something, it won't appear in subsequent GET requests.
- **Single page**: Captures one page state, not an entire site. Navigation links point to the original site.

## License

MIT

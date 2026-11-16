// A minimal W3C WebDriver client: just what the smoke test needs to press
// buttons in the real window and read what it shows. No dependencies.

const ELEMENT_KEY = "element-6066-11e4-a52e-4f735466cecf";
const POLL_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** XPath string literal for `text` (which may hold either kind of quote, not both). */
const literal = (text) => (text.includes("'") ? `"${text}"` : `'${text}'`);

/** One WebDriver session: the app, started by the driver and controlled through it. */
export class Session {
  constructor(driverUrl, id) {
    this.url = `${driverUrl}/session/${id}`;
  }

  /** Start `application` (a Tauri binary) under the driver listening at `driverUrl`. */
  static async start(driverUrl, application) {
    const capabilities = { alwaysMatch: { "tauri:options": { application } } };
    const { sessionId } = await request("POST", `${driverUrl}/session`, { capabilities });
    return new Session(driverUrl, sessionId);
  }

  /** End the session, which closes the app. */
  async end() {
    await request("DELETE", this.url);
  }

  /** The id of the first element matching `xpath`; null when there is none. */
  async find(xpath) {
    const found = await request("POST", `${this.url}/elements`, { using: "xpath", value: xpath });
    return found[0]?.[ELEMENT_KEY] ?? null;
  }

  /** Wait until an element matches `xpath`, and return its id. */
  async waitFor(xpath, timeoutMs = 20_000) {
    for (let waited = 0; waited < timeoutMs; waited += POLL_MS) {
      const element = await this.find(xpath);
      if (element !== null) return element;
      await sleep(POLL_MS);
    }
    throw new Error(`nothing on the page matches ${xpath}`);
  }

  /** Press the button whose text is exactly `label`. */
  async press(label) {
    const button = await this.waitFor(`//button[normalize-space()=${literal(label)}]`);
    await request("POST", `${this.url}/element/${button}/click`, {});
  }

  /** Wait until some element's own text contains `text`. */
  async waitForText(text) {
    await this.waitFor(`//*[text()[contains(., ${literal(text)})]]`);
  }
}

async function request(method, url, body) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const { value } = await response.json();
  if (!response.ok) throw new Error(`${method} ${url}: ${value?.message ?? response.status}`);
  return value;
}

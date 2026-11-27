<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# BYOK

BYOK is currently in beta and subject to improvements.

Bring your own provider and use it in Command Code CLI. Any OpenAI or Anthropic compactible API can serve models in Command Code. You can bring your key from hosted providers (DeepSeek, OpenRouter, Vercel AI Gateway), local servers (Ollama, vLLM), or other coding agent's APIs.

## BYOK providers

You can connect to any external provider in Command Code, requests go straight from your machine to that provider's endpoint with your key, never through Command Code's servers.

BYOK providers can be managed from `/connect` in the Command Code CLI. Below are providers and instructions on how to connect to them.

---

## Command Code

Command Code is the default and recommended provider. Every model in `/model` routes through your plan, and the models are optimized for the cmd harness. That optimization is real engineering: see [Harness Engineering](https://commandcode.ai/docs/harness-engineering) for how the harness repairs, steers, and optimizes models.

The `/model` menu can be used to access models from Command Code and BYOK providers. BYOK models are active alongside Command Code models, and you switch back to Command Code models anytime through the model menu.

---

## OpenAI ChatGPT/Codex

You can use your ChatGPT Pro/Plus subscription directly in Command Code. Select **OpenAI ChatGPT/Codex** in `/connect` (or run `cmd login openai`, `chatgpt` works too) and sign in.

The provider package installs on demand at first login, and its models appear as their own section in `/model`. Requests run locally from the CLI over your subscription.

---

## GitHub Copilot

Same flow for an active GitHub Copilot subscription: select **GitHub Copilot** in `/connect` (or `cmd login copilot`), complete the device sign-in, and the copilot provider's models will be listed in `/model`.

---

## Adding a custom provider

The `/connect` menu supports **150+ providers** out of the box. For those, the endpoint, wire, and current model list come prefilled. Anything else works too: any OpenAI-compatible or Anthropic-wire endpoint can also be setup.

Run `/connect` and pick **(BYOK) Add your own provider**.

### From the supported providers list (the happy path)

The connect menu supports 150+ providers with endpoint, models, and config prefilled. You can search and pick a provider from this menu.

**Pick the provider**
Start typing at the id step (`openrouter`, `deepseek`, `groq`, …) and a browsable list of known providers shows under the input. Pick one with `↑/↓` + enter; the wire and endpoint prefill.

**Paste your key**
Keys are stored securely in `~/.commandcode/auth.json`. Press enter on the empty field if the endpoint takes no key (local servers).

**Models arrive on their own**
Discovery is silent: the provider's current model list, names and context windows included, is imported for you. Finishing lands you in `/model` with the new models selectable and routing.

### Not in the list (fully custom)

If your provider is not in the menu, or you want to declare a custom/local one, follow these steps:

**Name it**
Type any id, a short lowercase handle (`work-llm`). It names the entry in `~/.commandcode/providers.json` and prefixes its models (`work-llm/gpt-x`).

**Pick the wire**
**OpenAI-compatible** (`/chat/completions`, the default: Ollama, vLLM, LM Studio, most hosted APIs), **OpenAI Responses** (`/responses`, for endpoints speaking the OpenAI Responses API), or **Anthropic** (`/v1/messages`, for endpoints speaking the Claude Messages API).

**Point at the endpoint**
The API root. OpenAI-compatible servers usually end in `/v1`; Anthropic roots get `/v1` added on the wire when missing. A pasted URL carrying a route suffix (`…/v1/chat/completions`) is trimmed to the root automatically, with a note showing what was removed.

**Add the key, or skip it**
Key is securely stored in `auth.json`. Press enter on the empty field if the endpoint takes no key (local servers).

**Declare the models**
The menu asks the endpoint's own `/models` listing first. If that comes up empty, you can either type ids there or modify the providers.json file to add the models. See the config schema below for details.

Press `h` on any non-typing step for the condensed version of all of this; `esc` (or `←` where it can't mean cursor movement) goes back one step.

You can also just ask the agent: `add OpenRouter as a provider and enable deepseek/deepseek-v4-flash`. It reads its bundled BYOK reference, looks up current model ids and context windows when it needs them, and writes the `providers.json` entry for you. Review it like any other edit.

---

## Provider config schema

Everything related to byok providers lives in `~/.commandcode/providers.json`. It is yours to edit, and changes apply live (reopen `/connect` or `/model`). For example:

```json
// ~/.commandcode/providers.json
{
  "provider": {
    "acme": {
      "name": "Acme AI",
      "baseURL": "https://api.acme.example/v1",
      "apiKey": "$ACME_API_KEY",
      "models": {
        "qwen/qwen3.6-27b": {
          "name": "Qwen 3.6 27B",
          "contextWindow": 131072,
          "maxOutput": 16384,
          "reasoningEfforts": ["low", "high"],
          "cost": { "input": 0.4, "output": 1.6 },
          "options": { "temperature": 0.6 }
        }
      }
    },
    "claude-proxy": {
      "api": "anthropic-messages",
      "baseURL": "https://api.acme.example/anthropic",
      "apiKey": "$ACME_API_KEY",
      "models": { "minimax/minimax-m2.7": {} }
    },
    "ollama": {
      "baseURL": "http://localhost:11434/v1",
      "apiKey": false,
      "models": { "llama3.3:70b": {} }
    }
  }
}
```

### Provider fields

| Field | Values | Notes |
| --- | --- | --- |
| `name` | string | Display name in `/connect` and `/model`; defaults to the id |
| `api` | `openai-completions` (default) \| `openai-responses` \| `anthropic-messages` | Omit for OpenAI-compatible endpoints. `openai-responses` posts to `{baseURL}/responses`. Any other value skips the provider |
| `npm` | AI-SDK package name | Compat only: `@ai-sdk/openai-compatible` & `@ai-sdk/openai` map to `openai-completions`, `@ai-sdk/anthropic` to `anthropic-messages`; any other package warns and assumes `openai-completions`. Ignored when `api` is set. |
| `baseURL` | URL | Required. The API root requests go to. Missing or invalid URL skips the provider. Also read from `options.baseURL` (top-level wins) |
| `apiKey` | `"$ENV_VAR"` \| `"{env:VAR}"` \| `"!command"` \| `false` | A key saved via `/connect` wins over this field. It is reference to the key, never the key itself. `"$VAR"` and `"{env:VAR}"` read that env variable; `"!command"` runs the command and uses its output; `false` = keyless endpoint, no auth header sent. A pasted raw secret is refused with a warning. |
| `headers` | object | Extra request headers, string values only. One non-string value drops the whole object with a warning. Every request identifies itself with a `User-Agent` starting `command-code/<version>` unless you declare your own `User-Agent` here |
| `zdr` | `true` | You vouch that this endpoint keeps no data (a local model, or your own gateway enforcing ZDR). Only then do its models run under `CMD_ZDR=1`; without it they are refused there. Any non-boolean value warns and is ignored |
| `models` | object | Required. `{}` per id is enough. Zero valid models skips the provider |
| `disabled` | `true` | Tombstone: the entry is skipped silently, no warning. `"enabled": false` means the same |

### Model fields

Every field is optional but we recommend adding `contextWindow` as a bare minimum. `"a-model-id": {}` is a complete declaration:

| Field | Values | Notes |
| --- | --- | --- |
| `name` | string | Display name in `/model` |
| `contextWindow` | number > 0 | Tokens. Compat alias: `limit.context` (`contextWindow` wins when both are set)  Default: 200K|
| `maxOutput` | number > 0 | Tokens. Compat alias: `limit.output` |
| `reasoning` | boolean | `true` assumes the efforts `low` / `medium` / `high`; `false` declares none |
| `reasoningEfforts` | string[] | Exact valid set: `low` \| `medium` \| `high` \| `xhigh` \| `max`. Unknown levels are dropped with a warning |
| `cost` | object | $ per 1M tokens: `input`, `output`, `cacheRead`, `cacheWrite` (snake_case `cache_read` / `cache_write` accepted); `0` is valid for free models |
| `options` | object | Extra request-body params merged into every call for this model (`temperature`, `top_p`, …) |
| `api` | `openai-completions` \| `openai-responses` \| `anthropic-messages` | Per-model wire override. Defaults to the provider's `api`. One entry can serve some models over Chat Completions, some over the Responses API, and some over the Anthropic wire. An invalid value skips this model only |
| `baseURL` | URL | Per-model endpoint override. Defaults to the provider's `baseURL`. An invalid URL skips this model only |

A non-object model value skips that model with a warning; sibling models survive.

Reasoning efforts are auto-detected for known providers. If not added automatically, the onus to add them manually is on the user. Declare the supported efforts in the model's `reasoningEfforts` field inside the `~/.commandcode/providers.json` file.

---

## Example provider config

Below are examples of BYOK providers added in `~/.commandcode/providers.json`. Command Code is the default provider, nothing to declare for it.

**OpenRouter**

```json
// ~/.commandcode/providers.json
{
  "provider": {
    "openrouter": {
      "name": "OpenRouter",
      "baseURL": "https://openrouter.ai/api/v1",
      "apiKey": "$OPENROUTER_API_KEY",
      "models": { "deepseek/deepseek-v4-flash": {} }
    }
  }
}
```

**Mixed wires on one gateway**: a gateway whose default is OpenAI-compatible can still serve individual models over the Responses API or the Anthropic wire. Declare the exception on the model.

```json
// ~/.commandcode/providers.json
{
  "provider": {
    "my-gateway": {
      "name": "My Gateway",
      "baseURL": "https://gateway.example.com/v1",
      "apiKey": "$MY_GATEWAY_API_KEY",
      "models": {
        "vendor/chat-model": {},
        "vendor/responses-model": { "api": "openai-responses" },
        "vendor/messages-model": { "api": "anthropic-messages" }
      }
    }
  }
}
```

**Vercel AI Gateway**

```json
// ~/.commandcode/providers.json
{
  "provider": {
    "vercel": {
      "name": "Vercel AI Gateway",
      "baseURL": "https://ai-gateway.vercel.sh/v1",
      "apiKey": "$AI_GATEWAY_API_KEY",
      "models": { "deepseek/deepseek-v4-flash": {} }
    }
  }
}
```

**Cloudflare AI Gateway**: its OpenAI-compatible root carries your account and gateway ids, and model ids are `provider/model` as the gateway spells them:

```json
// ~/.commandcode/providers.json
{
  "provider": {
    "cf-gateway": {
      "name": "Cloudflare AI Gateway",
      "baseURL": "https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/compat",
      "apiKey": "$CF_AI_GATEWAY_TOKEN",
      "models": { "anthropic/claude-sonnet-4-6": {} }
    }
  }
}
```

**Hugging Face router**

```json
// ~/.commandcode/providers.json
{
  "provider": {
    "huggingface": {
      "name": "Hugging Face",
      "baseURL": "https://router.huggingface.co/v1",
      "apiKey": "$HF_TOKEN",
      "models": { "Qwen/Qwen3.6-27B-Instruct": {} }
    }
  }
}
```

**Ollama (local, keyless)**

```json
// ~/.commandcode/providers.json
{
  "provider": {
    "ollama": {
      "baseURL": "http://localhost:11434/v1",
      "apiKey": false,
      "models": { "llama3.3:70b": {} }
    }
  }
}
```

---

## Managing a provider

Selecting a custom provider in `/connect` opens its card: the endpoint, its declared model count (with a clickable `config: providers.json` link straight to the file), the key situation, and the actions that fit.

| Key state | Card shows | Actions |
| --- | --- | --- |
| Stored key | `key sk_… ✓ stored in auth.json` | enter save · `r` replace key · `c` clear · `u` update models · `d` delete |
| File reference | `key $VAR` | `r` store key · `u` update models · `d` delete |
| Keyless | `no key — the endpoint asks for none` | `r` store key · `u` update models · `d` delete |
| No key yet | `no key yet — requests fail until one is added` | enter add key · `u` update models · `d` delete |

In the `/connect` menu itself, a healthy provider row shows a green ✓ with its model count. Only `○ needs a key` appears when requests would fail without action.

Update `u` refetches the provider's model list (registry first, the endpoint's `/models` as fallback) and updates the provider's models. The key reference, headers, and wire are untouched.

Delete `d` removes the provider. It is deleted from providers.json, its stored key is cleared, and its models leave `/model` immediately; if it owned your active model, the session switches to the default model.

---

## Invalid config

If there is a malformed entry in providers config, it never breaks its siblings. It's skipped with a specific warning shown under the `/connect` list and on `--list-models`:

```
providers.json needs attention — one entry did not load as written:
provider.work-llm: no baseURL configured — provider skipped
```

An unreadable or unparseable file warns the same way (`providers config <path>: invalid JSON (details redacted)`). Your providers vanish for that run instead of crashing the CLI. The `/connect` writers never touch a file they can't parse: an add, model refetch, or remove against broken JSON refuses with nothing written.

---

## Local-only mode

For setups that must never contact Command Code's backend at all (a team running the CLI against their own endpoints, CI fleets, or other environments), they can turn on local-only mode:

```bash
cmd --local-only
# or via the environment:
CMD_LOCAL_ONLY=1 cmd
```

or persist it in `~/.commandcode/config.json`:

```json
{ "localOnly": true }
```

What it guarantees:

- **No telemetry, anywhere.** Trace exporters, lifecycle events, telemetry identity, and machine fingerprinting are all off. (`DO_NOT_TRACK=1` also stops all of these, including fingerprinting; local-only also blocks the non-telemetry backend traffic below.)
- **No billing reads.** The plan/credits prefetches never run; model pickers treat the absent plan as unrestricted and your providers gate access themselves.
- **A refusal transport.** The session's backend transport is replaced with one that throws a clear `LocalOnlyError` naming the route and the switch. Nothing can reach Command Code including a model id that would otherwise fall through to the Command Code provider.

What stops working, by design: Command Code catalog (gateway) models, `/share`, `/usage`, the server-proxied `web_search`/`web_fetch` tools, `cmd taste push`/`pull`, and backend agent generation. Your BYOK providers, and everything local keep working exactly as before.

---

## FAQs

                    Your BYOK session model, for everything. Compaction and summarization, sub-agents, title generation: all the side tasks default to the session model while a BYOK model is active, so nothing silently falls back to Command Code (or bills your plan) mid-session.
                </p>
            )
        },
        {
            id: 'faq-keys-storage',
            question: 'Where are my API keys stored?',
            answer: (
                <p>
                    Keys pasted in <code>/connect</code> live in <code>~/.commandcode/auth.json</code> (written <code>0600</code>), each under its provider's id, beside your Command Code login and subscription tokens. Logging out of Command Code strips only the account fields. Provider keys survive. Update a key any time with <code>r</code> on the provider's card in the /connect menu.
                </p>
            )
        },
        {
            id: 'faq-keys-providers-json',
            question: 'Can I put a key directly in providers.json?',
            answer: (
                <p>
                    Only as a reference: <code>"$ENV_VAR"</code>, <code>"&#123;env:VAR&#125;"</code>, or <code>"!command"</code> (see the schema above). A raw secret pasted into the file is refused at parse with a warning; the provider survives, only the key is ignored. Per request, a stored key wins over the file's reference.
                </p>
            )
        },
        {
            id: 'faq-customize',
            question: 'How do I customize a provider or its models?',
            answer: (
                <p>
                    Edit <code>~/.commandcode/providers.json</code>. The full schema is documented above, and changes apply live (reopen <code>/connect</code> or <code>/model</code>). Per model you can set the display name, context window, max output, reasoning efforts, cost, and extra request-body <code>options</code> like temperature. Per provider: headers, the wire (<code>api</code>), and the endpoint.
                </p>
            )
        },
        {
            id: 'faq-reasoning-effort',
            question: 'How do I add reasoning effort support for a custom provider?',
            answer: (
                <p>
                    For a custom provider, you need to declare the supported efforts in the model's <code>reasoningEfforts</code> field in <code>~/.commandcode/providers.json</code>. They are automatically added for known providers, but if not available, they need to be added manually.
                </p>
            )
        },
        {
            id: 'faq-same-id',
            question: 'What if a model id exists on Command Code and my provider?',
            answer: (
                <p>
                    Both stay selectable. <code>/model</code> shows each under its own heading, and picking a row routes exactly where its heading says. Two of your own providers sharing an id works the same way: each qualified model id owns its route.
                </p>
            )
        },
        {
            id: 'faq-project-scope',
            question: 'Can a project or repo define its own providers?',
            answer: (
                <p>
                    No. BYOK providers are set only on the user-level, with config stored globally at <code>~/.commandcode/providers.json</code>.
                </p>
            )
        },
        {
            id: 'faq-privacy',
            question: 'Do BYOK requests or my keys ever touch Command Code?',
            answer: (
                <p>
                    No. Requests go straight from your machine to your endpoint, and keys never leave it. The only thing emitted is a trimmed telemetry span: model id, provider id, usage, latency, and finish reason. Never prompts, keys, endpoint URLs, or errors after scrubbing. <code>DO_NOT_TRACK=1</code> or local-only mode turns even that off.
                </p>
            )
        }
    ]}
/>

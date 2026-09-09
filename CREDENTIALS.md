# SalesSuite API Key Setup

To use the **SalesSuite Node in n8n**, you need a **SalesSuite API Key**.

## 🔑 Create an API Key

1. Log in to SalesSuite.
2. Go to **Settings → Integrations**.
3. Open **API Keys**.
4. Copy an existing API Key or create a new one.

## ⚙️ Use in n8n

1. Open n8n and go to **Credentials → New → SalesSuite API**.
2. Enter the following:
   - **API Key**: your generated secret key
   - **Base URL**: Default: `https://api.salessuite.com/api`
   - **Response Language**: `Deutsch (DE)` (default) or `English (EN)`
3. Click **Test** → if everything is correct, you’ll get a confirmation.

## 🌐 Response Language

Some endpoints return translated text in the response data. The selected language is sent as the
`x-lang` header with every request made through this credential.

It applies to the node's own interface as well: the field labels and group headings in the field
mappers, and the property dropdowns of the node, trigger and webhook, are shown in the selected
language. Custom (`x_*`) fields always keep the name you gave them in SalesSuite. Switching the
language takes effect the next time a dropdown or mapper is opened.

The API resolves the language in this order:

1. `lang` query parameter
2. request language headers (`x-lang`, then `accept-language`)
3. tenant default locale (Settings → General)
4. global fallback `en`

Valid languages are `de` and `en`. To use different languages in one workflow, create one
credential per language and select it on the respective nodes.

Credentials that were saved before this option existed carry no language value and keep using the
tenant default locale. Open and save such a credential once to apply the selection.

## 📌 Notes

- API Keys have broad access — keep them safe and private.

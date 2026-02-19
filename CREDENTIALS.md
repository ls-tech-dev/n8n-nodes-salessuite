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
   - **Base URL**: Default: `https://api.salessuite.com/api/v1`
3. Click **Test** → if everything is correct, you’ll get a confirmation.

## 📌 Notes

- API Keys have broad access — keep them safe and private.

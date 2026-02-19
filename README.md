# n8n-nodes-salessuite

![n8n Community Node](https://img.shields.io/badge/n8n-community--node-FF6D5A)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)


### n8n Integration for **SalesSuite – the best CRM built on the Setter-Closer principle**

Automate your contact, deal, and activity workflows, react to real-time events, and keep your pipeline moving — **without manual work**.


## 🧭 Overview

This community node connects **SalesSuite (Setter-Closer CRM)** seamlessly with your n8n workflows.
From contact creation to deal management and real-time triggers — automate every key revenue process end-to-end.

## ⚙️ Key Capabilities

### 👤 Contacts

| Action                    | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| **Create Contact**        | Add a new contact (standard create, no upsert logic).                |
| **Find Contact by Email** | Retrieve contacts using their email address.                         |
| **Get Contact by ID**     | Fetch a specific contact using its unique ID.                        |
| **List Contacts**         | Browse contacts with pagination support.                             |
| **Search Contacts**       | Perform text-based search across contacts.                           |
| **Update Contact**        | Modify contact details by ID.                                        |
| **Upsert Contact**        | Search by email and update if found, otherwise create a new contact. |

---

### 💼 Deals

| Action                  | Description                                                                 |
| ----------------------- | --------------------------------------------------------------------------- |
| **Create Deal**         | Add a new deal to a selected pipeline and phase.                            |
| **Find Deal by ID**     | Retrieve a deal using its ID.                                               |
| **Find Deals by Email** | Get all deals connected to a contact’s email.                               |
| **List Deals**          | View deals with pagination (optional filtering by pipeline).                |
| **List Pipelines**      | Retrieve available pipelines along with their phases.                       |
| **Update Deal**         | Update deal properties and optionally move it to another phase or pipeline. |

---

### 📝 Activities

| Action                    | Description                                    |
| ------------------------- | ---------------------------------------------- |
| **Create Note**           | Add an internal note to a contact record.      |
| **List Email Activities** | Retrieve email-related activity for a contact. |
| **List Call Activities**  | Retrieve call activity linked to a contact.    |

---

### 🔔 Webhooks

| Action             | Description                            |
| ------------------ | -------------------------------------- |
| **List Webhooks**  | View all active webhook subscriptions. |
| **Create Webhook** | Register a new webhook subscription.   |
| **Update Webhook** | Modify an existing webhook.            |
| **Delete Webhook** | Remove a webhook subscription.         |

---

### ⚡ Real-Time Triggers

| Event                        | Description                                 |
| ---------------------------- | ------------------------------------------- |
| **Contact Created**          | Fires when a new contact is added.          |
| **Contact Property Changed** | Fires when a contact field changes.         |
| **Deal Created**             | Fires when a new deal is created.           |
| **Deal Property Changed**    | Fires when a deal field changes.            |
| **Deal Stage Changed**       | Fires when a deal moves to another phase.   |
| **Form Submitted**           | Fires on form submission.                   |
| **Call Activity Created**    | Fires when a new call activity is recorded. |

---

## 🔐 Authentication

The node uses **API Key authentication**.

* Base endpoint: `https://api.salessuite.com/api/v1`
* Required header:

  ```
  x-api-key: <YOUR_API_KEY>
  ```

A built-in credential test within n8n ensures your API key is valid before running workflows.

---

## 📦 Installation

### Requirements

* n8n version **2.0.0 or higher**
* Active SalesSuite account with a valid API key

### Community Node Installation

1. Open n8n → **Settings → Community Nodes → Install**
2. Enter package name:

```bash
# Option A — Scoped (recommended)
@rjsebening/n8n-nodes-salessuite

# Option B — Unscoped
n8n-nodes-salessuite
```

3. **Restart n8n** – the node will now appear in the list.



## 📬 About the Author

I’m **[Rezk Jörg Sebening](https://github.com/rjsebening)** – Automation & Systems Expert (DACH).
I build n8n nodes and process automation systems that help agencies, coaches, and service providers scale **without manual work**.

👉 Follow me on GitHub for new DACH integrations and automation templates.

## ⚖️ Legal Disclaimer

This community node is **not affiliated with SalesSuite** (no partnership, no sponsorship, no official endorsement).
It simply connects to publicly available API endpoints.

* Community developed & maintained
* For API-related issues → contact **SalesSuite Support**
* All trademarks & logos belong to their respective owners

## 📄 License

**MIT License**
Contributions and pull requests are welcome!
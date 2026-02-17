# n8n-nodes-salessuite

![n8n Community Node](https://img.shields.io/badge/n8n-community--node-FF6D5A)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

### Official n8n Integration for **SalesSuite**

Automate contacts, deals, activities, and webhooks — powered by the SalesSuite Public API.

## 🧭 Overview

This community node connects **SalesSuite** with your n8n workflows.
Create or update contacts and deals, list call/email activities, and subscribe to real-time events via webhooks.

## ⚙️ Core Features

### 👤 Contacts

| Action                    | Description                                       |
| ------------------------- | ------------------------------------------------- |
| **Create Contact**        | Create a new contact (no upsert).                 |
| **Find Contact by Email** | Find contacts by email.                           |
| **Get Contact by ID**     | Retrieve a contact by its ID.                     |
| **List Contacts**         | List contacts with pagination.                    |
| **Search Contacts**       | Search contacts by text.                          |
| **Update Contact**        | Update a contact by its ID.                       |
| **Upsert Contact**        | Find by email, update if found, otherwise create. |

### 💼 Deals

| Action                  | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| **Create Deal**         | Create a new deal in a pipeline and phase.                 |
| **Find Deal by ID**     | Retrieve a deal by its ID.                                 |
| **Find Deals by Email** | Retrieve all deals linked to a contact’s email.            |
| **List Deals**          | List deals with pagination (optional pipeline filter).     |
| **List Pipelines**      | List all pipelines and their phases.                       |
| **Update Deal**         | Update a deal’s fields and optionally move phase/pipeline. |

### 📝 Activities

| Action                    | Description                              |
| ------------------------- | ---------------------------------------- |
| **Create Note**           | Add an internal note to a contact.       |
| **List Email Activities** | Retrieve email activities for a contact. |
| **List Call Activities**  | Retrieve call activities for a contact.  |

### 🔔 Webhooks

| Action             | Description                    |
| ------------------ | ------------------------------ |
| **List Webhooks**  | List webhook subscriptions.    |
| **Create Webhook** | Create a webhook subscription. |
| **Update Webhook** | Update a webhook subscription. |
| **Delete Webhook** | Delete a webhook subscription. |

### ⚡ Trigger Events (Real-Time Webhooks)

| Event                        | Description                                |
| ---------------------------- | ------------------------------------------ |
| **Contact Created**          | Triggered when a new contact is created.   |
| **Contact Property Changed** | Triggered when a contact property changes. |
| **Deal Created**             | Triggered when a new deal is created.      |
| **Deal Property Changed**    | Triggered when a deal property changes.    |
| **Deal Stage Changed**       | Triggered when a deal phase changes.       |
| **Form Submitted**           | Triggered when a form is submitted.        |
| **Call Activity Created**    | Triggered when a call activity is created. |

## 🔐 Authentication

Uses **API Key Authentication**

- Base URL: `https://api.salessuite.com/api/v1`
- Header: `x-api-key: <YOUR_API_KEY>`

A built-in credential test verifies the connection directly within n8n.

## 📦 Installation

### Requirements

- n8n **≥ 1.107.1**
- Active SalesSuite account with **API Key**

### Community Node Installation

1. Open n8n → **Settings → Community Nodes → Install**
2. Enter package name:

```bash
n8n-nodes-salessuite
```

3. **Restart n8n** – the node will now appear in the list.

## 📄 License

**MIT License**

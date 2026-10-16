# DOCUMENT 5: BACKEND SCHEMA

## 5.1 Entity List
- `vendors`
- `items`
- `transactions`

## 5.2 Table: `vendors`
One row per shopkeeper (WhatsApp number).
| Column | Type | Rules |
|---|---|---|
| `phone` | `varchar(32)` | Primary key; WhatsApp number from Twilio (e.g. `whatsapp:+91...`) |
| `name` | `varchar(100)` | Nullable; shop or owner name |
| `default_threshold` | `float` | Default 5; alert level for new items |
| `language` | `varchar(10)` | Default `en`; `en`, `hi`, `mr` |
| `created_at` | `timestamp` | IST |

## 5.3 Table: `items`
Current stock per vendor and product.
| Column | Type | Rules |
|---|---|---|
| `id` | `integer` | Primary key, auto increment |
| `vendor` | `varchar(32)` | Foreign key to `vendors.phone` |
| `name` | `varchar(100)` | Lower-case singular name; unique together with vendor |
| `unit` | `varchar(10)` | `kg`, `g`, `l`, `ml`, `pcs`, `packet`, `dozen`, `box`; first stored unit always wins |
| `qty` | `float` | Current quantity; may go negative and is then flagged |
| `threshold` | `float` | Alert level; default 5 |
| `price` | `float` | Nullable; last selling price per unit |
| `reordered` | `boolean` | Default `false`; set from Alerts screen |
| `updated_at` | `timestamp` | IST; updated on every change |

## 5.4 Table: `transactions`
Every stock change, one row per item per message.
| Column | Type | Rules |
|---|---|---|
| `id` | `integer` | Primary key, auto increment |
| `batch_id` | `varchar(36)` | UUID shared by all rows created from one message (used by undo) |
| `vendor` | `varchar(32)` | Foreign key to `vendors.phone` |
| `item_name` | `varchar(100)` | Item name at the time of change |
| `unit` | `varchar(10)` | Unit at the time of change |
| `change` | `float` | Positive for stock in, negative for sold; never zero |
| `price` | `float` | Nullable; per-unit price used for revenue |
| `raw_text` | `text` | Original or transcribed message |
| `created_at` | `timestamp` | IST |
| `undone` | `boolean` | Default `false`; undone rows kept for audit trail |

## 5.5 Relationships
- One vendor has many items.
- One vendor has many transactions.
- Each message creates one batch containing one or more transactions, and each transaction updates exactly one item.
- Undo marks every transaction of the latest batch as undone and reverses its quantity on the matching item.

## 5.6 Access and Roles
MVP: every query is filtered by vendor, and phone numbers are masked in all API responses (`whatsapp:+91 98*** **321`). No roles yet.
Phase 2: dashboard accounts linked to vendor, admin role for support. Secrets in env variables only.

## 5.7 API Endpoints
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/webhook` | Twilio WhatsApp webhook (form fields `From`, `Body`, `NumMedia`, `MediaUrl0`, `MediaContentType0`); returns TwiML |
| `GET` | `/api/summary` | Total items, low-stock count, sales today, revenue today, top sellers |
| `GET` | `/api/inventory` | All items with low flag; vendor phone masked |
| `PATCH` | `/api/inventory/{item}` | Update alert level, price or reordered flag |
| `GET` | `/api/transactions` | Latest first; filters: limit, date range, type, search |
| `GET` | `/api/alerts` | Low-stock and negative-stock items |
| `GET` | `/api/reports` | Revenue and units by range (`today`, `7d`, `30d`) |
| `GET` | `/api/export.csv` | Full transaction log as CSV |
| `GET` | `/api/stream` | Server-Sent Events; emits message when data changes, keep-alive every 15s |
| `GET` / `PUT` | `/api/settings` | Read and update vendor settings |

## 5.8 Chat Commands
| Message | Result |
|---|---|
| `Added 10kg rice, 5L oil` | Stock increased; confirmation reply |
| `sold 2 bread @20` | Stock reduced; revenue recorded; low-stock warning if applicable |
| `stock` / `low` | Full stock list / only items at or below alert level |
| `report` | Today's units sold and revenue per item |
| `undo` | Reverses the last message |
| `alert rice 3` | Sets alert level for rice |
| `help` | Shows examples |

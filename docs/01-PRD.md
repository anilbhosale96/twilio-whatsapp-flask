# DOCUMENT 1: PRODUCT REQUIREMENTS DOCUMENT (PRD)

## 1.1 App Name and One-Line Pitch
**Smart Stack AI**: a website that helps small shopkeepers manage inventory. Stock is updated by sending a text or voice note on WhatsApp or SMS, and the website shows live stock levels, sales and low-stock alerts.

## 1.2 Problem Statement
Small shopkeepers and micro-retailers find POS and ERP software too complex. Menus, barcodes and catalogues demand training and digital literacy they do not have, so stock is tracked in notebooks or memory. This causes stock-outs, over-ordering, untracked losses and no visibility into daily sales.

India has an estimated 12 to 13 million kirana stores, which industry sources say account for roughly 90 percent of grocery sales, yet many have no digital presence and face pressure from quick-commerce platforms. The barrier is the interface, not the need: shopkeepers already use WhatsApp every day.

## 1.3 Target Audience
- **Primary**: kirana and grocery shop owners aged 25 to 60 in towns and city neighbourhoods across India; phone-first; daily WhatsApp users; low digital literacy; very limited software budget (assumption: up to Rs. 300 per month).
- **Secondary**: shop staff, vegetable, fruit and dairy vendors, medical and stationery stores, home-based and street vendors.
- **Demo audience**: hackathon judges who send a live message and watch the dashboard update.
- **Languages**: English, Hindi, Marathi and Hinglish, typed or spoken.

## 1.4 Core Features (MVP)
1. **Text message parsing**: free-form messages such as "Added 10kg rice, 5L oil" or "sold 2 bread" become structured stock updates.
2. **Voice note support**: voice notes are transcribed and processed exactly like text.
3. **Live web dashboard**: stock levels, summary cards and activity update in real time without page refresh.
4. **Transaction log with undo**: every stock change is stored with the original message; "undo" reverses the last message.
5. **Low-stock alerts**: warning in the chat reply and highlighted on the dashboard; custom alert level per item.
6. **Price and revenue tracking with a daily report**: "sold 2 bread @20" records revenue; "report" returns today's sales.
7. **CSV export of the full transaction log**.

## 1.5 Future Features (Phase 2)
- Supplier bill photo: extract items and quantities from a photo of an invoice.
- Auto-reorder message drafted for the saved supplier.
- Expiry date tracking with alerts.
- Udhaar (customer credit) ledger.
- Weekly demand insights and reorder suggestions.
- UPI payment link or QR from the chat.
- SMS fallback channel.
- Dashboard login and multi-staff accounts.

## 1.6 Non-Goals
Smart Stack AI will not be a billing or POS system (no invoices, GST filing or barcode scanning), will not be full accounting software, will not provide online ordering or e-commerce, will not process payments in the MVP, will not manage multi-store chains, will not integrate with hardware such as scanners or printers, and will not support languages beyond English, Hindi, Marathi and Hinglish in the MVP.

## 1.7 Success Metrics
- Parsing accuracy above 90 percent on a test set of at least 50 realistic messages.
- Text reply within 2 seconds; voice reply within 8 seconds; dashboard update within 2 seconds.
- Demo target: 10 consecutive live messages (text and voice) processed without failure.
- Post-launch (assumption): messages per shop per day, 7-day retention, and share of messages needing undo.

## 1.8 Monetization Plan
Freemium: basic stock tracking is free; a paid tier adds reports, multiple staff numbers, supplier ordering and analytics. Later options: supplier and distributor partnerships for reorder requests, and aggregated, anonymised demand insights with user consent.

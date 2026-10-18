import os
import io
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Optional
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)

def quantize_money(val: Any) -> Decimal:
    """Decimal-safe monetary conversion rounded to 2 decimal places."""
    if val is None or val == "":
        return Decimal("0.00")
    try:
        return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except Exception:
        return Decimal("0.00")

def calculate_bill_totals(
    items: List[Dict[str, Any]],
    discount_val: float = 0.0,
    tax_rate_val: float = 0.0,
    delivery_charge_val: float = 0.0,
    is_interstate: bool = False
) -> Dict[str, Any]:
    """
    Performs server-side decimal-safe monetary arithmetic for bill calculations.
    Computes Subtotal, Discounts, CGST/SGST/IGST breakdown, and Final Grand Total.
    """
    subtotal = Decimal("0.00")
    processed_items = []

    for idx, it in enumerate(items, 1):
        qty = Decimal(str(it.get("qty", 1.0)))
        unit_price = quantize_money(it.get("unit_price") or it.get("price") or 0.0)
        line_total = (qty * unit_price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        subtotal += line_total

        processed_items.append({
            "sno": idx,
            "product_name": it.get("product_name") or it.get("name") or "Item",
            "unit": it.get("unit") or "pcs",
            "qty": float(qty),
            "unit_price": float(unit_price),
            "line_total": float(line_total)
        })

    discount = quantize_money(discount_val)
    if discount > subtotal:
        discount = subtotal

    taxable_amount = subtotal - discount

    tax_rate = Decimal(str(tax_rate_val or 0.0))
    total_tax = Decimal("0.00")
    cgst = Decimal("0.00")
    sgst = Decimal("0.00")
    igst = Decimal("0.00")

    if tax_rate > Decimal("0.00"):
        total_tax = (taxable_amount * (tax_rate / Decimal("100.00"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if is_interstate:
            igst = total_tax
        else:
            cgst = (total_tax / Decimal("2.00")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            sgst = total_tax - cgst

    delivery_charge = quantize_money(delivery_charge_val)
    final_total = (taxable_amount + total_tax + delivery_charge).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "items": processed_items,
        "subtotal": float(subtotal),
        "discount": float(discount),
        "taxable_amount": float(taxable_amount),
        "tax_rate": float(tax_rate),
        "total_tax": float(total_tax),
        "cgst": float(cgst),
        "sgst": float(sgst),
        "igst": float(igst),
        "delivery_charge": float(delivery_charge),
        "final_total": float(final_total)
    }


def generate_invoice_pdf(
    bill_number: str,
    bill_type: str,  # "quotation" or "invoice"
    issue_date: datetime,
    order_id: str,
    vendor_data: Dict[str, Any],
    customer_data: Dict[str, Any],
    totals_data: Dict[str, Any],
    payment_status: str = "unpaid",
    version: int = 1
) -> bytes:
    """
    Generates a print-ready PDF document for quotation or tax invoice.
    Uses ReportLab with high-fidelity styling, GST compliance, and audit info.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_color = colors.HexColor("#0f172a")
    primary_color = colors.HexColor("#2563eb")
    slate_600 = colors.HexColor("#475569")
    border_color = colors.HexColor("#cbd5e1")
    header_bg = colors.HexColor("#f1f5f9")

    shop_title_style = ParagraphStyle(
        "ShopTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=primary_color,
        fontName="Helvetica-Bold",
        spaceAfter=4
    )

    doc_type_style = ParagraphStyle(
        "DocType",
        parent=styles["Heading2"],
        fontSize=15,
        leading=18,
        textColor=title_color,
        fontName="Helvetica-Bold",
        alignment=2  # Right-aligned
    )

    meta_right_style = ParagraphStyle(
        "MetaRight",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=slate_600,
        alignment=2
    )

    body_bold = ParagraphStyle(
        "BodyBold",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        fontName="Helvetica-Bold",
        textColor=title_color
    )

    body_normal = ParagraphStyle(
        "BodyNormal",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=slate_600
    )

    elements = []

    # 1. Header Grid: Vendor details on Left, Document info on Right
    doc_label = "TAX INVOICE" if bill_type == "invoice" else "PRICE QUOTATION / ESTIMATE"
    status_label = payment_status.upper()
    if bill_type == "quotation":
        status_label = "DRAFT QUOTATION"

    vendor_name = vendor_data.get("shop_name") or vendor_data.get("name") or "Retail Store"
    vendor_address = vendor_data.get("address") or "Pune, Maharashtra, India"
    vendor_phone = vendor_data.get("phone") or ""
    vendor_gstin = vendor_data.get("gstin")

    vendor_text = f"<b>{vendor_name}</b><br/>{vendor_address}<br/>Phone: {vendor_phone}"
    if vendor_gstin:
        vendor_text += f"<br/><b>GSTIN:</b> {vendor_gstin}"

    order_line = f"<b>Order Ref:</b> {order_id}<br/>" if order_id else "<b>Sale Type:</b> Direct Counter Bill<br/>"
    doc_meta_text = (
        f"<b>{doc_label}</b><br/>"
        f"<b>Document #:</b> {bill_number}<br/>"
        f"<b>Date:</b> {issue_date.strftime('%d-%b-%Y %I:%M %p')}<br/>"
        f"{order_line}"
        f"<b>Revision:</b> v{version} · <b>Status:</b> {status_label}"
    )

    header_table = Table(
        [
            [Paragraph(vendor_text, body_normal), Paragraph(doc_meta_text, meta_right_style)]
        ],
        colWidths=[310, 230]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=12))

    # 2. Bill To (Customer Details)
    cust_name = customer_data.get("name") or "Valued Customer"
    cust_phone = customer_data.get("phone") or "N/A"
    cust_address = customer_data.get("address") or customer_data.get("city") or "Customer Address"

    bill_to_content = [
        [
            Paragraph("<b>BILL TO:</b>", body_bold),
            Paragraph("<b>DISPATCH / STORE INFO:</b>", body_bold)
        ],
        [
            Paragraph(f"<b>Name:</b> {cust_name}<br/><b>Phone:</b> {cust_phone}<br/><b>Delivery Address:</b> {cust_address}", body_normal),
            Paragraph(f"<b>Fulfilled by:</b> {vendor_name}<br/><b>Category:</b> {vendor_data.get('category', 'Retail')}<br/><b>Platform:</b> SmartStock AI Verified", body_normal)
        ]
    ]
    cust_table = Table(bill_to_content, colWidths=[310, 230])
    cust_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
    ]))
    elements.append(cust_table)
    elements.append(Spacer(1, 15))

    # 3. Line Items Table
    table_data = [
        [
            Paragraph("<b>#</b>", body_bold),
            Paragraph("<b>Item Description</b>", body_bold),
            Paragraph("<b>Qty</b>", body_bold),
            Paragraph("<b>Unit</b>", body_bold),
            Paragraph("<b>Rate (₹)</b>", body_bold),
            Paragraph("<b>Amount (₹)</b>", body_bold)
        ]
    ]

    for idx, item in enumerate(totals_data.get("items", []), 1):
        sno = item.get("sno", idx)
        prod_name = str(item.get("product_name") or item.get("name") or "Item")
        qty = float(item.get("qty", 1.0))
        unit = str(item.get("unit", "pcs"))
        unit_price = float(item.get("unit_price", 0.0))
        line_total = float(item.get("line_total", qty * unit_price))

        table_data.append([
            Paragraph(str(sno), body_normal),
            Paragraph(prod_name, body_bold),
            Paragraph(f"{qty:g}", body_normal),
            Paragraph(unit, body_normal),
            Paragraph(f"₹{unit_price:.2f}", body_normal),
            Paragraph(f"₹{line_total:.2f}", body_bold)
        ])

    items_table = Table(
        table_data,
        colWidths=[25, 235, 55, 60, 75, 90]
    )
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), header_bg),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 10))

    # 4. Calculation Summary Table (Right-aligned)
    calc_rows = [
        [Paragraph("Subtotal:", body_bold), Paragraph(f"₹{totals_data['subtotal']:.2f}", body_bold)]
    ]

    if totals_data.get("discount", 0.0) > 0:
        calc_rows.append([Paragraph("Discount:", body_normal), Paragraph(f"-₹{totals_data['discount']:.2f}", body_normal)])

    tax_rate = totals_data.get("tax_rate", 0.0)
    if tax_rate > 0:
        if totals_data.get("igst", 0.0) > 0:
            calc_rows.append([Paragraph(f"IGST ({tax_rate}%):", body_normal), Paragraph(f"₹{totals_data['igst']:.2f}", body_normal)])
        else:
            half_rate = tax_rate / 2.0
            calc_rows.append([Paragraph(f"CGST ({half_rate}%):", body_normal), Paragraph(f"₹{totals_data.get('cgst', 0.0):.2f}", body_normal)])
            calc_rows.append([Paragraph(f"SGST ({half_rate}%):", body_normal), Paragraph(f"₹{totals_data.get('sgst', 0.0):.2f}", body_normal)])

    if totals_data.get("delivery_charge", 0.0) > 0:
        calc_rows.append([Paragraph("Delivery Charge:", body_normal), Paragraph(f"₹{totals_data['delivery_charge']:.2f}", body_normal)])

    calc_rows.append([Paragraph("<b>TOTAL AMOUNT:</b>", body_bold), Paragraph(f"<b>₹{totals_data['final_total']:.2f}</b>", body_bold)])

    amount_paid = totals_data.get("amount_paid", 0.0)
    balance_due = totals_data.get("balance_due", 0.0)
    payment_method = totals_data.get("payment_method")

    if amount_paid > 0 or payment_status in ["paid", "partially_paid"]:
        method_str = f" ({payment_method})" if payment_method else ""
        calc_rows.append([Paragraph(f"Paid{method_str}:", body_normal), Paragraph(f"₹{amount_paid:.2f}", body_normal)])
        calc_rows.append([Paragraph("<b>Balance Due:</b>", body_bold), Paragraph(f"<b>₹{balance_due:.2f}</b>", body_bold)])

    summary_table = Table(
        calc_rows,
        colWidths=[140, 110]
    )
    summary_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#e2e8f0")),
    ]))

    # Place summary aligned to the right
    wrapper_table = Table([
        [
            Paragraph(
                "<b>Terms & Conditions:</b><br/>"
                "• All prices are in Indian Rupees (₹).<br/>"
                "• Goods once delivered cannot be returned without inspection.<br/>"
                "• For queries or order status, WhatsApp your shopkeeper directly.<br/>"
                f"• Verified by SmartStock AI Retail Cloud.",
                body_normal
            ),
            summary_table
        ]
    ], colWidths=[280, 260])
    wrapper_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 0),
    ]))

    elements.append(KeepTogether([wrapper_table, Spacer(1, 20)]))

    # 5. Footer Signatory
    sign_table = Table([
        [
            Paragraph("Customer Signature", body_normal),
            Paragraph("Authorized Signatory<br/><b>" + vendor_name + "</b>", meta_right_style)
        ]
    ], colWidths=[270, 270])
    sign_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('PADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(sign_table)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


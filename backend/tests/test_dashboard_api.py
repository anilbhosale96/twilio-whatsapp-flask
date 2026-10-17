import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.vendor import Vendor
from app.models.item import Item
from app.models.transaction import Transaction

def test_dashboard_api_flow(client: TestClient, db_session: Session):
    vendor_phone = "whatsapp:+919876543210"
    
    # Create vendor
    vendor = Vendor(
        phone=vendor_phone,
        name="Test Kirana",
        default_threshold=5.0,
        language="en"
    )
    db_session.add(vendor)

    # Create items
    item1 = Item(vendor=vendor_phone, name="rice", unit="kg", qty=10.0, threshold=5.0, price=50.0)
    item2 = Item(vendor=vendor_phone, name="bread", unit="pcs", qty=2.0, threshold=5.0, price=25.0)
    item3 = Item(vendor=vendor_phone, name="potato", unit="kg", qty=-1.0, threshold=5.0, price=30.0)
    db_session.add_all([item1, item2, item3])
    db_session.commit()

    # 1. Test Summary
    res = client.get("/api/summary", params={"vendor": vendor_phone})
    assert res.status_code == 200
    summary = res.json()
    assert summary["total_items"] == 3
    assert summary["low_stock_count"] == 1 # bread (2 <= 5)
    assert summary["negative_stock_count"] == 1 # potato (-1 < 0)

    # 2. Test Inventory
    res = client.get("/api/inventory", params={"vendor": vendor_phone})
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 3

    # Test Search
    res_search = client.get("/api/inventory", params={"vendor": vendor_phone, "search": "rice"})
    assert len(res_search.json()) == 1

    # 3. Test Patch with qty, threshold, price, reordered
    item_rice = next(it for it in items if it["name"] == "rice")
    item_id = item_rice["id"]
    res_patch = client.patch(f"/api/inventory/{item_id}", json={"qty": 25.0, "threshold": 12.0, "price": 55.0, "reordered": True})
    assert res_patch.status_code == 200
    patch_item = res_patch.json()["item"]
    assert patch_item["qty"] == 25.0
    assert patch_item["threshold"] == 12.0
    assert patch_item["price"] == 55.0
    assert patch_item["reordered"] is True

    # Verify inventory returns updated qty
    res_inv_updated = client.get("/api/inventory", params={"vendor": vendor_phone})
    assert res_inv_updated.status_code == 200
    updated_item = next(it for it in res_inv_updated.json() if it["id"] == item_id)
    assert updated_item["qty"] == 25.0

    # 4. Test Alerts
    res_alerts = client.get("/api/alerts", params={"vendor": vendor_phone})
    assert res_alerts.status_code == 200
    alerts_data = res_alerts.json()
    assert alerts_data["count"] >= 2
    assert "copyable_reorder_message" in alerts_data

    # 5. Test Transactions
    res_txs = client.get("/api/transactions", params={"vendor": vendor_phone})
    assert res_txs.status_code == 200
    assert "items" in res_txs.json()

    # 6. Test Reports
    res_reports = client.get("/api/reports", params={"vendor": vendor_phone, "range": "today"})
    assert res_reports.status_code == 200
    assert "total_revenue" in res_reports.json()

    # 7. Test Export CSV
    res_csv = client.get("/api/export.csv", params={"vendor": vendor_phone})
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "Item Name" in res_csv.text

    # 8. Test Settings
    res_get_settings = client.get("/api/settings", params={"vendor": vendor_phone})
    assert res_get_settings.status_code == 200
    assert res_get_settings.json()["name"] == "Test Kirana"

    res_put_settings = client.put(
        "/api/settings",
        params={"vendor": vendor_phone},
        json={"name": "Owner Amit", "shop_name": "New Kirana Store"}
    )
    assert res_put_settings.status_code == 200
    assert res_put_settings.json()["settings"]["name"] == "Owner Amit"
    assert res_put_settings.json()["settings"]["shop_name"] == "New Kirana Store"

    # 9. Test Add Item (POST /api/inventory)
    res_add_item = client.post(
        "/api/inventory",
        params={"vendor": vendor_phone},
        json={"name": "Atta", "unit": "kg", "qty": 40.0, "threshold": 10.0, "price": 42.0}
    )
    assert res_add_item.status_code == 200
    added_id = res_add_item.json()["item"]["id"]
    assert res_add_item.json()["item"]["name"] == "atta"

    # Test Edit Item Name/Unit
    res_edit_name = client.patch(
        f"/api/inventory/{added_id}",
        params={"vendor": vendor_phone},
        json={"name": "Chakki Atta", "unit": "packet"}
    )
    assert res_edit_name.status_code == 200
    assert res_edit_name.json()["item"]["name"] == "chakki atta"
    assert res_edit_name.json()["item"]["unit"] == "packet"

    # Test Delete Item (DELETE /api/inventory/{id})
    res_del_item = client.delete(
        f"/api/inventory/{added_id}",
        params={"vendor": vendor_phone}
    )
    assert res_del_item.status_code == 200

    # 10. Test Chat Preview
    res_preview = client.get("/api/chat-preview")
    assert res_preview.status_code == 200
    assert "history" in res_preview.json()


import pytest
from app.parsers.rule_parser import parse_message

def test_add_multi_items():
    res = parse_message("Added 10kg rice, 5L oil")
    assert not res.is_command
    assert len(res.actions) == 2
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 10.0
    assert res.actions[0].unit == "kg"
    assert res.actions[0].item_name == "rice"
    assert res.actions[1].action == "ADD"
    assert res.actions[1].quantity == 5.0
    assert res.actions[1].unit == "l"
    assert res.actions[1].item_name == "oil"

def test_sold_with_price():
    res = parse_message("sold 2 bread @20")
    assert len(res.actions) == 1
    action = res.actions[0]
    assert action.action == "SELL"
    assert action.quantity == 2.0
    assert action.item_name == "bread"
    assert action.unit == "pcs"
    assert action.price == 20.0

def test_hindi_chawal_aaya():
    res = parse_message("10 kg chawal aaya")
    assert len(res.actions) == 1
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 10.0
    assert res.actions[0].unit == "kg"
    assert res.actions[0].item_name == "rice"

def test_hindi_tel_khareeda():
    res = parse_message("5l tel khareeda")
    assert len(res.actions) == 1
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 5.0
    assert res.actions[0].unit == "l"
    assert res.actions[0].item_name == "oil"

def test_sold_multi_with_price():
    res = parse_message("sold 5kg sugar, 2 packets biscuit @15")
    assert len(res.actions) == 2
    assert res.actions[0].action == "SELL"
    assert res.actions[0].quantity == 5.0
    assert res.actions[0].unit == "kg"
    assert res.actions[0].item_name == "sugar"
    assert res.actions[1].action == "SELL"
    assert res.actions[1].quantity == 2.0
    assert res.actions[1].unit == "packet"
    assert res.actions[1].item_name == "biscuit"
    assert res.actions[1].price == 15.0

def test_marathi_bread_vikla():
    res = parse_message("2 packet bread vikla @25")
    assert len(res.actions) == 1
    assert res.actions[0].action == "SELL"
    assert res.actions[0].quantity == 2.0
    assert res.actions[0].unit == "packet"
    assert res.actions[0].item_name == "bread"
    assert res.actions[0].price == 25.0

def test_add_maggi_packets():
    res = parse_message("Added 50 packet maggi")
    assert len(res.actions) == 1
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 50.0
    assert res.actions[0].unit == "packet"
    assert res.actions[0].item_name == "maggi"

def test_becha_hindi():
    res = parse_message("becha 2 bread")
    assert len(res.actions) == 1
    assert res.actions[0].action == "SELL"
    assert res.actions[0].quantity == 2.0
    assert res.actions[0].item_name == "bread"

def test_atta_laya():
    res = parse_message("10kg atta laya")
    assert len(res.actions) == 1
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 10.0
    assert res.actions[0].unit == "kg"
    assert res.actions[0].item_name == "atta"

def test_eggs_sold_price_with_spaces():
    res = parse_message("sold 12 eggs @ 6")
    assert len(res.actions) == 1
    assert res.actions[0].action == "SELL"
    assert res.actions[0].quantity == 12.0
    assert res.actions[0].item_name == "egg"
    assert res.actions[0].price == 6.0

def test_chips_aaya():
    res = parse_message("10 packet chips aaya")
    assert len(res.actions) == 1
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 10.0
    assert res.actions[0].unit == "packet"
    assert res.actions[0].item_name == "chips"

def test_bik_gaya_milk():
    res = parse_message("bik gaya 3 packet milk")
    assert len(res.actions) == 1
    assert res.actions[0].action == "SELL"
    assert res.actions[0].quantity == 3.0
    assert res.actions[0].unit == "packet"
    assert res.actions[0].item_name == "milk"

def test_box_unit():
    res = parse_message("kharida 20 box soap @ 30")
    assert len(res.actions) == 1
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 20.0
    assert res.actions[0].unit == "box"
    assert res.actions[0].item_name == "soap"
    assert res.actions[0].price == 30.0

def test_dozen_unit():
    res = parse_message("5 dozen anda laya")
    assert len(res.actions) == 1
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 5.0
    assert res.actions[0].unit == "dozen"
    assert res.actions[0].item_name == "egg"

def test_float_quantity():
    res = parse_message("sold 1.5kg sugar @45")
    assert len(res.actions) == 1
    assert res.actions[0].action == "SELL"
    assert res.actions[0].quantity == 1.5
    assert res.actions[0].unit == "kg"
    assert res.actions[0].item_name == "sugar"
    assert res.actions[0].price == 45.0

def test_gram_unit():
    res = parse_message("Added 250 g butter")
    assert len(res.actions) == 1
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 250.0
    assert res.actions[0].unit == "g"
    assert res.actions[0].item_name == "butter"

def test_marathi_tandul_vikla():
    res = parse_message("vikla 5 kg tandul @ 50")
    assert len(res.actions) == 1
    assert res.actions[0].action == "SELL"
    assert res.actions[0].quantity == 5.0
    assert res.actions[0].unit == "kg"
    assert res.actions[0].item_name == "rice"
    assert res.actions[0].price == 50.0

def test_marathi_dudh_aala():
    res = parse_message("dudh 2 liter aala")
    assert len(res.actions) == 1
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 2.0
    assert res.actions[0].unit == "l"
    assert res.actions[0].item_name == "milk"

def test_cheeni_kilo_add():
    res = parse_message("cheeni 10 kilo add")
    assert len(res.actions) == 1
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 10.0
    assert res.actions[0].unit == "kg"
    assert res.actions[0].item_name == "sugar"

def test_typo_slood():
    res = parse_message("slood 2 bread")
    assert len(res.actions) == 1
    assert res.actions[0].action == "SELL"
    assert res.actions[0].quantity == 2.0
    assert res.actions[0].item_name == "bread"

def test_typo_addek():
    res = parse_message("addek 10kg rice")
    assert len(res.actions) == 1
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 10.0
    assert res.actions[0].unit == "kg"
    assert res.actions[0].item_name == "rice"

def test_mixed_case():
    res = parse_message("ADDed 5L OIL AND 2KG RICE")
    assert len(res.actions) == 2
    assert res.actions[0].action == "ADD"
    assert res.actions[0].quantity == 5.0
    assert res.actions[0].unit == "l"
    assert res.actions[0].item_name == "oil"
    assert res.actions[1].action == "ADD"
    assert res.actions[1].quantity == 2.0
    assert res.actions[1].unit == "kg"
    assert res.actions[1].item_name == "rice"

def test_price_with_at_word():
    res = parse_message("sold 2 bread at 25")
    assert len(res.actions) == 1
    assert res.actions[0].action == "SELL"
    assert res.actions[0].price == 25.0

def test_price_with_rs():
    res = parse_message("sold 1 bread 20 rs")
    assert len(res.actions) == 1
    assert res.actions[0].action == "SELL"
    assert res.actions[0].price == 20.0

def test_command_help():
    res = parse_message("help")
    assert res.is_command
    assert res.command.command == "help"

def test_command_stock():
    res = parse_message("stock")
    assert res.is_command
    assert res.command.command == "stock"

def test_command_low():
    res = parse_message("low")
    assert res.is_command
    assert res.command.command == "low"

def test_command_report():
    res = parse_message("report")
    assert res.is_command
    assert res.command.command == "report"

def test_command_undo():
    res = parse_message("undo")
    assert res.is_command
    assert res.command.command == "undo"

def test_command_alert_setting():
    res = parse_message("alert rice 3")
    assert res.is_command
    assert res.command.command == "alert"
    assert res.command.args == ["rice", "3"]

def test_hindi_command_hisab():
    res = parse_message("hisab")
    assert res.is_command
    assert res.command.command == "report"

def test_hindi_command_wapas():
    res = parse_message("wapas")
    assert res.is_command
    assert res.command.command == "undo"

def test_hindi_command_madad():
    res = parse_message("madad")
    assert res.is_command
    assert res.command.command == "help"

def test_word_number_don_doli():
    res = parse_message("ek bread sold")
    assert len(res.actions) == 1
    assert res.actions[0].action == "SELL"
    assert res.actions[0].quantity == 1.0
    assert res.actions[0].item_name == "bread"

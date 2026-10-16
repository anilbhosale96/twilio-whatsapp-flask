from pydantic import BaseModel, Field
from typing import Optional, List, Literal

ActionType = Literal["ADD", "SELL"]

class ParsedAction(BaseModel):
    action: ActionType
    item_name: str
    quantity: float = Field(gt=0)
    unit: str
    price: Optional[float] = Field(default=None, ge=0)

class ParsedCommand(BaseModel):
    command: Literal["help", "stock", "low", "report", "undo", "alert"]
    args: List[str] = Field(default_factory=list)

class ParseResult(BaseModel):
    is_command: bool = False
    command: Optional[ParsedCommand] = None
    actions: List[ParsedAction] = Field(default_factory=list)
    raw_text: str = ""
    error: Optional[str] = None

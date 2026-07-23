"""Request/response models for the billing endpoints."""
from datetime import date, datetime

from pydantic import BaseModel, Field


class BillItemCreate(BaseModel):
    description: str = Field(min_length=1, max_length=255)
    quantity: int = Field(default=1, gt=0)
    unit_price: float = Field(ge=0)
    gst_rate: float = Field(default=0, ge=0, le=100)


class BillItemOut(BaseModel):
    item_id: int
    description: str
    quantity: int
    unit_price: float
    gst_rate: float
    subtotal: float
    gst_amount: float
    line_total: float

    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    mode: str
    reference_number: str | None = Field(default=None, max_length=100)


class PaymentOut(BaseModel):
    payment_id: int
    amount: float
    mode: str
    reference_number: str | None
    received_by: int
    received_at: datetime

    class Config:
        from_attributes = True


class BillCreate(BaseModel):
    patient_id: int


class BillOut(BaseModel):
    bill_id: int
    patient_id: int
    status: str
    total: float
    created_by: int
    created_at: datetime
    finalized_at: datetime | None
    items: list[BillItemOut]
    payments: list[PaymentOut]
    amount_paid: float
    balance_due: float

    class Config:
        from_attributes = True


class BillListItem(BaseModel):
    bill_id: int
    patient_id: int
    status: str
    total: float
    created_at: datetime
    finalized_at: datetime | None

    class Config:
        from_attributes = True


class BillSearchResponse(BaseModel):
    items: list[BillListItem]
    total: int


class DailyReportModeBreakdown(BaseModel):
    mode: str
    amount: float


class DailyReportOut(BaseModel):
    date: date
    total_billed: float
    bill_count: int
    total_collected: float
    by_mode: list[DailyReportModeBreakdown]

"""Request/response models for the Pharmacy medicine/batch/dispense endpoints."""
from datetime import date, datetime

from pydantic import BaseModel, Field


class MedicineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    hsn_code: str | None = Field(default=None, max_length=20)
    gst_rate: float | None = None
    unit: str = Field(min_length=1, max_length=50)
    reorder_level: int = Field(default=10, ge=0)


class MedicinePatch(BaseModel):
    is_active: bool | None = None
    reorder_level: int | None = Field(default=None, ge=0)


class MedicineBatchCreate(BaseModel):
    batch_number: str = Field(min_length=1, max_length=100)
    expiry_date: date
    quantity: int = Field(gt=0)
    cost_price: float | None = None
    mrp: float | None = None


class MedicineBatchOut(BaseModel):
    batch_id: int
    batch_number: str
    expiry_date: date
    quantity_on_hand: int
    cost_price: float | None
    mrp: float | None
    received_at: datetime

    class Config:
        from_attributes = True


class MedicineOut(BaseModel):
    medicine_id: int
    name: str
    hsn_code: str | None
    gst_rate: float | None
    unit: str
    reorder_level: int
    is_active: bool
    created_at: datetime
    batches: list[MedicineBatchOut]

    class Config:
        from_attributes = True


class MedicineListItem(BaseModel):
    medicine_id: int
    name: str
    unit: str
    reorder_level: int
    is_active: bool
    total_quantity: int

    class Config:
        from_attributes = True


class MedicineSearchResponse(BaseModel):
    items: list[MedicineListItem]
    total: int


class LowStockItem(BaseModel):
    medicine_id: int
    name: str
    unit: str
    total_quantity: int
    reorder_level: int


class ExpiringBatchItem(BaseModel):
    batch_id: int
    medicine_id: int
    medicine_name: str
    batch_number: str
    expiry_date: date
    quantity_on_hand: int
    days_until_expiry: int


class DispenseItemCreate(BaseModel):
    medicine_id: int
    quantity: int = Field(gt=0)


class DispenseCreate(BaseModel):
    patient_id: int
    prescription_id: int | None = None
    items: list[DispenseItemCreate] = Field(min_length=1)


class DispenseItemBatchOut(BaseModel):
    batch_id: int
    batch_number: str
    quantity_deducted: int

    class Config:
        from_attributes = True


class DispenseItemOut(BaseModel):
    item_id: int
    medicine_id: int
    medicine_name: str
    quantity: int
    batch_allocations: list[DispenseItemBatchOut]

    class Config:
        from_attributes = True


class DispenseOut(BaseModel):
    dispense_id: int
    patient_id: int
    prescription_id: int | None
    dispensed_by: int
    dispensed_at: datetime
    items: list[DispenseItemOut]

    class Config:
        from_attributes = True


class DispenseListItem(BaseModel):
    dispense_id: int
    patient_id: int
    prescription_id: int | None
    dispensed_at: datetime

    class Config:
        from_attributes = True


class DispenseSearchResponse(BaseModel):
    items: list[DispenseListItem]
    total: int

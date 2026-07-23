"""Request/response models for the Lab order/result endpoints."""
from datetime import datetime

from pydantic import BaseModel, Field


class LabOrderCreate(BaseModel):
    patient_id: int
    consult_id: int | None = None
    test_code: str | None = Field(default=None, max_length=20)
    test_name: str = Field(min_length=1, max_length=255)


class LabResultIn(BaseModel):
    result_data: str = Field(min_length=1)
    reference_range: str | None = Field(default=None, max_length=255)


class LabResultOut(BaseModel):
    result_id: int
    result_data: str
    reference_range: str | None
    uploaded_by: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class LabOrderOut(BaseModel):
    order_id: int
    patient_id: int
    consult_id: int | None
    test_code: str | None
    test_name: str
    status: str
    ordered_by: int
    ordered_at: datetime
    result: LabResultOut | None

    class Config:
        from_attributes = True


class LabOrderListItem(BaseModel):
    order_id: int
    patient_id: int
    consult_id: int | None
    test_name: str
    status: str
    ordered_at: datetime

    class Config:
        from_attributes = True


class LabOrderSearchResponse(BaseModel):
    items: list[LabOrderListItem]
    total: int

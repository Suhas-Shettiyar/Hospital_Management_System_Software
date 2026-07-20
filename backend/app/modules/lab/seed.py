"""Seeds lab_test_catalog with a starter set of common lab tests on startup.

Idempotent: only inserts rows whose loinc_code isn't already present, same
insert-if-missing shape as app.core.module_registry.seed.seed_default_modules.
Existing rows are never updated here.

The list below is a STARTER set, not a full LOINC terminology sync - single-
analyte tests with widely-published codes, chosen to minimize the risk of a
misremembered digit. Spot-check against an authoritative source (loinc.org)
before relying on these for anything regulatory/FHIR-facing.
"""
from sqlalchemy.orm import Session

from app.modules.lab.models import LabTestCatalog

LAB_TEST_CATALOG_SEED: list[tuple[str, str]] = [
    ("718-7", "Hemoglobin"),
    ("4544-3", "Hematocrit"),
    ("6690-2", "WBC count"),
    ("777-3", "Platelet count"),
    ("789-8", "RBC count"),
    ("1558-6", "Glucose, fasting"),
    ("2345-7", "Glucose, random"),
    ("4548-4", "Hemoglobin A1c"),
    ("2093-3", "Total Cholesterol"),
    ("2571-8", "Triglycerides"),
    ("2085-9", "HDL Cholesterol"),
    ("13457-7", "LDL Cholesterol (calculated)"),
    ("3094-0", "Blood Urea Nitrogen"),
    ("2160-0", "Creatinine, serum"),
    ("2951-2", "Sodium, serum"),
    ("2823-3", "Potassium, serum"),
    ("2075-0", "Chloride, serum"),
    ("1742-6", "ALT (SGPT)"),
    ("1920-8", "AST (SGOT)"),
    ("1975-2", "Total Bilirubin"),
    ("1968-7", "Direct Bilirubin"),
    ("6768-6", "Alkaline Phosphatase"),
    ("2885-2", "Total Protein"),
    ("1751-7", "Albumin, serum"),
    ("3016-3", "TSH"),
]


def seed_default_lab_catalog(db: Session) -> None:
    existing_codes = {row[0] for row in db.query(LabTestCatalog.loinc_code).all()}
    for loinc_code, test_name in LAB_TEST_CATALOG_SEED:
        if loinc_code in existing_codes:
            continue
        db.add(LabTestCatalog(loinc_code=loinc_code, test_name=test_name))
    db.commit()

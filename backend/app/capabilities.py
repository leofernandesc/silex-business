"""Small, server-owned module capability policy; no username-based authorization."""
from fastapi import HTTPException


def has_transport(user):
    return bool(user and user.active and user.role == "admin" and user.transport_operations)


def require_transport(user):
    if not has_transport(user):
        raise HTTPException(403, "Esta operação exige o módulo de transportadora")


def transport_kind(user, kind):
    if kind == "subcontracted_freight":
        require_transport(user)


def transport_supplier(db, user, supplier_id):
    # Financial history remains readable; this guard is for NEW associations only.
    from .models import Supplier
    supplier = db.get(Supplier, supplier_id) if supplier_id else None
    if supplier:
        transport_kind(user, supplier.kind)

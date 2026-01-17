"""
Seed dataset for demo tenant reset.
Deterministic, repeatable seed documents.
"""

SEED_DOCUMENTS = [
    {
        "source": "restaurant",
        "title": "Restaurant Overview",
        "content": """NAME: Demo Bistro
ADDRESS: Musterstraße 12, 52062 Aachen
PHONE: +49 241 000000
EMAIL: hello@demobistro.example
WEBSITE: https://demo.helioncity.com"""
    },
    {
        "source": "restaurant",
        "title": "Opening Hours",
        "content": """OPENING HOURS:
Mon-Fri 11:00-22:00
Sat 12:00-23:00
Sun closed
HOLIDAYS: Special hours may apply."""
    },
    {
        "source": "policy",
        "title": "Reservations Policy",
        "content": """RESERVATIONS:
- Call or book online.
- Groups over 8 must pre-order.
- Late arrivals >15 minutes may lose the table."""
    },
    {
        "source": "policy",
        "title": "Allergens & Food Safety",
        "content": """ALLERGENS:
We handle milk, eggs, nuts, gluten.
Cross-contamination is possible.
Ask staff for the allergen list per dish."""
    },
    {
        "source": "policy",
        "title": "Delivery & Pickup",
        "content": """DELIVERY:
- Delivery radius: 5km
- Minimum order: 20 EUR
- Delivery times: 30-60 minutes (traffic dependent)
PICKUP:
- Ready in 15-25 minutes after confirmation."""
    },
    {
        "source": "policy",
        "title": "Payments & Receipts",
        "content": """PAYMENTS:
Cash, EC card, Visa, Mastercard.
RECEIPTS:
Digital or printed receipt available on request."""
    },
    {
        "source": "policy",
        "title": "Refunds & Complaints",
        "content": """REFUNDS & COMPLAINTS:
- Complaints within 24h with receipt.
- For incorrect items: photo required for delivery orders.
- We aim to respond within 1 business day."""
    },
    {
        "source": "manual",
        "title": "Staff SOP (Closing Checklist)",
        "content": """CLOSING CHECKLIST:
1) Count cash + reconcile card totals.
2) Clean surfaces + sanitize prep areas.
3) Label & store leftovers (date/time).
4) Turn off non-essential equipment.
5) Lock doors, set alarm, confirm lights off."""
    }
]


def get_seed_documents():
    """
    Get the seed dataset.
    
    Returns:
        List of dicts with keys: source, title, content
    """
    return SEED_DOCUMENTS.copy()

"""
validators.py — Input validation for all order parameters.

Validates before any API call is made to catch errors early,
provide clear user feedback, and avoid wasting API rate-limit quota.

Mirrors the UI's validators.ts module for consistent validation logic.
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ValidationResult:
    """
    Result of a validation check.

    Attributes:
        valid  : True if all parameters passed validation
        errors : List of human-readable error descriptions
    """
    valid: bool
    errors: List[str] = field(default_factory=list)

    def __str__(self):
        if self.valid:
            return "✅ Validation passed"
        return "❌ Validation failed:\n  " + "\n  ".join(f"• {e}" for e in self.errors)


# ── Field validators ───────────────────────────────────────────────────────────

def validate_symbol(symbol: str) -> List[str]:
    """Validate trading pair symbol (must end with USDT, min 6 chars)."""
    errors = []
    if not symbol or not symbol.strip():
        return ["Symbol is required."]
    s = symbol.upper().strip()
    if not s.endswith("USDT"):
        errors.append(
            f"Symbol '{s}' must end with USDT (e.g., BTCUSDT, ETHUSDT)."
        )
    if len(s) < 6:
        errors.append(f"Symbol '{s}' is too short (minimum 6 characters).")
    return errors


def validate_quantity(quantity: str) -> List[str]:
    """Validate trade quantity (must be a positive number, max 1000)."""
    errors = []
    if not quantity or not str(quantity).strip():
        return ["Quantity is required."]
    try:
        val = float(quantity)
        if val <= 0:
            errors.append("Quantity must be greater than 0.")
        elif val > 1000:
            errors.append(
                f"Quantity {val} exceeds the maximum allowed value (1000)."
            )
    except (ValueError, TypeError):
        errors.append(f"Quantity '{quantity}' is not a valid number.")
    return errors


def validate_price(price: str, field_name: str = "Price") -> List[str]:
    """Validate a price field (must be a positive number)."""
    errors = []
    if not price or not str(price).strip():
        return [f"{field_name} is required for this order type."]
    try:
        val = float(price)
        if val <= 0:
            errors.append(f"{field_name} must be greater than 0.")
    except (ValueError, TypeError):
        errors.append(f"{field_name} '{price}' is not a valid number.")
    return errors


def validate_side(side: str) -> List[str]:
    """Validate order direction."""
    if side.upper() not in ("BUY", "SELL"):
        return [f"Side must be 'BUY' or 'SELL', got '{side}'."]
    return []


def validate_order_type(order_type: str) -> List[str]:
    """Validate order type."""
    if order_type.upper() not in ("MARKET", "LIMIT", "STOP"):
        return [
            f"Order type must be 'MARKET', 'LIMIT', or 'STOP', got '{order_type}'."
        ]
    return []


# ── Stop-Limit relationship validator ─────────────────────────────────────────
def validate_stop_limit_relationship(
    side: str,
    price: str,
    stop_price: str,
) -> List[str]:
    """
    Validate that the stop/limit price relationship makes logical sense.

    Binance Stop-Limit rules:
      SELL Stop-Limit: stop_price (trigger) > price (limit)
        → The order triggers when price DROPS to stopPrice,
          then executes at the lower limit price.
        Example: stopPrice=60000, price=59950

      BUY Stop-Limit: stop_price (trigger) < price (limit)
        → The order triggers when price RISES to stopPrice,
          then executes at the higher limit price.
        Example: stopPrice=60000, price=60050
    """
    errors = []
    try:
        p = float(price)
        sp = float(stop_price)
        side_upper = side.upper()

        if side_upper == "SELL":
            if p >= sp:
                errors.append(
                    f"SELL Stop-Limit: Limit price ({p}) must be BELOW "
                    f"the stop/trigger price ({sp}). "
                    f"Example: stopPrice=60000, price=59950"
                )
        elif side_upper == "BUY":
            if p <= sp:
                errors.append(
                    f"BUY Stop-Limit: Limit price ({p}) must be ABOVE "
                    f"the stop/trigger price ({sp}). "
                    f"Example: stopPrice=60000, price=60050"
                )
    except (ValueError, TypeError):
        pass  # Numeric errors caught by validate_price already
    return errors


# ── Combined order validator ───────────────────────────────────────────────────
def validate_order(
    order_type: str,
    side: str,
    symbol: str,
    quantity: str,
    price: Optional[str] = None,
    stop_price: Optional[str] = None,
) -> ValidationResult:
    """
    Comprehensive validation for all order types.

    Args:
        order_type  : "MARKET", "LIMIT", or "STOP"
        side        : "BUY" or "SELL"
        symbol      : Trading pair (e.g., "BTCUSDT")
        quantity    : Amount to trade (string for flexibility)
        price       : Limit price (required for LIMIT + STOP)
        stop_price  : Trigger price (required for STOP only)

    Returns:
        ValidationResult with .valid bool and .errors list.
    """
    errors: List[str] = []

    # Always validate
    errors.extend(validate_symbol(symbol))
    errors.extend(validate_side(side))
    errors.extend(validate_order_type(order_type))
    errors.extend(validate_quantity(quantity))

    order_type_upper = order_type.upper()

    if order_type_upper == "LIMIT":
        if not price:
            errors.append("Price is required for LIMIT orders.")
        else:
            errors.extend(validate_price(price, "Limit Price"))

    elif order_type_upper == "STOP":
        # Limit price
        if not price:
            errors.append(
                "Limit price (--price) is required for STOP (Stop-Limit) orders."
            )
        else:
            errors.extend(validate_price(price, "Limit Price"))

        # Stop/trigger price
        if not stop_price:
            errors.append(
                "Stop/trigger price (--stop-price) is required for STOP orders."
            )
        else:
            errors.extend(validate_price(stop_price, "Stop Price"))

        # Relationship check (only if both prices are valid numbers)
        if price and stop_price:
            errors.extend(
                validate_stop_limit_relationship(side, price, stop_price)
            )

    return ValidationResult(valid=len(errors) == 0, errors=errors)

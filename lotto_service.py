"""Weekly Lotto 6/45 schedule and entertainment-only random-number generation."""
from datetime import date, datetime, time, timedelta
from secrets import SystemRandom
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")
FIRST_DRAW_DATE = date(2002, 12, 7)
SALES_CUTOFF = time(20, 0)  # Saturday, Korea local time.
_rng = SystemRandom()


def current_draw(now=None):
    """Return (target_round, scheduled_draw_date), rolling at Saturday 20:00 KST.

    The lottery's normal weekly schedule is used. An official schedule exception
    should be handled explicitly in a later configurable schedule table.
    """
    if now is None:
        now = datetime.now(KST)
    elif now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    now = now.astimezone(KST)
    days_until_saturday = (5 - now.weekday()) % 7
    saturday = now.date() + timedelta(days=days_until_saturday)
    if days_until_saturday == 0 and now.time() >= SALES_CUTOFF:
        saturday += timedelta(days=7)
    round_number = (saturday - FIRST_DRAW_DATE).days // 7 + 1
    if round_number < 1:
        raise ValueError("Lotto draw date precedes the first official draw")
    return round_number, saturday


def generate_numbers(excluded=()):
    """Six unbiased distinct integers, excluding combinations already assigned."""
    rejected = {tuple(sorted(n)) for n in excluded}
    for _ in range(100):
        numbers = tuple(sorted(_rng.sample(range(1, 46), 6)))
        if numbers not in rejected:
            return list(numbers)
    raise RuntimeError("Could not generate a distinct Lotto combination")


def number_key(numbers):
    return "-".join(f"{n:02d}" for n in sorted(numbers))

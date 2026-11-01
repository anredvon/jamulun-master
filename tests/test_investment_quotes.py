"""Content contract for sourced one-line investment readings."""

import json
import unittest
from pathlib import Path


CATALOG_PATH = Path(__file__).resolve().parents[1] / "static" / "data" / "investment_quotes.json"


class InvestmentQuoteCatalogTest(unittest.TestCase):
    def test_catalog_has_twenty_unique_short_quotes_with_distinct_primary_sources(self):
        quotes = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))

        self.assertEqual(len(quotes), 20)
        self.assertEqual(len({quote["id"] for quote in quotes}), 20)
        self.assertEqual(len({quote["source_url"] for quote in quotes}), 20)
        for quote in quotes:
            with self.subTest(quote_id=quote["id"]):
                for field in ("text_ko", "text_original", "author", "source_title", "source_url"):
                    self.assertTrue(quote[field].strip(), field)
                self.assertTrue(quote["source_url"].startswith("https://"))
                self.assertLessEqual(len(quote["text_original"].split()), 25)


if __name__ == "__main__":
    unittest.main()

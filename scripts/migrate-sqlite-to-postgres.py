#!/usr/bin/env python3
"""Move the legacy SQLite store into PostgreSQL.

Prints SQL to stdout (or writes it with --out) so the whole migration is one
auditable blob that can be reviewed before it touches the database. Two details
drove the design:

* SQLite has no boolean type, so it stores 0/1 while Postgres rejects those for
  BOOLEAN columns; the declared column type in the schema drives the conversion.
* Tables must be emitted parent-first or foreign keys reject the load. The order
  is derived by parsing `@relation` targets from the Prisma schema, so it stays
  correct if the schema gains relations later.

Rows whose parent is missing are dropped. SQLite does not enforce foreign keys,
so the legacy store accumulated a few unreachable child rows (preferences and
verification tokens for deleted users); Postgres would reject them on load, and
nothing can read them anyway. The count is reported so the deletion is visible.

Usage:
    python3 scripts/migrate-sqlite-to-postgres.py --out /tmp/data.sql
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /tmp/data.sql
"""
import argparse
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "market_intelligence.sqlite"
SCHEMA = ROOT / "prisma" / "schema.prisma"

INT_TYPES = {"integer", "int", "bigint", "smallint"}
REAL_TYPES = {"real", "float", "double", "numeric", "decimal"}


def relation_edges():
    """Map each model to the models it must be inserted after."""
    edges = {}
    for block in SCHEMA.read_text().split("model ")[1:]:
        name = block.split("{")[0].strip()
        for line in block.splitlines():
            if line.startswith("}"):
                break
            if "fields:" not in line or "@relation" not in line:
                continue
            target = re.match(r"\s*\w+\s+(\w+)\??\s+@relation", line)
            if target:
                edges.setdefault(name, set()).add(target.group(1))
    return edges


def order_tables(tables, edges):
    ordered, placed = [], set()
    while len(placed) < len(tables):
        progressed = False
        for t in tables:
            if t in placed:
                continue
            deps = {d for d in edges.get(t, set()) if d in tables}
            if deps <= placed:
                ordered.append(t)
                placed.add(t)
                progressed = True
        if not progressed:  # cycle or unknown dep: fall back to remaining order
            ordered.extend(t for t in tables if t not in placed)
            break
    return ordered


def orphan_filter(table, cols, edges):
    """WHERE clause excluding rows whose parent row is gone."""
    clauses = []
    for parent in edges.get(table, set()):
        cands = [c for c in cols if c in (f"{parent}_id", f"{parent.lower()}_id")]
        if not cands:
            continue
        fk = cands[0]
        clauses.append(f'"{fk}" IS NULL OR "{fk}" IN (SELECT "id" FROM "{parent}")')
    return " AND ".join(clauses)


def lit(value, decl):
    if value is None:
        return "NULL"
    if decl in ("boolean", "bool"):
        return "TRUE" if str(value) in ("1", "true", "True") else "FALSE"
    if decl in INT_TYPES or decl in REAL_TYPES:
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", help="write SQL here instead of stdout")
    ap.add_argument("--source", default=str(SRC))
    args = ap.parse_args()

    con = sqlite3.connect(args.source)
    edges = relation_edges()
    tables = sorted(
        r[0] for r in con.execute(
            "select name from sqlite_master where type='table' "
            "and name not like 'sqlite_%' and name not like '_prisma%'")
    )
    ordered = order_tables(tables, edges)

    lines = ["BEGIN;"]
    counts, dropped = {}, 0
    for t in ordered:
        cols = [(r[1], r[2].lower()) for r in con.execute(f'pragma table_info("{t}")')]
        names = [c[0] for c in cols]
        where = orphan_filter(t, names, edges)
        sql = f'select * from "{t}"' + (f" where {where}" if where else "")
        rows = con.execute(sql).fetchall()
        raw = con.execute(f'select count(*) from "{t}"').fetchone()[0]
        counts[t] = len(rows)
        dropped += raw - len(rows)
        if not rows:
            continue
        col_sql = ", ".join(f'"{n}"' for n in names)
        lines.append(f"-- {t}: {len(rows)} rows")
        for row in rows:
            vals = ", ".join(lit(v, decl) for v, (_, decl) in zip(row, cols))
            lines.append(f'INSERT INTO "{t}" ({col_sql}) VALUES ({vals});')

    # MarketPrice.seq is autoincrement; explicit ids leave the sequence at 1, so
    # the next insert would collide.
    lines.append('SELECT setval(pg_get_serial_sequence(\'"MarketPrice"\', \'seq\'), '
                 'COALESCE((SELECT MAX("seq") FROM "MarketPrice"), 1));')
    lines.append("COMMIT;")
    script = "\n".join(lines) + "\n"

    if args.out:
        Path(args.out).write_text(script)
        print(f"wrote {args.out}", file=sys.stderr)
    else:
        sys.stdout.write(script)

    print("insert order: " + " -> ".join(ordered), file=sys.stderr)
    print(f"{sum(counts.values())} rows across {len(counts)} tables", file=sys.stderr)
    print(f"dropped {dropped} orphan rows (parents deleted in the legacy store)",
          file=sys.stderr)


if __name__ == "__main__":
    main()

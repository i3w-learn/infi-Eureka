# NCERT Content Model

Seven20's authoritative spec for how NCERT textbook content is stored, queried, and validated. Covers the JSON tree contract (what extraction produces) and the SQL storage model (what the backend persists). High-level on purpose — exact column types can flex during implementation.

---

## 1. Two representations, one model

NCERT content lives in two shapes:

1. **JSON tree** — the extraction output contract. A tree of typed nodes: chapter → topic → subtopic → content nodes (paragraphs, figures, tables, etc.). Children are arrays; position is order. The tree answers "what comes next."
2. **SQL tables** — the query-time store. Flat rows with `id`, `parent_id`, `order`. The same tree, flattened for filtering, joins, and foreign keys. Rebuilt into a tree at API response time.

The JSON tree is the transport format between the extraction pipeline and the backend. The SQL tables are the backend's persistence layer. A valid tree maps mechanically to SQL rows; a set of SQL rows rebuilds the tree without ambiguity.

---

## 2. Node types

Every node has a `type`. One `node` table in SQL; one `nodes` map in JSON.

### Structural (the skeleton)

| Type | What | Parent |
|---|---|---|
| `chapter` | Root of a chapter tree | _(root)_ |
| `topic` | NCERT numbered section (e.g. 3.1) | chapter |
| `subtopic` | NCERT numbered subsection (e.g. 3.1.2) | topic |

Strict nesting: no subtopic directly under chapter, no topic under subtopic.

### Content (the text)

| Type | What | Content shape |
|---|---|---|
| `paragraph` | Body text | `{text}` |
| `definition` | Bold/boxed definition | `{text}` |
| `equation` | Numbered or inline equation | `{text, number}` |
| `figure` | Diagram, photograph, graph | `{figureNumber, caption, asset, description}` |
| `table` | Data table | `{headers, rows, caption, html}` |
| `example` | Solved worked problem ("Example 4.1" in physics, "Problem 4.1" in chemistry) | `{question, solution, number}` |
| `note` | Sidebar, "Points to Ponder", "Did you know?", objectives box | `{text, kind}` where `kind` ∈ {`sidebar`, `points_to_ponder`, `did_you_know`, `objectives`} |

### Special (chapter-level sections)

| Type | What | Content shape |
|---|---|---|
| `summary` | End-of-chapter summary | `{text}` |
| `exercise` | End-of-chapter questions | `{items}` |

Content nodes can live at any structural level — a paragraph's parent can be a chapter, topic, or subtopic. This handles intro text without fake "Introduction" nodes: text before section 3.1 is owned by the chapter; text before subtopic 3.1.1 is owned by topic 3.1.

---

## 3. Content shapes

### Figure

```json
{
  "figureNumber": "3.1",
  "caption": "Algae: (a) Green algae ...",
  "asset": "assets/figures/page_003_img-0.jpeg",
  "description": null
}
```

| Field | Required | Type | Notes |
|---|---|---|---|
| `figureNumber` | No | `string \| null` | Null for unnumbered figures (scientist portraits, inline images) |
| `caption` | Yes | `string` | Caption text; may be empty if OCR missed it |
| `asset` | No | `string \| null` | Relative path to resolved image; null when unresolved (must pair with `extractionStatus: partial`) |
| `description` | No | `string \| null` | AI-generated alt-text for accessibility |

Multi-part sub-figures (Fig 4.1(a),(b),(c)) are one figure node; sub-part labels live in the caption text or as optional `subParts` metadata.

### Table

```json
{
  "headers": ["Column A", "Column B"],
  "rows": [["cell", "cell"], ["cell", "cell"]],
  "caption": "Table 3.1: Classification of Algae",
  "html": "<table>...</table>"
}
```

`headers` + `rows` for structured access; `html` as fallback for merged-cell layouts (e.g. periodic table comparisons). The renderer tries structured first, falls back to HTML.

### Example (solved problem)

```json
{
  "number": "4.3",
  "question": "A body of mass 5 kg is acted upon by two forces...",
  "solution": "Given: m = 5 kg, F₁ = 8 N..."
}
```

---

## 4. JSON tree contract

The shape an extraction pipeline must produce. Any valid tree can be ingested; any pipeline (automated or manual) that produces this shape is acceptable.

```json
{
  "schemaVersion": 1,
  "bookCode": "class-11-biology",
  "subject": "biology",
  "classLevel": 11,
  "chapterNumber": 3,
  "chapterTitle": "Plant Kingdom",
  "edition": "2024",
  "rootId": "ch_bio11_03",
  "nodes": {
    "ch_bio11_03": {
      "id": "ch_bio11_03",
      "type": "chapter",
      "title": "Plant Kingdom",
      "children": ["tp_bio11_03_1", "tp_bio11_03_2", "pg_bio11_03_a7f3"],
      "metadata": {
        "extractionStatus": "ok",
        "pageStart": 37,
        "pageEnd": 50
      }
    },
    "tp_bio11_03_1": {
      "id": "tp_bio11_03_1",
      "type": "topic",
      "title": "Algae",
      "children": ["st_bio11_03_1_1", "pg_bio11_03_b2c4"],
      "metadata": {
        "extractionStatus": "ok",
        "numbering": "3.1",
        "pageStart": 38
      }
    },
    "pg_bio11_03_a7f3": {
      "id": "pg_bio11_03_a7f3",
      "type": "paragraph",
      "children": [],
      "content": { "text": "In the previous chapter, we looked at..." },
      "metadata": {
        "extractionStatus": "ok",
        "pageStart": 37,
        "contentHash": "a1b2c3d4"
      }
    }
  }
}
```

Key structural rules:

- **`children` is a string array** — `["id_a", "id_b"]`. Position is reading order. No redundant `order` field.
- **`nodes` is an object** keyed by ID — random-access lookup. Not ordered.
- **`content` is a type-specific bag** — each node type has its own shape (§3).
- **`metadata`** is common across all nodes — `extractionStatus`, `pageStart`, optional `pageEnd`, `numbering`, `issues`, `contentHash`.

### Subject handling

Store as NCERT does: `subject = "biology"`. The NEET botany/zoology split is chapter-level metadata:

```json
{
  "id": "ch_bio11_04",
  "type": "chapter",
  "title": "Animal Kingdom",
  "metadata": {
    "neetSubject": "zoology"
  }
}
```

---

## 5. Stable IDs

**The ID identifies, metadata locates.** Never encode position into an ID.

| Level | Style | Example | Why |
|---|---|---|---|
| Chapter | `ch_` + book + number | `ch_bio11_03` | NCERT chapter numbers are stable |
| Topic | `tp_` + book + section | `tp_bio11_03_1` | NCERT section numbers are stable |
| Subtopic | `st_` + book + section | `st_bio11_03_1_2` | NCERT subsection numbers are stable |
| Content nodes | prefix + book + random | `pg_bio11_03_a7f3`, `fig_bio11_03_k2m9` | These can be inserted, split, reordered |

Prefixes by type: `pg_` paragraph, `def_` definition, `eq_` equation, `fig_` figure, `tbl_` table, `ex_` example, `nt_` note, `sum_` summary, `exc_` exercise.

### content_hash

Short hash of normalised text on every content node that carries text. Detects when a re-extraction changed text that a highlight or PYQ mapping points at.

### Edition

Required on every tree. Baked into the top-level `edition` field, not into individual IDs. When a new edition lands, old trees freeze, new content gets new IDs, and the migration table maps old → new.

### Migration table

```
id_migration(old_id, new_id, reason, created_at)
```

`new_id` nullable — null means deleted. Anchors resolve lazily: lookup fails → check migration → remap or mark orphaned.

---

## 6. SQL storage

### Core tables

```sql
-- One table for all node types
node (
  id          text primary key,
  parent_id   text references node(id),
  node_type   text not null,  -- chapter | topic | subtopic | paragraph | ...
  "order"     integer not null,
  title       text,
  number      text,           -- "3.1" for topics, "4.3" for examples, figure number
  content     jsonb,          -- type-specific content bag
  metadata    jsonb,          -- extractionStatus, pageStart, pageEnd, issues, contentHash
  edition     text not null,
  -- denormalised ancestors for fast filtering
  chapter_id  text references node(id),
  topic_id    text references node(id),
  subtopic_id text references node(id)
)

-- ID remapping across editions / re-extractions
id_migration (
  old_id      text not null,
  new_id      text,           -- null = deleted
  reason      text not null,
  created_at  timestamptz not null default now()
)
```

### Notes

- **`content` is JSONB** — each node type's shape (§3) stored as a JSON column. Keeps the table uniform while content varies by type.
- **`order` is an integer** — arrays don't exist in SQL, so reading order uses an explicit column. In the JSON tree, `children` arrays carry this information implicitly.
- **Denormalised ancestors** (`chapter_id`, `topic_id`, `subtopic_id`) are derived data, recomputed in one pass whenever structure changes. `subtopic_id` is nullable — intro text naturally has `subtopic_id = NULL`. Filter by subtopic → intro excluded; filter by topic → included.
- **No sentence table.** Sentences are derived at render/query time from paragraph text. Cheaper, more stable, no ripple from OCR fixes.
- **No crosswalk table.** IL concept mapping has its own spec.

---

## 7. Anchoring

Highlights, PYQ mappings, and any selection that points at content use this anchor format:

```json
{
  "nodeId": "pg_bio11_03_a7f3",
  "startOffset": 42,
  "endOffset": 128
}
```

| Field | Type | Notes |
|---|---|---|
| `nodeId` | `string` | Any content-bearing node — paragraph, definition, note, figure caption |
| `startOffset` | `integer \| null` | Character offset within the node's text; null = start of node |
| `endOffset` | `integer \| null` | Character offset; null = end of node |

Null offsets mean "whole node" — useful for highlighting an entire definition or figure.

Cross-node selections are a list of anchors. Offsets are within the node's text, not global — so a text fix only invalidates anchors inside that one node.

### Feature granularity

| Feature | Granularity |
|---|---|
| Highlights | Full anchor with offsets |
| PYQ mapping | Whole-node anchors (list of node IDs) |
| Heat layers | Per-node counts |
| Jump-to-line | First anchor in the list |

---

## 8. Filtering

Filtering ("all questions for topic 3.3", "coverage for chapter 3") uses the denormalised ancestor columns on each row:

```sql
WHERE topic_id = 'tp_bio11_03_3'
```

Division of labour:

| Need | Mechanism |
|---|---|
| Filtering, rollups, coverage | Denormalised ancestor columns |
| PYQ mapping, highlights, jump-to | Node IDs + anchors |
| Rendering order | Tree + order fields |

---

## 9. Extraction status

Every node carries an `extractionStatus` in its metadata:

| Status | Meaning |
|---|---|
| `ok` | Fully extracted, content present |
| `partial` | Extracted but incomplete (e.g. figure without resolved asset, table without parsed rows) |
| `failed` | Extraction attempted and failed |
| `needs_review` | Extracted but flagged for human review |

When status is not `ok`, the `issues` array describes what's wrong:

```json
{
  "extractionStatus": "partial",
  "issues": ["asset path unresolved", "caption truncated"]
}
```

---

## 10. Validation invariants

Any extraction pipeline output must satisfy these rules. Checkable by a JSON schema validator before ingestion.

1. Every tree has exactly one root node of type `chapter`.
2. Every non-root node has a `parent_id` pointing to an existing node.
3. Structural nodes follow strict nesting: chapter → topic → subtopic. No subtopic directly under chapter.
4. Every node has `id`, `type`, and is listed in its parent's `children` array.
5. Structural nodes (chapter, topic, subtopic) require a non-empty `title`.
6. Content nodes with text (`paragraph`, `definition`, `equation`, `example`, `note`, `summary`) require non-empty text in their content bag.
7. Figures require either a resolved `asset` path or `extractionStatus: partial` with at least one issue logged.

---

## 11. Initial scope

12 chapters across 4 NEET subjects, chosen for PYQ density and content-type diversity:

| Subject | Chapter | Class | Content stress test |
|---|---|---|---|
| Physics | Laws of Motion | 11 | Equations, worked examples |
| Physics | Current Electricity | 12 | Circuit figures, resistivity tables |
| Physics | Ray Optics | 12 | Figure-heavy (lens/mirror diagrams) |
| Chemistry | Some Basic Concepts of Chemistry | 11 | Tables (SI units, mole calculations) |
| Chemistry | Chemical Bonding and Molecular Structure | 11 | Orbital diagrams, Lewis structures |
| Chemistry | Coordination Compounds | 12 | Isomerism tables, nomenclature |
| Botany | Biological Classification | 11 | Taxonomy tables, definitions |
| Botany | Cell: The Unit of Life | 11 | Cell organelle diagrams |
| Botany | Photosynthesis in Higher Plants | 11 | Pathway diagrams, equations |
| Zoology | Animal Kingdom | 11 | Classification tables, high PYQ density |
| Zoology | Breathing and Exchange of Gases | 11 | Anatomical diagrams, gas law equations |
| Zoology | Body Fluids and Circulation | 11 | Heart/circulation diagrams, blood component tables |

Chapter PDFs are in GCS bucket `neet-ncert-books`. Edition: latest NCERT, pinned at ingest time.

---

## 12. What this spec does not cover

- **IL concept crosswalk** — separate spec.
- **Extraction pipeline implementation** — this spec defines the output contract, not how to build the pipeline.
- **Synthetic subtopics** — deferred until the reader is built and we see how long unstructured topics feel on mobile.
- **Reader UI/UX** — separate concern.

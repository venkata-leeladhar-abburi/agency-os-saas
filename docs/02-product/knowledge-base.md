# Knowledge base (the Playbook, first part)

Brought forward from R2 at the founder's request on 31 Oct 2026 (D-072). The Playbook in `flows.md` and `roadmap.md` is "how the agency works, written once": process and SOPs, prompts, tools, templates and learnings, reused at every stage. This is its first part: an agency's own knowledge base, kept in folders, with each item visible to exactly the people it's meant for, including the agency's clients in their portal.

Later, not in this part:
- **Agency OS's own knowledge base** (prompts, components, designs, structures, flows, UX, tools, updated often), as a public site linked from the landing page. The founder will plan it; it can reuse these screens and the public visibility below.
- **Public items** on the agency's "How we work" page (R3).
- **Files** (uploads), once Storage is set up. Until then an item can link to a file anywhere (Drive, Figma, Notion).
- Turning phase templates into projects, and boards embedded in projects (R2).

## Who uses it

- **Owners, admins, project leads:** organise the knowledge base and decide who sees what.
- **Members:** read what's shared with them; add their own items (a prompt that worked, a learning), private or for the team.
- **Finance and HR:** read what's shared with them.
- **Clients**, in their portal: read the guides the agency shares with them, such as how to give feedback, brand assets, how to log in to their site.

## Stories and acceptance criteria

1. As an owner, I organise knowledge in folders and subfolders.
   - Folders nest; each shows how many items it holds. Renaming or moving a folder keeps its items.
   - A folder can be deleted only when it's empty.
2. As anyone in the team, I add an item of one of the nine kinds: Process or SOP, Prompt, Tool, Website, Component, Template, Checklist, Board, Learning.
   - An item has a title, a short summary, a body (written in Markdown: headings, lists, bold, links, code), an optional link, tags, and a folder.
   - Items are drafts until published; drafts are seen only by whoever can edit them.
3. As the person who adds an item, I choose who sees it:
   - **Only me** (private).
   - **The team**, either everyone in the workspace or only some roles. Owners and admins always see team items.
   - **The team and clients**: all clients, or the ones I pick. Clients see it in their portal, read-only, once it's published.
4. As an owner, admin or project lead, I can edit, move or delete any item that isn't private. Members can edit and delete their own.
5. As anyone, I find knowledge fast: search titles, summaries, bodies and tags; filter by kind and tag; see what changed recently.
6. As a client, I open "Guides" in my portal and read what the agency shared with my company, and nothing else.
7. The database guarantees all of this (RLS): another workspace, a role left out, or a client not picked never sees an item, even by its link.

Every screen has its empty, loading, error and no-access states, works with a keyboard and on a phone, and meets WCAG 2.1 AA.

## Screens

- **Knowledge base** (`/w/[workspace]/knowledge`): a folder tree on the left (with counts), and on the right a search, the folders as cards and the items as a table (name, kind, who sees it, updated by, updated). Filters for kind and tag. Primary action: Add item.
- **Folder** (`…/knowledge/folders/[id]`): the same layout inside one folder, with its subfolders and items, and Edit folder.
- **Item** (`…/knowledge/[id]`): the rendered item with its kind, tags, link, who sees it and who changed it last. Edit and Delete for those who may.
- **Add or edit an item:** one form with the visibility choice in plain words.
- **Portal Guides** (`/p/[workspace]/knowledge`): the items shared with this client, by folder, and each item's page.

Visual direction: the founder's three references (folder cards, a folder tree with counts, a clean files table with row actions), in the Agency OS design system.

## Proposed defaults (founder to confirm, open question 24)

- The sidebar label is **Knowledge base**; in the portal it's **Guides**.
- A new workspace starts empty, with the empty state below, and the example data adds a few labelled examples.
- Empty state: title "Write down how your agency works", text "Keep your processes, prompts, tools and templates in one place, and share guides with your clients.", action "Add item".

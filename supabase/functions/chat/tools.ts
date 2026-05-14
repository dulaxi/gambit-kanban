export const TOOLS = [
  {
    name: "create_card",
    description: "Create a new card on the current board. The board is determined by the surface you're called from — do not specify it. Populate all fields you can infer from context — icon, description, priority, labels, checklist, assignee, due_date.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Card title (1–200 chars)" },
        description: { type: "string", description: "Detailed card description (markdown, truncated to 5000 chars)" },
        column: { type: "string", description: "Column name (defaults to first column if omitted)" },
        priority: { type: "string", enum: ["low", "medium", "high"], description: "Card priority" },
        icon: { type: "string", description: "Phosphor icon name in kebab-case (e.g. rocket, credit-card, bug)" },
        labels: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              color: { type: "string", enum: ["red", "blue", "green", "yellow", "purple", "pink", "gray"] },
            },
            required: ["text", "color"],
          },
          description: "Labels to attach to the card",
        },
        checklist: {
          type: "array",
          items: { type: "string" },
          description: "Checklist items (subtasks)",
        },
        assignee: { type: "string", description: "Display name of assignee" },
        due_date: { type: "string", description: "Due date as ISO string (YYYY-MM-DD)" },
      },
      required: ["title"],
    },
  },
  {
    name: "move_card",
    description: "Move a card to a different column on the current board. The board is fixed by the surface you're called from — there is no cross-board move.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to move (matched case-insensitively on the current board)" },
        to_column: { type: "string", description: "Destination column name on the current board" },
        cardId: { type: "string", description: "Internal use only — do not specify unless an explicit card ID was provided to you. Always prefer card_title." },
      },
      required: ["card_title", "to_column"],
    },
  },
  {
    name: "update_card",
    description: "Update one or more fields on an existing card on the current board. Only fields you include in 'updates' are changed; omit fields to leave them alone. To clear a field (remove assignee, due_date, icon, etc.), set it to null explicitly.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to update (matched case-insensitively on the current board)" },
        updates: {
          type: "object",
          properties: {
            title: { type: "string", description: "New title (1-200 chars; first letter is auto-capitalized if needed)" },
            description: { type: "string", description: "New description (markdown). Set to null to clear." },
            priority: { type: "string", enum: ["low", "medium", "high"], description: "New priority" },
            icon: { type: "string", description: "Phosphor icon name in kebab-case. Set to null to clear." },
            labels: { type: "array", items: { type: "object", properties: { text: { type: "string" }, color: { type: "string" } } }, description: "Replaces all labels. Use [] or null to clear." },
            checklist: { type: "array", items: { type: "string" }, description: "Replaces full checklist. Use [] or null to clear." },
            assignee: { type: "string", description: "Display name of assignee. Set to null to unassign." },
            due_date: { type: "string", description: "YYYY-MM-DD or ISO string. Set to null to remove the due date." },
            completed: { type: "boolean", description: "Mark the card complete (true) or uncomplete (false). The card stays in its current column." },
          },
          description: "Fields to update. Must have at least one field. Null on a field clears it; missing fields are left alone.",
        },
        cardId: { type: "string", description: "Internal use only — do not specify unless an explicit card ID was provided to you. Always prefer card_title." },
      },
      required: ["card_title", "updates"],
    },
  },
  {
    name: "delete_card",
    description: "Delete a card. Always ask the user for confirmation before executing this action.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to delete" },
        board: { type: "string", description: "Board name the card belongs to" },
      },
      required: ["card_title"],
    },
  },
  {
    name: "create_board",
    description: "Create a new kanban board with custom columns.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Board name" },
        columns: {
          type: "array",
          items: { type: "string" },
          description: "Column names in order (defaults to To Do, In Progress, Done)",
        },
        icon: { type: "string", description: "Phosphor icon name in kebab-case (e.g. rocket, credit-card, folder)" },
      },
      required: ["name"],
    },
  },
  {
    name: "move_cards",
    description: "Move multiple cards to a different column. Requires at least one filter (from_column or card_titles).",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name" },
        from_column: { type: "string", description: "Source column name (moves all cards from this column)" },
        card_titles: { type: "array", items: { type: "string" }, description: "Specific card titles to move" },
        to_column: { type: "string", description: "Destination column name" },
      },
      required: ["board", "to_column"],
    },
  },
  {
    name: "update_cards",
    description: "Batch update fields on multiple cards. Requires at least one filter (board, column, or card_titles).",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Filter by board name" },
        column: { type: "string", description: "Filter by column name" },
        card_titles: { type: "array", items: { type: "string" }, description: "Specific card titles to update" },
        updates: {
          type: "object",
          properties: {
            priority: { type: "string", enum: ["low", "medium", "high"] },
            assignee: { type: "string", description: "Display name of assignee" },
            labels: { type: "array", items: { type: "object", properties: { text: { type: "string" }, color: { type: "string" } }, required: ["text", "color"] } },
            due_date: { type: "string", description: "Due date as YYYY-MM-DD" },
            icon: { type: "string", description: "Phosphor icon name in kebab-case" },
          },
          description: "Fields to update on all matching cards",
        },
      },
      required: ["updates"],
    },
  },
  {
    name: "complete_cards",
    description: "Mark multiple cards as completed and move them to the last column. Requires at least one filter.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Filter by board name" },
        column: { type: "string", description: "Filter by column name" },
        card_titles: { type: "array", items: { type: "string" }, description: "Specific card titles to complete" },
      },
    },
  },
  {
    name: "duplicate_card",
    description: "Duplicate an existing card, optionally to a different board or column.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to duplicate" },
        to_board: { type: "string", description: "Destination board name (defaults to same board)" },
        to_column: { type: "string", description: "Destination column name (defaults to first column)" },
      },
      required: ["card_title"],
    },
  },
  {
    name: "toggle_checklist",
    description: "Check or uncheck specific checklist items on a card by index (0-based).",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card" },
        items: { type: "array", items: { type: "number" }, description: "Indices of checklist items to toggle (0-based)" },
        done: { type: "boolean", description: "true = check items, false = uncheck items" },
      },
      required: ["card_title", "items", "done"],
    },
  },
  {
    name: "update_board",
    description: "Rename a board or change its icon.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Current board name" },
        name: { type: "string", description: "New board name" },
        icon: { type: "string", description: "New Phosphor icon name in kebab-case" },
      },
      required: ["board"],
    },
  },
  {
    name: "delete_board",
    description: "Delete a board and all its columns and cards. Always ask the user for confirmation before executing.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name to delete" },
      },
      required: ["board"],
    },
  },
  {
    name: "add_column",
    description: "Add a new column to a board.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name" },
        title: { type: "string", description: "Column title" },
        position: { type: "number", description: "Insert position (0-based index). Defaults to end." },
      },
      required: ["board", "title"],
    },
  },
  {
    name: "delete_column",
    description: "Delete a column and all its cards. Always ask the user for confirmation before executing.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name" },
        column: { type: "string", description: "Column title to delete" },
      },
      required: ["board", "column"],
    },
  },
  {
    name: "invite_member",
    description: "Invite a user by email to a workspace.",
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address to invite" },
        workspace: { type: "string", description: "Workspace name" },
      },
      required: ["email", "workspace"],
    },
  },
  {
    name: "remove_member",
    description: "Remove a member from a workspace. Always ask the user for confirmation before executing.",
    input_schema: {
      type: "object",
      properties: {
        display_name: { type: "string", description: "Display name of the member to remove" },
        workspace: { type: "string", description: "Workspace name" },
      },
      required: ["display_name", "workspace"],
    },
  },
  {
    name: "create_note",
    description: "Create a new note with optional markdown content.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Note title" },
        content: { type: "string", description: "Note content (markdown)" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_note",
    description: "Update an existing note. Use 'content' to replace or 'append' to add to the end.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the note to update (matched case-insensitively)" },
        content: { type: "string", description: "New full content (replaces existing)" },
        append: { type: "string", description: "Text to append to existing content" },
      },
      required: ["title"],
    },
  },
] as const

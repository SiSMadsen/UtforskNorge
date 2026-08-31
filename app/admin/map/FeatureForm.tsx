"use client";

import { useState, type FormEvent } from "react";

import type { Draft, FeatureFormValues } from "./types";

function initialValues(draft: Draft): FeatureFormValues {
  if (draft.mode === "edit") {
    const p = draft.feature.properties;
    return {
      title: p.title,
      description: p.description ?? "",
      category: "category" in p ? (p.category ?? "") : "",
    };
  }
  return { title: "", description: "", category: "" };
}

export function FeatureForm({
  draft,
  onSubmit,
  onCancel,
}: {
  draft: Draft;
  onSubmit: (values: FeatureFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  // The parent gives this component a `key` tied to the draft's identity, so a
  // switch to a different feature remounts it with fresh initial state.
  const isPoi = draft.kind === "poi";
  const [values, setValues] = useState<FeatureFormValues>(() =>
    initialValues(draft),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  const label = `${draft.mode === "create" ? "New" : "Edit"} ${
    isPoi ? "POI" : "road segment"
  }`;

  return (
    <div className="absolute left-3 top-3 z-[1100] w-72 rounded-lg border border-black/15 bg-[var(--background)] p-4 shadow-lg dark:border-white/20">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="text-sm font-semibold">{label}</div>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Title</span>
          <input
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            autoFocus
            required
            className="w-full rounded border border-black/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Description
          </span>
          <textarea
            value={values.description}
            onChange={(e) =>
              setValues((v) => ({ ...v, description: e.target.value }))
            }
            rows={3}
            className="w-full rounded border border-black/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
          />
        </label>

        {isPoi ? (
          <label className="block space-y-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              Category
            </span>
            <input
              value={values.category}
              onChange={(e) =>
                setValues((v) => ({ ...v, category: e.target.value }))
              }
              list="poi-category-suggestions"
              className="w-full rounded border border-black/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
            />
            <datalist id="poi-category-suggestions">
              <option value="hydropower" />
              <option value="viewpoint" />
              <option value="scenic road" />
              <option value="waterfall" />
            </datalist>
          </label>
        ) : null}

        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

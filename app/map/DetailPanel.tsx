"use client";

import { useEffect, useRef, useState } from "react";

import type {
  ImageRef,
  JournalEntry,
  PoiFeature,
  RoadSegmentFeature,
} from "@/lib/geojson";

export type Selection = { kind: "poi" | "road"; id: string };

type DetailFeature = PoiFeature | RoadSegmentFeature;

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function DetailPanel({
  selection,
  onClose,
}: {
  selection: Selection | null;
  onClose: () => void;
}) {
  const open = selection !== null;

  // `loaded.id` records which selection `feature` / `error` describe, so the
  // render can derive the status without a setState in the effect body.
  const [loaded, setLoaded] = useState<{
    id: string | null;
    feature: DetailFeature | null;
    error: boolean;
  }>({ id: null, feature: null, error: false });

  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Fetch full detail whenever the selection changes.
  useEffect(() => {
    if (!selection) return;
    const controller = new AbortController();

    const url =
      selection.kind === "poi"
        ? `/api/pois/${selection.id}`
        : `/api/road-segments/${selection.id}`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("not ok");
        return res.json() as Promise<DetailFeature>;
      })
      .then((data) => {
        setLoaded({ id: selection.id, feature: data, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoaded({ id: selection.id, feature: null, error: true });
        }
      });

    return () => controller.abort();
  }, [selection]);

  const status: "loading" | "ready" | "error" = !selection
    ? "loading"
    : loaded.id !== selection.id
      ? "loading"
      : loaded.error
        ? "error"
        : loaded.feature
          ? "ready"
          : "loading";
  const feature = status === "ready" ? loaded.feature : null;

  // Focus management, Escape to close, and a simple focus trap while open.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const kindLabel =
    selection?.kind === "road" ? "Road segment" : "Point of interest";
  const title =
    status === "ready" && feature ? feature.properties.title : kindLabel;

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-[1200] bg-ink/25 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-[1300] flex w-full max-w-[420px] flex-col border-l border-ink/15 bg-paper text-ink transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <span className="font-sans text-xs text-slate">{kindLabel}</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="font-sans text-sm text-slate hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-10">
          {status === "loading" ? (
            <p className="px-6 py-12 font-sans text-sm text-slate">Loading…</p>
          ) : null}
          {status === "error" ? (
            <p className="px-6 py-12 font-sans text-sm text-falu">
              Couldn’t load this location.
            </p>
          ) : null}
          {status === "ready" && feature ? (
            <DetailBody feature={feature} />
          ) : null}
        </div>
      </aside>
    </>
  );
}

function DetailBody({ feature }: { feature: DetailFeature }) {
  const props = feature.properties;
  const category = "category" in props ? props.category : null;

  return (
    <article>
      {props.images.length > 0 ? (
        <Gallery images={props.images} title={props.title} />
      ) : null}

      <div className="px-6 pt-6">
        <h1 className="font-serif text-3xl leading-tight">{props.title}</h1>
        {category ? (
          <p className="mt-2 font-sans text-xs text-moss">{category}</p>
        ) : null}
        {props.description ? (
          <p className="mt-4 max-w-[62ch] font-serif text-[1.0625rem] leading-[1.75] text-ink/90">
            {props.description}
          </p>
        ) : null}
      </div>

      {props.journalEntries.length > 0 ? (
        <div className="mt-8 border-t border-ink/15 px-6 pt-6">
          <h2 className="font-serif text-xl">Journal</h2>
          <ol className="journal-timeline mt-5 list-none border-l border-ink/25 pl-5">
            {props.journalEntries.map((entry) => (
              <JournalRow key={entry.id} entry={entry} />
            ))}
          </ol>
        </div>
      ) : null}
    </article>
  );
}

function JournalRow({ entry }: { entry: JournalEntry }) {
  return (
    <li className="relative pb-7 last:pb-0">
      <span
        aria-hidden
        className="absolute top-1.5 h-1.5 w-1.5 -translate-x-[calc(1.25rem+1px)] rounded-full bg-falu"
      />
      <time
        dateTime={entry.entryDate}
        className="font-sans text-xs text-slate"
      >
        {formatDate(entry.entryDate)}
      </time>
      <p className="mt-1.5 max-w-[62ch] whitespace-pre-line font-serif text-[1.0625rem] leading-[1.75] text-ink/90">
        {entry.body}
      </p>
    </li>
  );
}

function Gallery({ images, title }: { images: ImageRef[]; title: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function nudge(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div
      ref={scrollerRef}
      tabIndex={0}
      role="group"
      aria-label={`${images.length} photo${images.length === 1 ? "" : "s"}`}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          nudge(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          nudge(-1);
        }
      }}
      className="flex snap-x snap-mandatory overflow-x-auto"
    >
      {images.map((image) => (
        <a
          key={image.id}
          href={image.url}
          target="_blank"
          rel="noreferrer"
          className="block w-full shrink-0 snap-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.caption ?? title}
            className="h-72 w-full object-cover"
          />
        </a>
      ))}
    </div>
  );
}
